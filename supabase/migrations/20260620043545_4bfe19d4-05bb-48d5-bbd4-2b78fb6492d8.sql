
ALTER TABLE public.inventories ADD COLUMN IF NOT EXISTS barcode TEXT;
CREATE INDEX IF NOT EXISTS inventories_barcode_idx ON public.inventories(store_id, barcode);
CREATE INDEX IF NOT EXISTS inventories_sku_idx ON public.inventories(store_id, sku);

CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  from_branch_id uuid NOT NULL REFERENCES public.branches(id),
  to_branch_id uuid NOT NULL REFERENCES public.branches(id),
  source_inventory_id uuid NOT NULL REFERENCES public.inventories(id),
  dest_inventory_id uuid REFERENCES public.inventories(id),
  item_name TEXT NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  notes TEXT,
  transferred_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_transfers TO authenticated;
GRANT ALL ON public.stock_transfers TO service_role;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_transfers" ON public.stock_transfers
  FOR ALL TO authenticated
  USING (store_id = public.current_store_id())
  WITH CHECK (store_id = public.current_store_id());

CREATE OR REPLACE FUNCTION public.transfer_stock(
  _source_inventory_id uuid,
  _to_branch_id uuid,
  _quantity int,
  _notes text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_store uuid;
  v_src record;
  v_dest_id uuid;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _quantity <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

  SELECT store_id INTO v_store FROM public.profiles WHERE id = v_user;
  IF v_store IS NULL THEN RAISE EXCEPTION 'No store'; END IF;

  SELECT * INTO v_src FROM public.inventories
    WHERE id = _source_inventory_id AND store_id = v_store FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source item not found'; END IF;
  IF v_src.branch_id = _to_branch_id THEN RAISE EXCEPTION 'Source and destination branches are the same'; END IF;
  IF v_src.quantity < _quantity THEN RAISE EXCEPTION 'Insufficient stock at source'; END IF;

  -- Find or create destination inventory (match by sku if present, else by name)
  SELECT id INTO v_dest_id FROM public.inventories
    WHERE store_id = v_store AND branch_id = _to_branch_id
      AND ((v_src.sku IS NOT NULL AND sku = v_src.sku) OR (v_src.sku IS NULL AND name = v_src.name))
    LIMIT 1 FOR UPDATE;

  IF v_dest_id IS NULL THEN
    INSERT INTO public.inventories(name, sku, barcode, category, quantity, reorder_level, purchase_price, selling_price, store_id, branch_id, added_by)
    VALUES (v_src.name, v_src.sku, v_src.barcode, v_src.category, _quantity, v_src.reorder_level, v_src.purchase_price, v_src.selling_price, v_store, _to_branch_id, v_user)
    RETURNING id INTO v_dest_id;
  ELSE
    UPDATE public.inventories SET quantity = quantity + _quantity WHERE id = v_dest_id;
  END IF;

  UPDATE public.inventories SET quantity = quantity - _quantity WHERE id = v_src.id;

  INSERT INTO public.stock_transfers(store_id, from_branch_id, to_branch_id, source_inventory_id, dest_inventory_id, item_name, quantity, notes, transferred_by)
  VALUES (v_store, v_src.branch_id, _to_branch_id, v_src.id, v_dest_id, v_src.name, _quantity, NULLIF(_notes,''), v_user)
  RETURNING id INTO v_id;

  PERFORM public.write_audit(v_store, 'stock_transfer', v_id, 'created',
    jsonb_build_object('item', v_src.name, 'qty', _quantity, 'to_branch', _to_branch_id));
  RETURN v_id;
END $$;
