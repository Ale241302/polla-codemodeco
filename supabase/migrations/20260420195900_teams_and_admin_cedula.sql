-- ============================================================
-- Migration: teams table + seed 48 Mundial 2026 + admin cedula 0000000
-- ============================================================

-- ===== TEAMS =====
CREATE TABLE IF NOT EXISTS public.teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  confederation TEXT NOT NULL,
  flag_emoji TEXT,
  group_code TEXT
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Anyone logged-in (approved user or admin) can read teams (for dropdowns)
CREATE POLICY "Approved users view teams"
  ON public.teams FOR SELECT
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Only admins manage teams
CREATE POLICY "Admins manage teams"
  ON public.teams FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== SEED: 48 selecciones Mundial 2026 (clasificados + probables) =====
-- Confederaciones: UEFA (16), CONMEBOL (6), CAF (9), AFC (8), CONCACAF (6 incl. 3 anfitriones), OFC (1), INTERCONTINENTAL PLAYOFF (2)
INSERT INTO public.teams (name, confederation, flag_emoji) VALUES
  -- Anfitriones (CONCACAF)
  ('Estados Unidos', 'CONCACAF', '🇺🇸'),
  ('México', 'CONCACAF', '🇲🇽'),
  ('Canadá', 'CONCACAF', '🇨🇦'),
  -- Resto CONCACAF
  ('Costa Rica', 'CONCACAF', '🇨🇷'),
  ('Panamá', 'CONCACAF', '🇵🇦'),
  ('Jamaica', 'CONCACAF', '🇯🇲'),
  -- CONMEBOL (6)
  ('Argentina', 'CONMEBOL', '🇦🇷'),
  ('Brasil', 'CONMEBOL', '🇧🇷'),
  ('Uruguay', 'CONMEBOL', '🇺🇾'),
  ('Colombia', 'CONMEBOL', '🇨🇴'),
  ('Ecuador', 'CONMEBOL', '🇪🇨'),
  ('Paraguay', 'CONMEBOL', '🇵🇾'),
  -- UEFA (16)
  ('España', 'UEFA', '🇪🇸'),
  ('Francia', 'UEFA', '🇫🇷'),
  ('Inglaterra', 'UEFA', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
  ('Portugal', 'UEFA', '🇵🇹'),
  ('Alemania', 'UEFA', '🇩🇪'),
  ('Países Bajos', 'UEFA', '🇳🇱'),
  ('Italia', 'UEFA', '🇮🇹'),
  ('Bélgica', 'UEFA', '🇧🇪'),
  ('Croacia', 'UEFA', '🇭🇷'),
  ('Suiza', 'UEFA', '🇨🇭'),
  ('Dinamarca', 'UEFA', '🇩🇰'),
  ('Austria', 'UEFA', '🇦🇹'),
  ('Polonia', 'UEFA', '🇵🇱'),
  ('Turquía', 'UEFA', '🇹🇷'),
  ('Noruega', 'UEFA', '🇳🇴'),
  ('Serbia', 'UEFA', '🇷🇸'),
  -- CAF (9)
  ('Marruecos', 'CAF', '🇲🇦'),
  ('Senegal', 'CAF', '🇸🇳'),
  ('Egipto', 'CAF', '🇪🇬'),
  ('Nigeria', 'CAF', '🇳🇬'),
  ('Argelia', 'CAF', '🇩🇿'),
  ('Camerún', 'CAF', '🇨🇲'),
  ('Costa de Marfil', 'CAF', '🇨🇮'),
  ('Túnez', 'CAF', '🇹🇳'),
  ('Ghana', 'CAF', '🇬🇭'),
  -- AFC (8)
  ('Japón', 'AFC', '🇯🇵'),
  ('Corea del Sur', 'AFC', '🇰🇷'),
  ('Irán', 'AFC', '🇮🇷'),
  ('Australia', 'AFC', '🇦🇺'),
  ('Arabia Saudita', 'AFC', '🇸🇦'),
  ('Qatar', 'AFC', '🇶🇦'),
  ('Irak', 'AFC', '🇮🇶'),
  ('Uzbekistán', 'AFC', '🇺🇿'),
  -- OFC (1)
  ('Nueva Zelanda', 'OFC', '🇳🇿'),
  -- Intercontinental playoff (2 cupos)
  ('Repechaje Intercont. 1', 'PLAYOFF', '🏳️'),
  ('Repechaje Intercont. 2', 'PLAYOFF', '🏳️')
ON CONFLICT (name) DO NOTHING;

-- ===== ADMIN SEED: cédula 0000000 =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cedula TEXT;
  v_name TEXT;
  v_status public.profile_status;
BEGIN
  v_cedula := COALESCE(NEW.raw_user_meta_data ->> 'cedula', '');
  v_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');

  -- El administrador por defecto se reconoce por la cédula 0000000 (se auto-aprueba)
  IF v_cedula = '0000000' THEN
    v_status := 'approved';
  ELSE
    v_status := 'pending';
  END IF;

  INSERT INTO public.profiles (id, cedula, full_name, status)
  VALUES (NEW.id, v_cedula, v_name, v_status);

  -- Asignar rol
  IF v_cedula = '0000000' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  RETURN NEW;
END;
$$;

-- Si ya existe un perfil con cédula 0000000, garantizar que sea admin y approved
DO $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.profiles WHERE cedula = '0000000' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE public.profiles SET status = 'approved' WHERE id = v_id;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
