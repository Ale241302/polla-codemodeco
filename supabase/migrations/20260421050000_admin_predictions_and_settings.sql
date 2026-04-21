-- ============================================================
-- Migration: tab admin "Predicciones" + setting bonus_enabled
-- ------------------------------------------------------------
-- 1) Tabla public.app_settings: config global (key/value).
-- 2) Seed: bonus_enabled = true.
-- 3) Política RLS: admin RW, approved users SELECT.
-- 4) Política "Admins manage all bonus": faltaba el FOR ALL en
--    bonus_predictions (solo existía SELECT para admin); el admin
--    no podía borrar bonus de otros usuarios.
-- ============================================================

-- ===== APP_SETTINGS =====
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at (reusa la función ya existente)
DROP TRIGGER IF EXISTS trg_app_settings_updated ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: bonus habilitado por defecto
INSERT INTO public.app_settings (key, value)
VALUES ('bonus_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- SELECT abierto a approved users + admin (para que el dashboard pueda leer)
DROP POLICY IF EXISTS "Approved users read settings" ON public.app_settings;
CREATE POLICY "Approved users read settings"
  ON public.app_settings FOR SELECT
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Solo admin escribe
DROP POLICY IF EXISTS "Admins manage settings" ON public.app_settings;
CREATE POLICY "Admins manage settings"
  ON public.app_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== ADMIN MANAGE BONUS (DELETE incluido) =====
-- En la migración original solo existía "Admins view all bonus" (SELECT).
-- Para que el admin pueda borrar bonus de cualquier usuario hace falta FOR ALL.
DROP POLICY IF EXISTS "Admins manage all bonus" ON public.bonus_predictions;
CREATE POLICY "Admins manage all bonus"
  ON public.bonus_predictions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
