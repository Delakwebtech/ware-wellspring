
-- =========================================================
-- 1. Multi-tenant signup: every user becomes superadmin of their own store
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_branch_id uuid;
  v_store_name text;
BEGIN
  v_store_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'store_name',''), split_part(NEW.email,'@',1) || '''s Store');

  INSERT INTO public.stores (name) VALUES (v_store_name) RETURNING id INTO v_store_id;
  INSERT INTO public.branches (store_id, name) VALUES (v_store_id, 'Main Branch') RETURNING id INTO v_branch_id;

  INSERT INTO public.profiles (id, full_name, email, store_id, branch_id)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), NEW.email), NEW.email, v_store_id, v_branch_id);

  INSERT INTO public.user_roles (user_id, role, store_id) VALUES (NEW.id, 'superadmin', v_store_id);
  RETURN NEW;
END $$;

-- Repair any existing profile that has no store (orphans from the old trigger)
DO $$
DECLARE r record; v_store uuid; v_branch uuid;
BEGIN
  FOR r IN SELECT p.id, p.email, p.full_name FROM public.profiles p WHERE p.store_id IS NULL LOOP
    INSERT INTO public.stores (name) VALUES (COALESCE(r.full_name, r.email) || '''s Store') RETURNING id INTO v_store;
    INSERT INTO public.branches (store_id, name) VALUES (v_store, 'Main Branch') RETURNING id INTO v_branch;
    UPDATE public.profiles SET store_id = v_store, branch_id = v_branch WHERE id = r.id;
    DELETE FROM public.user_roles WHERE user_id = r.id;
    INSERT INTO public.user_roles (user_id, role, store_id) VALUES (r.id, 'superadmin', v_store);
  END LOOP;
END $$;

-- =========================================================
-- 2. Extend stores with config fields
-- =========================================================
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS tax_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receipt_footer text,
  ADD COLUMN IF NOT EXISTS logo_url text;

-- =========================================================
-- 3. Suppliers
-- =========================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store members access suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (store_id = public.current_store_id())
  WITH CHECK (store_id = public.current_store_id());
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 4. Stock receipts (purchase orders / goods received)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.stock_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  inventory_id uuid NOT NULL REFERENCES public.inventories(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL CHECK (unit_cost >= 0),
  total_cost numeric NOT NULL,
  reference text,
  notes text,
  received_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_receipts TO authenticated;
GRANT ALL ON public.stock_receipts TO service_role;
ALTER TABLE public.stock_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store members access stock_receipts" ON public.stock_receipts
  FOR ALL TO authenticated
  USING (store_id = public.current_store_id())
  WITH CHECK (store_id = public.current_store_id());

-- =========================================================
-- 5. Audit log
-- =========================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  actor_id uuid,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_store_created_idx ON public.audit_logs(store_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "managers view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (store_id = public.current_store_id() AND (
    public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'ceo') OR public.has_role(auth.uid(),'manager')
  ));
CREATE POLICY "store members insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (store_id = public.current_store_id());

