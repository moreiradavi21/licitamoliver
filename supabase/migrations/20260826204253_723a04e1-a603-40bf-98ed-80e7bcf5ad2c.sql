CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

-- settings
CREATE TABLE public.settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  min_margin NUMERIC NOT NULL DEFAULT 8,
  good_margin NUMERIC NOT NULL DEFAULT 15,
  default_tax_percent NUMERIC NOT NULL DEFAULT 0,
  default_risk_percent NUMERIC NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- suppliers
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  cnpj TEXT,
  contact_name TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  categories TEXT[] NOT NULL DEFAULT '{}',
  rating_price INT NOT NULL DEFAULT 0,
  rating_response INT NOT NULL DEFAULT 0,
  rating_deadline INT NOT NULL DEFAULT 0,
  rating_quality INT NOT NULL DEFAULT 0,
  rating_aftersales INT NOT NULL DEFAULT 0,
  trust_level TEXT NOT NULL DEFAULT 'cautela',
  issues_invoice BOOLEAN NOT NULL DEFAULT false,
  real_stock BOOLEAN NOT NULL DEFAULT false,
  delivers_to_agency BOOLEAN NOT NULL DEFAULT false,
  avg_delivery_days INT,
  return_policy TEXT,
  had_problems BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own suppliers" ON public.suppliers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- items
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  model TEXT,
  manufacturer_code TEXT,
  specs TEXT,
  ncm TEXT,
  gtin TEXT,
  historic_cost NUMERIC,
  min_price NUMERIC,
  max_price NUMERIC,
  avg_margin NUMERIC,
  won_before BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own items" ON public.items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_items_updated BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- item supplier prices
CREATE TABLE public.item_supplier_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers ON DELETE CASCADE,
  price NUMERIC NOT NULL DEFAULT 0,
  freight NUMERIC NOT NULL DEFAULT 0,
  delivery_days INT,
  role TEXT NOT NULL DEFAULT 'principal',
  stock_confirmed BOOLEAN NOT NULL DEFAULT false,
  quoted_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_supplier_prices TO authenticated;
GRANT ALL ON public.item_supplier_prices TO service_role;
ALTER TABLE public.item_supplier_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prices" ON public.item_supplier_prices FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_prices_updated BEFORE UPDATE ON public.item_supplier_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- opportunities
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  number TEXT NOT NULL,
  agency TEXT,
  uasg TEXT,
  platform TEXT,
  process_url TEXT,
  published_at DATE,
  dispute_at TIMESTAMPTZ,
  delivery_place TEXT,
  delivery_days INT,
  payment_days INT,
  classification TEXT NOT NULL DEFAULT 'outros',
  status TEXT NOT NULL DEFAULT 'nova',
  traffic_light TEXT NOT NULL DEFAULT 'amarelo',
  estimated_value NUMERIC,
  won_value NUMERIC,
  estimated_profit NUMERIC,
  realized_profit NUMERIC,
  documents_pending BOOLEAN NOT NULL DEFAULT false,
  supplier_confirmed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own opportunities" ON public.opportunities FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_opps_updated BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- opportunity items
CREATE TABLE public.opportunity_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities ON DELETE CASCADE,
  item_id UUID REFERENCES public.items ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  freight NUMERIC NOT NULL DEFAULT 0,
  taxes NUMERIC NOT NULL DEFAULT 0,
  other_costs NUMERIC NOT NULL DEFAULT 0,
  risk_reserve NUMERIC NOT NULL DEFAULT 0,
  proposed_price NUMERIC NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers ON DELETE SET NULL,
  stock_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_items TO authenticated;
GRANT ALL ON public.opportunity_items TO service_role;
ALTER TABLE public.opportunity_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own opportunity items" ON public.opportunity_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_opp_items_updated BEFORE UPDATE ON public.opportunity_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- document analyses
CREATE TABLE public.document_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.opportunities ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  summary TEXT,
  favorable JSONB NOT NULL DEFAULT '[]'::jsonb,
  attention JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  extracted JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_analyses TO authenticated;
GRANT ALL ON public.document_analyses TO service_role;
ALTER TABLE public.document_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analyses" ON public.document_analyses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_opps_user_status ON public.opportunities(user_id, status);
CREATE INDEX idx_opp_items_opp ON public.opportunity_items(opportunity_id);
CREATE INDEX idx_prices_item ON public.item_supplier_prices(item_id);