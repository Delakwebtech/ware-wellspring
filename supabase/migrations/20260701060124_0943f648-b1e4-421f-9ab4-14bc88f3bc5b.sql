
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
DO $$ BEGIN
  ALTER TABLE public.stores ADD CONSTRAINT stores_status_check CHECK (status IN ('pending','active','suspended'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.store_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','monthly','yearly','lifetime')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','suspended','pending')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_store_subs_store ON public.store_subscriptions(store_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_subscriptions TO authenticated;
GRANT ALL ON public.store_subscriptions TO service_role;
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super manage subs" ON public.store_subscriptions;
CREATE POLICY "super manage subs" ON public.store_subscriptions FOR ALL
  USING (public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'));
DROP POLICY IF EXISTS "store read own subs" ON public.store_subscriptions;
CREATE POLICY "store read own subs" ON public.store_subscriptions FOR SELECT
  USING (store_id = public.current_store_id());

DROP TRIGGER IF EXISTS trg_store_subs_updated ON public.store_subscriptions;
CREATE TRIGGER trg_store_subs_updated BEFORE UPDATE ON public.store_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.store_subscriptions(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  method TEXT,
  reference TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_pay_sub ON public.subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_pay_store ON public.subscription_payments(store_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super manage sub payments" ON public.subscription_payments;
CREATE POLICY "super manage sub payments" ON public.subscription_payments FOR ALL
  USING (public.has_role(auth.uid(),'superadmin'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin'));
DROP POLICY IF EXISTS "store read own sub payments" ON public.subscription_payments;
CREATE POLICY "store read own sub payments" ON public.subscription_payments FOR SELECT
  USING (store_id = public.current_store_id());

DROP TRIGGER IF EXISTS trg_sub_pay_updated ON public.subscription_payments;
CREATE TRIGGER trg_sub_pay_updated BEFORE UPDATE ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.store_subscriptions (store_id, plan, status, started_at, expires_at, currency)
SELECT s.id, 'trial', 'active', now(), now() + interval '30 days', COALESCE(s.currency,'NGN')
FROM public.stores s
WHERE NOT EXISTS (SELECT 1 FROM public.store_subscriptions ss WHERE ss.store_id = s.id);
