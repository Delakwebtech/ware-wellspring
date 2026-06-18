
-- Enums
CREATE TYPE public.app_role AS ENUM ('superadmin','ceo','manager','staff');
CREATE TYPE public.inventory_status AS ENUM ('available','low','out_of_stock');
CREATE TYPE public.credit_status AS ENUM ('PENDING','PARTIAL','PAID');

-- Stores (tenants)
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  logo TEXT,
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Branches
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, store_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- current_store: helper returning the store_id of the authenticated user
CREATE OR REPLACE FUNCTION public.current_store_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT store_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Inventory
CREATE TABLE public.inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  purchase_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.inventory_status NOT NULL DEFAULT 'available',
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.inventories (store_id);
CREATE INDEX ON public.inventories (branch_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventories TO authenticated;
GRANT ALL ON public.inventories TO service_role;
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;

-- Sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_ref TEXT NOT NULL UNIQUE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  cost_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  customer_name TEXT,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.sales (store_id, created_at DESC);
CREATE INDEX ON public.sales (branch_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Credit sales
CREATE TABLE public.credit_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES public.inventories(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT,
  quantity INTEGER NOT NULL,
  price NUMERIC(14,2) NOT NULL,
  total NUMERIC(14,2) NOT NULL,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance NUMERIC(14,2) NOT NULL,
  status public.credit_status NOT NULL DEFAULT 'PENDING',
  due_date DATE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_sales TO authenticated;
GRANT ALL ON public.credit_sales TO service_role;
ALTER TABLE public.credit_sales ENABLE ROW LEVEL SECURITY;

-- Sales returns
CREATE TABLE public.sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES public.inventories(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  refund_amount NUMERIC(14,2) NOT NULL,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_returns TO authenticated;
GRANT ALL ON public.sales_returns TO service_role;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;

-- Damages
CREATE TABLE public.damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES public.inventories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  cost_loss NUMERIC(14,2) NOT NULL DEFAULT 0,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.damages TO authenticated;
GRANT ALL ON public.damages TO service_role;
ALTER TABLE public.damages ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inventories_updated BEFORE UPDATE ON public.inventories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_credit_sales_updated BEFORE UPDATE ON public.credit_sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- inventory status auto-set
CREATE OR REPLACE FUNCTION public.set_inventory_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quantity <= 0 THEN NEW.status := 'out_of_stock';
  ELSIF NEW.quantity <= NEW.reorder_level THEN NEW.status := 'low';
  ELSE NEW.status := 'available';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_inventory_status BEFORE INSERT OR UPDATE OF quantity, reorder_level ON public.inventories
FOR EACH ROW EXECUTE FUNCTION public.set_inventory_status();

-- Auto-create profile + first-user-becomes-superadmin trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_store_id UUID;
  v_user_count INTEGER;
  v_store_name TEXT;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM auth.users;

  -- First user creates a store and becomes superadmin
  IF v_user_count = 1 THEN
    v_store_name := COALESCE(NEW.raw_user_meta_data->>'store_name', 'My Store');
    INSERT INTO public.stores (name) VALUES (v_store_name) RETURNING id INTO v_store_id;
    INSERT INTO public.branches (store_id, name) VALUES (v_store_id, 'Main Branch');

    INSERT INTO public.profiles (id, full_name, email, store_id)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email, v_store_id);

    INSERT INTO public.user_roles (user_id, role, store_id) VALUES (NEW.id, 'superadmin', v_store_id);
  ELSE
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- stores
CREATE POLICY "users see their store" ON public.stores FOR SELECT TO authenticated
  USING (id = public.current_store_id() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "superadmin manages stores" ON public.stores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin')) WITH CHECK (public.has_role(auth.uid(),'superadmin'));

-- branches
CREATE POLICY "users see branches in store" ON public.branches FOR SELECT TO authenticated
  USING (store_id = public.current_store_id());
CREATE POLICY "admins manage branches" ON public.branches FOR ALL TO authenticated
  USING (store_id = public.current_store_id() AND (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'ceo') OR public.has_role(auth.uid(),'manager')))
  WITH CHECK (store_id = public.current_store_id());

-- profiles
CREATE POLICY "view profiles in same store" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR store_id = public.current_store_id() OR public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'ceo'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'ceo'));

-- user_roles
CREATE POLICY "view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'ceo'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'ceo'))
  WITH CHECK (public.has_role(auth.uid(),'superadmin') OR public.has_role(auth.uid(),'ceo'));

-- generic store-scoped policies
CREATE POLICY "store members access inventories" ON public.inventories FOR ALL TO authenticated
  USING (store_id = public.current_store_id()) WITH CHECK (store_id = public.current_store_id());
CREATE POLICY "store members access sales" ON public.sales FOR ALL TO authenticated
  USING (store_id = public.current_store_id()) WITH CHECK (store_id = public.current_store_id());
CREATE POLICY "store members access credit_sales" ON public.credit_sales FOR ALL TO authenticated
  USING (store_id = public.current_store_id()) WITH CHECK (store_id = public.current_store_id());
CREATE POLICY "store members access sales_returns" ON public.sales_returns FOR ALL TO authenticated
  USING (store_id = public.current_store_id()) WITH CHECK (store_id = public.current_store_id());
CREATE POLICY "store members access damages" ON public.damages FOR ALL TO authenticated
  USING (store_id = public.current_store_id()) WITH CHECK (store_id = public.current_store_id());
