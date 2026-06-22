
-- Single-store-or-superadmin policies
DROP POLICY IF EXISTS "store members access inventories"    ON public.inventories;
DROP POLICY IF EXISTS "store members access sales"          ON public.sales;
DROP POLICY IF EXISTS "store members access credit_sales"   ON public.credit_sales;
DROP POLICY IF EXISTS "store members access damages"        ON public.damages;
DROP POLICY IF EXISTS "store members access sales_returns"  ON public.sales_returns;
DROP POLICY IF EXISTS "store members access stock_receipts" ON public.stock_receipts;
DROP POLICY IF EXISTS "store members access suppliers"      ON public.suppliers;
DROP POLICY IF EXISTS "tenant customers"        ON public.customers;
DROP POLICY IF EXISTS "tenant expenses"         ON public.expenses;
DROP POLICY IF EXISTS "tenant notifications"    ON public.notifications;
DROP POLICY IF EXISTS "tenant cash sessions"    ON public.cash_sessions;
DROP POLICY IF EXISTS "tenant_transfers"        ON public.stock_transfers;
DROP POLICY IF EXISTS "users see branches in store" ON public.branches;
DROP POLICY IF EXISTS "admins manage branches"      ON public.branches;
DROP POLICY IF EXISTS "managers view audit logs"    ON public.audit_logs;
DROP POLICY IF EXISTS "admins manage invites"       ON public.staff_invites;

CREATE POLICY "store or superadmin inventories"    ON public.inventories    FOR ALL USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin')) WITH CHECK (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));
CREATE POLICY "store or superadmin sales"          ON public.sales          FOR ALL USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin')) WITH CHECK (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));
CREATE POLICY "store or superadmin credit_sales"   ON public.credit_sales   FOR ALL USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin')) WITH CHECK (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));
CREATE POLICY "store or superadmin damages"        ON public.damages        FOR ALL USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin')) WITH CHECK (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));
CREATE POLICY "store or superadmin sales_returns"  ON public.sales_returns  FOR ALL USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin')) WITH CHECK (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));
CREATE POLICY "store or superadmin stock_receipts" ON public.stock_receipts FOR ALL USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin')) WITH CHECK (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));
CREATE POLICY "store or superadmin suppliers"      ON public.suppliers      FOR ALL USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin')) WITH CHECK (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));
CREATE POLICY "store or superadmin customers"      ON public.customers      FOR ALL USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin')) WITH CHECK (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));
CREATE POLICY "store or superadmin expenses"       ON public.expenses       FOR ALL USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin')) WITH CHECK (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));
CREATE POLICY "store or superadmin notifications"  ON public.notifications  FOR ALL USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin')) WITH CHECK (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));
CREATE POLICY "store or superadmin cash_sessions"  ON public.cash_sessions  FOR ALL USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin')) WITH CHECK (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));
CREATE POLICY "store or superadmin stock_transfers" ON public.stock_transfers FOR ALL USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin')) WITH CHECK (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));

CREATE POLICY "branches read" ON public.branches FOR SELECT USING (store_id = current_store_id() OR has_role(auth.uid(),'superadmin'));
CREATE POLICY "branches write" ON public.branches FOR ALL USING (
  has_role(auth.uid(),'superadmin') OR (store_id = current_store_id() AND (has_role(auth.uid(),'ceo') OR has_role(auth.uid(),'manager')))
) WITH CHECK (
  has_role(auth.uid(),'superadmin') OR (store_id = current_store_id() AND (has_role(auth.uid(),'ceo') OR has_role(auth.uid(),'manager')))
);

CREATE POLICY "audit logs read" ON public.audit_logs FOR SELECT USING (
  has_role(auth.uid(),'superadmin') OR (store_id = current_store_id() AND (has_role(auth.uid(),'ceo') OR has_role(auth.uid(),'manager')))
);

CREATE POLICY "invites manage" ON public.staff_invites FOR ALL USING (
  has_role(auth.uid(),'superadmin') OR (store_id = current_store_id() AND has_role(auth.uid(),'ceo'))
) WITH CHECK (
  has_role(auth.uid(),'superadmin') OR (store_id = current_store_id() AND has_role(auth.uid(),'ceo'))
);
