
-- Phase 4: signup fields, subdomain, activation
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS stores_subdomain_unique ON public.stores (lower(subdomain)) WHERE subdomain IS NOT NULL;

-- Updated signup trigger: captures subdomain, phone, country, business_type; store starts as pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_store_id uuid;
  v_branch_id uuid;
  v_store_name text;
  v_subdomain text;
  v_phone text;
  v_country text;
  v_biz text;
BEGIN
  v_store_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'store_name',''),
                           split_part(NEW.email,'@',1) || '''s Store');
  v_subdomain := NULLIF(lower(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'subdomain',''), '[^a-z0-9-]', '', 'g')),'');
  v_phone := NULLIF(NEW.raw_user_meta_data->>'phone','');
  v_country := NULLIF(NEW.raw_user_meta_data->>'country','');
  v_biz := NULLIF(NEW.raw_user_meta_data->>'business_type','');

  INSERT INTO public.stores (name, subdomain, phone, country, business_type, owner_email, status)
  VALUES (v_store_name, v_subdomain, v_phone, v_country, v_biz, NEW.email, 'pending')
  RETURNING id INTO v_store_id;

  INSERT INTO public.branches (store_id, name) VALUES (v_store_id, 'Main Branch') RETURNING id INTO v_branch_id;

  INSERT INTO public.profiles (id, full_name, email, store_id, branch_id)
  VALUES (NEW.id,
          COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), NEW.email),
          NEW.email, v_store_id, v_branch_id);

  INSERT INTO public.user_roles (user_id, role, store_id) VALUES (NEW.id, 'ceo', v_store_id);

  -- Seed a pending 30-day trial subscription
  INSERT INTO public.store_subscriptions (store_id, plan, status, started_at, expires_at, currency)
  VALUES (v_store_id, 'trial', 'pending', now(), now() + interval '30 days', 'NGN');

  -- Notify superadmins
  INSERT INTO public.notifications (user_id, title, body, type)
  SELECT ur.user_id,
         'New store awaiting setup',
         v_store_name || ' (' || COALESCE(v_subdomain,'no subdomain') || ') just signed up.',
         'store_signup'
  FROM public.user_roles ur WHERE ur.role = 'superadmin';

  RETURN NEW;
END $function$;
