
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  notes text,
  total_spent numeric NOT NULL DEFAULT 0,
  outstanding_balance numeric NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant customers" ON public.customers FOR ALL TO authenticated
  USING (store_id = public.current_store_id()) WITH CHECK (store_id = public.current_store_id());
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX customers_store_idx ON public.customers(store_id);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);
ALTER TABLE public.credit_sales ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  category text NOT NULL,
  description text,
  amount numeric NOT NULL CHECK (amount >= 0),
  paid_via text NOT NULL DEFAULT 'cash',
  expense_date date NOT NULL DEFAULT current_date,
  receipt_url text,
  added_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant expenses" ON public.expenses FOR ALL TO authenticated
  USING (store_id = public.current_store_id()) WITH CHECK (store_id = public.current_store_id());
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX expenses_store_date_idx ON public.expenses(store_id, expense_date);

CREATE TABLE public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  email text NOT NULL,
  role app_role NOT NULL,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id),
  accepted_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_invites TO authenticated;
GRANT ALL ON public.staff_invites TO service_role;
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage invites" ON public.staff_invites FOR ALL TO authenticated
  USING (store_id = public.current_store_id() AND (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'ceo')))
  WITH CHECK (store_id = public.current_store_id() AND (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'ceo')));
CREATE TRIGGER invites_updated_at BEFORE UPDATE ON public.staff_invites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant notifications" ON public.notifications FOR ALL TO authenticated
  USING (store_id = public.current_store_id()) WITH CHECK (store_id = public.current_store_id());
CREATE INDEX notif_store_read_idx ON public.notifications(store_id, read_at);

CREATE TABLE public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  cashier_id uuid NOT NULL REFERENCES auth.users(id),
  opening_float numeric NOT NULL DEFAULT 0,
  expected_cash numeric,
  counted_cash numeric,
  variance numeric,
  cash_sales numeric NOT NULL DEFAULT 0,
  card_sales numeric NOT NULL DEFAULT 0,
  transfer_sales numeric NOT NULL DEFAULT 0,
  other_sales numeric NOT NULL DEFAULT 0,
  total_sales numeric NOT NULL DEFAULT 0,
  expenses_paid numeric NOT NULL DEFAULT 0,
  notes text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  status text NOT NULL DEFAULT 'open'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant cash sessions" ON public.cash_sessions FOR ALL TO authenticated
  USING (store_id = public.current_store_id()) WITH CHECK (store_id = public.current_store_id());
CREATE INDEX cash_sessions_store_status_idx ON public.cash_sessions(store_id, status);