CREATE OR REPLACE FUNCTION public.write_audit(_store uuid, _entity text, _entity_id uuid, _action text, _details jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_logs(store_id, actor_id, entity, entity_id, action, details)
  VALUES (_store, auth.uid(), _entity, _entity_id, _action, _details);
$$;

-- =========================================================
-- 6. Atomic operations
-- =========================================================

-- record_sale: validates and decrements stock under row locks, inserts a sale.
CREATE OR REPLACE FUNCTION public.record_sale(
  _items jsonb,
  _payment_method text,
  _customer_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_store uuid;
  v_branch uuid;
  v_sale_id uuid;
  v_total numeric := 0;
  v_cost numeric := 0;
  v_ref text;
  v_enriched jsonb := '[]'::jsonb;
  v_item jsonb;
  v_inv record;
  v_qty int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT store_id, branch_id INTO v_store, v_branch FROM public.profiles WHERE id = v_user;
  IF v_store IS NULL THEN RAISE EXCEPTION 'No store assigned'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::int;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT id, name, category, quantity, selling_price, purchase_price
      INTO v_inv
      FROM public.inventories
      WHERE id = (v_item->>'inventory_id')::uuid AND store_id = v_store
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
    IF v_inv.quantity < v_qty THEN RAISE EXCEPTION 'Insufficient stock for %', v_inv.name; END IF;

    UPDATE public.inventories SET quantity = quantity - v_qty WHERE id = v_inv.id;
    v_total := v_total + (v_inv.selling_price * v_qty);
    v_cost := v_cost + (v_inv.purchase_price * v_qty);
    v_enriched := v_enriched || jsonb_build_object(
      'inventory_id', v_inv.id, 'name', v_inv.name, 'category', v_inv.category,
      'price', v_inv.selling_price, 'cost', v_inv.purchase_price, 'quantity', v_qty
    );
  END LOOP;

  v_ref := 'INV-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  INSERT INTO public.sales(sale_ref, items, total_amount, cost_amount, payment_method, customer_name, store_id, branch_id, added_by)
  VALUES (v_ref, v_enriched, v_total, v_cost, _payment_method, NULLIF(_customer_name,''), v_store, v_branch, v_user)
  RETURNING id INTO v_sale_id;

  PERFORM public.write_audit(v_store, 'sale', v_sale_id, 'created', jsonb_build_object('total', v_total, 'ref', v_ref));
  RETURN v_sale_id;
END $$;

-- process_sale_return: restocks item, records refund
CREATE OR REPLACE FUNCTION public.process_sale_return(
  _inventory_id uuid,
  _quantity int,
  _reason text,
  _sale_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_store uuid; v_branch uuid;
  v_inv record;
  v_refund numeric;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _quantity <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  SELECT store_id, branch_id INTO v_store, v_branch FROM public.profiles WHERE id = v_user;
  SELECT * INTO v_inv FROM public.inventories WHERE id = _inventory_id AND store_id = v_store FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;

  v_refund := v_inv.selling_price * _quantity;
  UPDATE public.inventories SET quantity = quantity + _quantity WHERE id = v_inv.id;
  INSERT INTO public.sales_returns(inventory_id, sale_id, quantity, reason, refund_amount, store_id, branch_id, processed_by)
  VALUES (_inventory_id, _sale_id, _quantity, _reason, v_refund, v_store, v_branch, v_user)
  RETURNING id INTO v_id;
  PERFORM public.write_audit(v_store, 'return', v_id, 'created', jsonb_build_object('qty', _quantity, 'refund', v_refund));
  RETURN v_id;
END $$;

-- log_damage: deduct stock, record cost loss
CREATE OR REPLACE FUNCTION public.log_damage(
  _inventory_id uuid,
  _quantity int,
  _reason text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_store uuid; v_branch uuid;
  v_inv record; v_loss numeric; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _quantity <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  SELECT store_id, branch_id INTO v_store, v_branch FROM public.profiles WHERE id = v_user;
  SELECT * INTO v_inv FROM public.inventories WHERE id = _inventory_id AND store_id = v_store FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF v_inv.quantity < _quantity THEN RAISE EXCEPTION 'Cannot damage more than on hand'; END IF;

  v_loss := v_inv.purchase_price * _quantity;
  UPDATE public.inventories SET quantity = quantity - _quantity WHERE id = v_inv.id;
  INSERT INTO public.damages(inventory_id, name, category, quantity, reason, cost_loss, store_id, branch_id, reported_by)
  VALUES (_inventory_id, v_inv.name, v_inv.category, _quantity, _reason, v_loss, v_store, v_branch, v_user)
  RETURNING id INTO v_id;
  PERFORM public.write_audit(v_store, 'damage', v_id, 'created', jsonb_build_object('qty', _quantity, 'loss', v_loss));
  RETURN v_id;
END $$;

-- record_credit_sale: deduct stock, insert credit_sales
CREATE OR REPLACE FUNCTION public.record_credit_sale(
  _inventory_id uuid,
  _buyer_name text,
  _buyer_phone text,
  _quantity int,
  _amount_paid numeric,
  _due_date date
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_store uuid; v_branch uuid;
  v_inv record;
  v_total numeric; v_balance numeric; v_status credit_status; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _quantity <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  SELECT store_id, branch_id INTO v_store, v_branch FROM public.profiles WHERE id = v_user;
  SELECT * INTO v_inv FROM public.inventories WHERE id = _inventory_id AND store_id = v_store FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF v_inv.quantity < _quantity THEN RAISE EXCEPTION 'Insufficient stock'; END IF;

  v_total := v_inv.selling_price * _quantity;
  v_balance := GREATEST(v_total - COALESCE(_amount_paid,0), 0);
  v_status := CASE WHEN v_balance <= 0 THEN 'PAID'::credit_status
                   WHEN COALESCE(_amount_paid,0) > 0 THEN 'PARTIAL'::credit_status
                   ELSE 'PENDING'::credit_status END;
  UPDATE public.inventories SET quantity = quantity - _quantity WHERE id = v_inv.id;
  INSERT INTO public.credit_sales(inventory_id, buyer_name, buyer_phone, quantity, price, total, amount_paid, balance, status, due_date, store_id, branch_id, added_by)
  VALUES (_inventory_id, _buyer_name, NULLIF(_buyer_phone,''), _quantity, v_inv.selling_price, v_total, COALESCE(_amount_paid,0), v_balance, v_status, _due_date, v_store, v_branch, v_user)
  RETURNING id INTO v_id;
  PERFORM public.write_audit(v_store, 'credit_sale', v_id, 'created', jsonb_build_object('total', v_total, 'balance', v_balance));
  RETURN v_id;
END $$;

-- record_credit_payment: apply payment to credit_sales row
CREATE OR REPLACE FUNCTION public.record_credit_payment(_credit_id uuid, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_store uuid;
  v_row record;
  v_new_paid numeric; v_new_balance numeric; v_status credit_status;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  SELECT store_id INTO v_store FROM public.profiles WHERE id = v_user;
  SELECT * INTO v_row FROM public.credit_sales WHERE id = _credit_id AND store_id = v_store FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit sale not found'; END IF;
  v_new_paid := v_row.amount_paid + _amount;
  v_new_balance := GREATEST(v_row.total - v_new_paid, 0);
  v_status := CASE WHEN v_new_balance <= 0 THEN 'PAID'::credit_status ELSE 'PARTIAL'::credit_status END;
  UPDATE public.credit_sales SET amount_paid = v_new_paid, balance = v_new_balance, status = v_status WHERE id = _credit_id;
  PERFORM public.write_audit(v_store, 'credit_payment', _credit_id, 'created', jsonb_build_object('amount', _amount, 'balance', v_new_balance));
END $$;

-- record_stock_receipt: insert a receipt, increase inventory qty, update purchase_price (moving average)
CREATE OR REPLACE FUNCTION public.record_stock_receipt(
  _inventory_id uuid,
  _supplier_id uuid,
  _quantity int,
  _unit_cost numeric,
  _reference text,
  _notes text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_store uuid; v_branch uuid;
  v_inv record;
  v_new_avg numeric;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _quantity <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  IF _unit_cost < 0 THEN RAISE EXCEPTION 'Invalid cost'; END IF;
  SELECT store_id, branch_id INTO v_store, v_branch FROM public.profiles WHERE id = v_user;
  SELECT * INTO v_inv FROM public.inventories WHERE id = _inventory_id AND store_id = v_store FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;

  -- Moving-average cost
  IF (v_inv.quantity + _quantity) > 0 THEN
    v_new_avg := ((v_inv.quantity * v_inv.purchase_price) + (_quantity * _unit_cost)) / (v_inv.quantity + _quantity);
  ELSE
    v_new_avg := _unit_cost;
  END IF;

  UPDATE public.inventories
    SET quantity = quantity + _quantity,
        purchase_price = round(v_new_avg::numeric, 2)
    WHERE id = _inventory_id;

  INSERT INTO public.stock_receipts(store_id, branch_id, supplier_id, inventory_id, quantity, unit_cost, total_cost, reference, notes, received_by)
  VALUES (v_store, v_branch, _supplier_id, _inventory_id, _quantity, _unit_cost, _quantity * _unit_cost, NULLIF(_reference,''), NULLIF(_notes,''), v_user)
  RETURNING id INTO v_id;

  PERFORM public.write_audit(v_store, 'stock_receipt', v_id, 'created', jsonb_build_object('qty', _quantity, 'cost', _unit_cost));
  RETURN v_id;
END $$;
