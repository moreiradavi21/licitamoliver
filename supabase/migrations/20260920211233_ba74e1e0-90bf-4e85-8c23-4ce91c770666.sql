CREATE TABLE public.nichos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL CHECK (length(btrim(nome)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nichos TO authenticated;
GRANT ALL ON public.nichos TO service_role;
ALTER TABLE public.nichos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own niches" ON public.nichos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_nichos_updated BEFORE UPDATE ON public.nichos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.subnichos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nicho_id UUID NOT NULL REFERENCES public.nichos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL CHECK (length(btrim(nome)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nicho_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subnichos TO authenticated;
GRANT ALL ON public.subnichos TO service_role;
ALTER TABLE public.subnichos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subniches" ON public.subnichos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.nichos n WHERE n.id = nicho_id AND n.user_id = auth.uid()));
CREATE TRIGGER trg_subnichos_updated BEFORE UPDATE ON public.subnichos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.micro_nichos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subnicho_id UUID NOT NULL REFERENCES public.subnichos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL CHECK (length(btrim(nome)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subnicho_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.micro_nichos TO authenticated;
GRANT ALL ON public.micro_nichos TO service_role;
ALTER TABLE public.micro_nichos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own micro niches" ON public.micro_nichos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.subnichos s WHERE s.id = subnicho_id AND s.user_id = auth.uid()));
CREATE TRIGGER trg_micro_nichos_updated BEFORE UPDATE ON public.micro_nichos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fornecedores_nichos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  nicho_id UUID NOT NULL REFERENCES public.nichos(id) ON DELETE CASCADE,
  subnicho_id UUID REFERENCES public.subnichos(id) ON DELETE CASCADE,
  micro_nicho_id UUID REFERENCES public.micro_nichos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (fornecedor_id, nicho_id, subnicho_id, micro_nicho_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores_nichos TO authenticated;
GRANT ALL ON public.fornecedores_nichos TO service_role;
ALTER TABLE public.fornecedores_nichos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own supplier niches" ON public.fornecedores_nichos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.suppliers f WHERE f.id = fornecedor_id AND f.user_id = auth.uid()))
WITH CHECK (
  EXISTS (SELECT 1 FROM public.suppliers f WHERE f.id = fornecedor_id AND f.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.nichos n WHERE n.id = nicho_id AND n.user_id = auth.uid())
);
CREATE INDEX idx_fornecedores_nichos_fornecedor ON public.fornecedores_nichos(fornecedor_id);
CREATE INDEX idx_fornecedores_nichos_nicho ON public.fornecedores_nichos(nicho_id);
CREATE INDEX idx_subnichos_nicho ON public.subnichos(nicho_id);
CREATE INDEX idx_micro_nichos_subnicho ON public.micro_nichos(subnicho_id);

ALTER TABLE public.suppliers
  ADD COLUMN uf TEXT CHECK (uf IS NULL OR uf ~ '^[A-Z]{2}$'),
  ADD COLUMN cidade TEXT,
  ADD COLUMN telefone TEXT,
  ADD COLUMN vendedor TEXT,
  ADD COLUMN condicoes_pagamento TEXT,
  ADD COLUMN garantia TEXT,
  ADD COLUMN vende_sob_demanda TEXT NOT NULL DEFAULT 'nao' CHECK (vende_sob_demanda IN ('sim', 'nao', 'parcialmente')),
  ADD COLUMN quantidade_minima NUMERIC CHECK (quantidade_minima IS NULL OR quantidade_minima >= 0),
  ADD COLUMN frete_bh TEXT,
  ADD COLUMN ultima_cotacao DATE;

ALTER TABLE public.opportunities
  ADD COLUMN nicho_id UUID REFERENCES public.nichos(id) ON DELETE SET NULL,
  ADD COLUMN subnicho_id UUID REFERENCES public.subnichos(id) ON DELETE SET NULL,
  ADD COLUMN micro_nicho_id UUID REFERENCES public.micro_nichos(id) ON DELETE SET NULL;
CREATE INDEX idx_opportunities_nicho ON public.opportunities(nicho_id);

CREATE OR REPLACE FUNCTION public.validate_niche_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.subnicho_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.subnichos s WHERE s.id = NEW.subnicho_id AND s.nicho_id = NEW.nicho_id
  ) THEN
    RAISE EXCEPTION 'O subnicho não pertence ao nicho selecionado';
  END IF;
  IF NEW.micro_nicho_id IS NOT NULL THEN
    IF NEW.subnicho_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.micro_nichos m WHERE m.id = NEW.micro_nicho_id AND m.subnicho_id = NEW.subnicho_id
    ) THEN
      RAISE EXCEPTION 'O micro-nicho não pertence ao subnicho selecionado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.validate_niche_hierarchy() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_fornecedores_nichos_hierarchy
BEFORE INSERT OR UPDATE ON public.fornecedores_nichos
FOR EACH ROW EXECUTE FUNCTION public.validate_niche_hierarchy();
CREATE TRIGGER trg_opportunities_niche_hierarchy
BEFORE INSERT OR UPDATE OF nicho_id, subnicho_id, micro_nicho_id ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.validate_niche_hierarchy();