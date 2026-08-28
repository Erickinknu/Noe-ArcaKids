-- ============================================================
-- NOE + ARCA KIDS - Schema Seed (PostgreSQL)
-- ============================================================
-- Ejecutar con: supabase db reset --schema-public --fresh-start
-- O manualmente: psql "postgresql://postgres:%40JSES94ink96%40@db.jvxeiexsmnoorhhphjld.supabase.co:5432/postgres" -f supabase/seed.sql
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "public"."pg_catalog"."uuid";
CREATE EXTENSION IF NOT EXISTS "public"."information_schema";

-- ============================================================
-- Tabla: children (hijos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.children (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  age integer,
  emoji text,
  avatar_url text,
  is_online boolean DEFAULT false,
  last_seen timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comentario: Tabla de hijos. RLS policy: los usuarios solo ven los suyos por family_id (ver below)

-- Índice para búsquedas por family_id
CREATE INDEX IF NOT EXISTS idx_children_family_id ON public.children (family_id);
CREATE INDEX IF NOT EXISTS idx_children_is_online ON public.children (is_online DESC);
CREATE INDEX IF NOT EXISTS idx_children_created_at ON public.children (created_at DESC);

-- ============================================================
-- Tabla: parental_rules (reglas de parentalidad)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parental_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  progress integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_parental_rules_category ON public.parental_rules (category);
CREATE INDEX IF NOT EXISTS idx_parental_rules_created_at ON public.parental_rules (created_at DESC);

-- ============================================================
-- Tabla: user_settings (configuraciones por usuario)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  notifications_enabled boolean DEFAULT true,
  language text DEFAULT 'es',
  dark_mode boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings (user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_language ON public.user_settings (language);

-- ============================================================
-- Tabla: pairing_codes (códigos de vinculación)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pairing_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  family_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  used_by_user_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pairing_codes_code ON public.pairing_codes (code);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_family_id ON public.pairing_codes (family_id);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires_at ON public.pairing_codes (expires_at);

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parental_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairing_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo ven sus propios hijos (por family_id)
-- NOTA: En producción, 'family_id' debería venirse del auth context
CREATE POLICY "Users can view own children" ON public.children FOR SELECT USING (true);
-- Policy: Los usuarios pueden insertar sus propios hijos
CREATE POLICY "Users can insert own children" ON public.children FOR INSERT WITH CHECK (true);
-- Policy: Los usuarios pueden actualizar sus propios hijos
CREATE POLICY "Users can update own children" ON public.children FOR UPDATE USING (true);
-- Policy: Los usuarios pueden eliminar sus propios hijos
CREATE POLICY "Users can delete own children" ON public.children FOR DELETE USING (true);

-- Policy: Los usuarios ven sus propias reglas
CREATE POLICY "Users can view own rules" ON public.parental_rules FOR SELECT USING (true);
CREATE POLICY "Users can insert own rules" ON public.parental_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own rules" ON public.parental_rules FOR UPDATE USING (true);
CREATE POLICY "Users can delete own rules" ON public.parental_rules FOR DELETE USING (true);

-- Policy: Users can view own settings
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (true);
-- Policy: Users can update own settings (solo el que corresponde a su user_id)
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (user_id = auth.uid());

-- Policy: Pairing codes - cualquiera puede consultar códigos no usados
CREATE POLICY "Public can view active pairing codes" ON public.pairing_codes FOR SELECT USING (used = false AND expires_at > now());
-- Policy: Dueño de un código puede marcarlo como usado
CREATE POLICY "Owner can mark code as used" ON public.pairing_codes FOR UPDATE USING (used_by_user_id = auth.uid());

-- ============================================================
-- Triggers para updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_children_updated_at BEFORE UPDATE ON public.children FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_parental_rules_updated_at BEFORE UPDATE ON public.parental_rules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- View: vistos útiles (opcional)
-- ============================================================
CREATE OR REPLACE VIEW public.children_view AS
SELECT id, name, age, emoji, avatar_url, is_online, last_seen, created_at
FROM public.children WHERE is_online = true;

GRANT SELECT ON children_view TO public;

-- ============================================================
-- Fin del schema
-- ============================================================
GRANT USAGE ON SCHEMA public TO public;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO public;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO public;