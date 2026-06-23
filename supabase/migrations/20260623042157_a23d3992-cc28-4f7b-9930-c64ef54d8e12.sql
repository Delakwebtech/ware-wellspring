
-- 1. Ensure every existing superadmin-also account has CEO before we strip superadmin
INSERT INTO public.user_roles (user_id, role, store_id)
SELECT p.id, 'ceo'::app_role, p.store_id
FROM public.profiles p
WHERE p.store_id IS NOT NULL
  AND p.id <> 'a0bdbf1e-a22c-4e32-91ec-82e70e2688e4'
  AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'superadmin')
ON CONFLICT (user_id, role, store_id) DO NOTHING;

-- 2. Strip 'superadmin' from everyone except the dedicated platform account
DELETE FROM public.user_roles
WHERE role = 'superadmin'
  AND user_id <> 'a0bdbf1e-a22c-4e32-91ec-82e70e2688e4';

-- 3. New signups become CEO (not superadmin)
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
  v_store_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'store_name',''),
                           split_part(NEW.email,'@',1) || '''s Store');
  INSERT INTO public.stores (name) VALUES (v_store_name) RETURNING id INTO v_store_id;
  INSERT INTO public.branches (store_id, name) VALUES (v_store_id, 'Main Branch') RETURNING id INTO v_branch_id;
  INSERT INTO public.profiles (id, full_name, email, store_id, branch_id)
  VALUES (NEW.id,
          COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), NEW.email),
          NEW.email, v_store_id, v_branch_id);
  INSERT INTO public.user_roles (user_id, role, store_id) VALUES (NEW.id, 'ceo', v_store_id);
  RETURN NEW;
END $$;

-- 4. Superadmin loses access to operational tables
DROP POLICY IF EXISTS "store or superadmin inventories"     ON public.inventories;
DROP POLICY IF EXISTS "store or superadmin sales"           ON public.sales;
DROP POLICY IF EXISTS "store or superadmin credit_sales"    ON public.credit_sales;
DROP POLICY IF EXISTS "store or superadmin damages"         ON public.damages;
DROP POLICY IF EXISTS "store or superadmin sales_returns"   ON public.sales_returns;
DROP POLICY IF EXISTS "store or superadmin customers"       ON public.customers;
DROP POLICY IF EXISTS "store or superadmin suppliers"       ON public.suppliers;
DROP POLICY IF EXISTS "store or superadmin expenses"        ON public.expenses;
DROP POLICY IF EXISTS "store or superadmin cash_sessions"   ON public.cash_sessions;
DROP POLICY IF EXISTS "store or superadmin stock_receipts"  ON public.stock_receipts;
DROP POLICY IF EXISTS "store or superadmin stock_transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "store or superadmin notifications"   ON public.notifications;
DROP POLICY IF EXISTS "audit logs read"                     ON public.audit_logs;

CREATE POLICY "store only inventories"     ON public.inventories     FOR ALL USING (store_id = current_store_id()) WITH CHECK (store_id = current_store_id());
CREATE POLICY "store only sales"           ON public.sales           FOR ALL USING (store_id = current_store_id()) WITH CHECK (store_id = current_store_id());
CREATE POLICY "store only credit_sales"    ON public.credit_sales    FOR ALL USING (store_id = current_store_id()) WITH CHECK (store_id = current_store_id());
CREATE POLICY "store only damages"         ON public.damages         FOR ALL USING (store_id = current_store_id()) WITH CHECK (store_id = current_store_id());
CREATE POLICY "store only sales_returns"   ON public.sales_returns   FOR ALL USING (store_id = current_store_id()) WITH CHECK (store_id = current_store_id());
CREATE POLICY "store only customers"       ON public.customers       FOR ALL USING (store_id = current_store_id()) WITH CHECK (store_id = current_store_id());
CREATE POLICY "store only suppliers"       ON public.suppliers       FOR ALL USING (store_id = current_store_id()) WITH CHECK (store_id = current_store_id());
CREATE POLICY "store only expenses"        ON public.expenses        FOR ALL USING (store_id = current_store_id()) WITH CHECK (store_id = current_store_id());
CREATE POLICY "store only cash_sessions"   ON public.cash_sessions   FOR ALL USING (store_id = current_store_id()) WITH CHECK (store_id = current_store_id());
CREATE POLICY "store only stock_receipts"  ON public.stock_receipts  FOR ALL USING (store_id = current_store_id()) WITH CHECK (store_id = current_store_id());
CREATE POLICY "store only stock_transfers" ON public.stock_transfers FOR ALL USING (store_id = current_store_id()) WITH CHECK (store_id = current_store_id());
CREATE POLICY "store only notifications"   ON public.notifications   FOR ALL USING (store_id = current_store_id()) WITH CHECK (store_id = current_store_id());

CREATE POLICY "audit logs read store only" ON public.audit_logs
  FOR SELECT USING (store_id = current_store_id()
                    AND (has_role(auth.uid(),'ceo') OR has_role(auth.uid(),'manager')));