CREATE OR REPLACE FUNCTION public.notify_low_stock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.quantity <= NEW.reorder_level AND (OLD.quantity IS DISTINCT FROM NEW.quantity) THEN
    INSERT INTO public.notifications(store_id, kind, title, body, link)
    VALUES (
      NEW.store_id,
      CASE WHEN NEW.quantity <= 0 THEN 'out_of_stock' ELSE 'low_stock' END,
      CASE WHEN NEW.quantity <= 0 THEN NEW.name || ' is out of stock' ELSE NEW.name || ' is running low' END,
      'On hand: ' || NEW.quantity || ' · Reorder at: ' || NEW.reorder_level,
      '/inventory'
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_low_stock ON public.inventories;
CREATE TRIGGER trg_notify_low_stock AFTER UPDATE OF quantity ON public.inventories
FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();

CREATE OR REPLACE FUNCTION public.record_expense(
  _category text, _description text, _amount numeric, _paid_via text, _expense_date date
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid(); v_store uuid; v_branch uuid; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount < 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  SELECT store_id, branch_id INTO v_store, v_branch FROM public.profiles WHERE id = v_user;
  INSERT INTO public.expenses(store_id, branch_id, category, description, amount, paid_via, expense_date, added_by)
  VALUES (v_store, v_branch, _category, NULLIF(_description,''), _amount, COALESCE(NULLIF(_paid_via,''),'cash'), COALESCE(_expense_date, current_date), v_user)
  RETURNING id INTO v_id;
  PERFORM public.write_audit(v_store, 'expense', v_id, 'created', jsonb_build_object('amount', _amount, 'category', _category));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.create_invite(
  _email text, _role app_role, _branch_id uuid
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid(); v_store uuid; v_code text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT store_id INTO v_store FROM public.profiles WHERE id = v_user;
  IF v_store IS NULL THEN RAISE EXCEPTION 'No store'; END IF;
  IF NOT (public.has_role(v_user,'superadmin') OR public.has_role(v_user,'ceo')) THEN
    RAISE EXCEPTION 'Only owners can invite staff';
  END IF;
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  INSERT INTO public.staff_invites(store_id, branch_id, email, role, code, invited_by)
  VALUES (v_store, _branch_id, lower(_email), _role, v_code, v_user);
  PERFORM public.write_audit(v_store, 'invite', NULL, 'created', jsonb_build_object('email', _email, 'role', _role));
  RETURN v_code;
END $$;

CREATE OR REPLACE FUNCTION public.accept_invite(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid(); v_email text; v_inv record; v_old_store uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  SELECT * INTO v_inv FROM public.staff_invites
    WHERE code = upper(_code) AND status = 'pending' AND expires_at > now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invite not found or expired'; END IF;
  IF lower(v_email) <> v_inv.email THEN RAISE EXCEPTION 'Invite is for a different email'; END IF;
  SELECT store_id INTO v_old_store FROM public.profiles WHERE id = v_user;
  UPDATE public.profiles SET store_id = v_inv.store_id, branch_id = v_inv.branch_id WHERE id = v_user;
  DELETE FROM public.user_roles WHERE user_id = v_user AND store_id = v_old_store;
  INSERT INTO public.user_roles(user_id, role, store_id) VALUES (v_user, v_inv.role, v_inv.store_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  UPDATE public.staff_invites SET status = 'accepted', accepted_by = v_user WHERE id = v_inv.id;
  PERFORM public.write_audit(v_inv.store_id, 'invite', v_inv.id, 'accepted', jsonb_build_object('user', v_user));
  RETURN v_inv.store_id;
END $$;

CREATE OR REPLACE FUNCTION public.open_cash_session(_opening_float numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid(); v_store uuid; v_branch uuid; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT store_id, branch_id INTO v_store, v_branch FROM public.profiles WHERE id = v_user;
  IF EXISTS (SELECT 1 FROM public.cash_sessions WHERE cashier_id = v_user AND status = 'open') THEN
    RAISE EXCEPTION 'You already have an open session';
  END IF;
  INSERT INTO public.cash_sessions(store_id, branch_id, cashier_id, opening_float)
  VALUES (v_store, v_branch, v_user, COALESCE(_opening_float, 0)) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.close_cash_session(_session_id uuid, _counted_cash numeric, _notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid(); v_s record;
  v_cash numeric := 0; v_card numeric := 0; v_xfer numeric := 0; v_other numeric := 0; v_total numeric := 0;
  v_exp numeric := 0; v_expected numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_s FROM public.cash_sessions WHERE id = _session_id AND cashier_id = v_user AND status = 'open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  SELECT
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total_amount ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN payment_method NOT IN ('cash','card','transfer') THEN total_amount ELSE 0 END),0),
    COALESCE(SUM(total_amount),0)
  INTO v_cash, v_card, v_xfer, v_other, v_total
  FROM public.sales WHERE store_id = v_s.store_id AND added_by = v_user AND created_at >= v_s.opened_at;
  SELECT COALESCE(SUM(amount),0) INTO v_exp FROM public.expenses
  WHERE store_id = v_s.store_id AND added_by = v_user AND created_at >= v_s.opened_at AND paid_via = 'cash';
  v_expected := v_s.opening_float + v_cash - v_exp;
  UPDATE public.cash_sessions SET
    closed_at = now(), status = 'closed', counted_cash = _counted_cash,
    expected_cash = v_expected, variance = COALESCE(_counted_cash,0) - v_expected,
    cash_sales = v_cash, card_sales = v_card, transfer_sales = v_xfer, other_sales = v_other,
    total_sales = v_total, expenses_paid = v_exp, notes = NULLIF(_notes,'')
  WHERE id = _session_id;
  PERFORM public.write_audit(v_s.store_id, 'cash_session', _session_id, 'closed',
    jsonb_build_object('expected', v_expected, 'counted', _counted_cash));
END $$;

CREATE OR REPLACE FUNCTION public.record_sale(_items jsonb, _payment_method text, _customer_name text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid(); v_store uuid; v_branch uuid; v_sale_id uuid;
  v_total numeric := 0; v_cost numeric := 0;
  v_ref text; v_enriched jsonb := '[]'::jsonb;
  v_item jsonb; v_inv record; v_qty int; v_customer_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT store_id, branch_id INTO v_store, v_branch FROM public.profiles WHERE id = v_user;
  IF v_store IS NULL THEN RAISE EXCEPTION 'No store assigned'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (v_item->>'quantity')::int;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT id, name, category, quantity, selling_price, purchase_price INTO v_inv
      FROM public.inventories WHERE id = (v_item->>'inventory_id')::uuid AND store_id = v_store FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
    IF v_inv.quantity < v_qty THEN RAISE EXCEPTION 'Insufficient stock for %', v_inv.name; END IF;
    UPDATE public.inventories SET quantity = quantity - v_qty WHERE id = v_inv.id;
    v_total := v_total + (v_inv.selling_price * v_qty);
    v_cost := v_cost + (v_inv.purchase_price * v_qty);
    v_enriched := v_enriched || jsonb_build_object(
      'inventory_id', v_inv.id, 'name', v_inv.name, 'category', v_inv.category,
      'price', v_inv.selling_price, 'cost', v_inv.purchase_price, 'quantity', v_qty);
  END LOOP;
  IF NULLIF(_customer_name,'') IS NOT NULL THEN
    SELECT id INTO v_customer_id FROM public.customers WHERE store_id = v_store AND lower(name) = lower(_customer_name) LIMIT 1;
    IF v_customer_id IS NULL THEN
      INSERT INTO public.customers(store_id, name, created_by) VALUES (v_store, _customer_name, v_user) RETURNING id INTO v_customer_id;
    END IF;
    UPDATE public.customers SET total_spent = total_spent + v_total WHERE id = v_customer_id;
  END IF;
  v_ref := 'INV-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  INSERT INTO public.sales(sale_ref, items, total_amount, cost_amount, payment_method, customer_name, customer_id, store_id, branch_id, added_by)
  VALUES (v_ref, v_enriched, v_total, v_cost, _payment_method, NULLIF(_customer_name,''), v_customer_id, v_store, v_branch, v_user)
  RETURNING id INTO v_sale_id;
  PERFORM public.write_audit(v_store, 'sale', v_sale_id, 'created', jsonb_build_object('total', v_total, 'ref', v_ref));
  RETURN v_sale_id;
END $$;
