
-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.profile_status AS ENUM ('pending', 'approved', 'rejected', 'blocked');
CREATE TYPE public.match_status AS ENUM ('scheduled', 'live', 'finished');

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cedula TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  status public.profile_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============= USER ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND status = 'approved'
  )
$$;

-- ============= MATCHES =============
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  phase TEXT NOT NULL DEFAULT 'Fase de grupos',
  status public.match_status NOT NULL DEFAULT 'scheduled',
  home_score INT,
  away_score INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- ============= PREDICTIONS =============
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score INT NOT NULL CHECK (home_score >= 0 AND home_score <= 30),
  away_score INT NOT NULL CHECK (away_score >= 0 AND away_score <= 30),
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- ============= BONUS PREDICTIONS =============
CREATE TABLE public.bonus_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  champion TEXT,
  runner_up TEXT,
  champion_points INT NOT NULL DEFAULT 0,
  runner_up_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bonus_predictions ENABLE ROW LEVEL SECURITY;

-- ============= TOURNAMENT RESULT (campeón / subcampeón) =============
CREATE TABLE public.tournament_result (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  champion TEXT,
  runner_up TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_result ENABLE ROW LEVEL SECURITY;

-- ============= TIMESTAMP TRIGGER =============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_predictions_updated BEFORE UPDATE ON public.predictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bonus_updated BEFORE UPDATE ON public.bonus_predictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= AUTO-CREATE PROFILE ON SIGNUP =============
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

  -- Default admin (cedula 1000000000) is auto-approved
  IF v_cedula = '1000000000' THEN
    v_status := 'approved';
  ELSE
    v_status := 'pending';
  END IF;

  INSERT INTO public.profiles (id, cedula, full_name, status)
  VALUES (NEW.id, v_cedula, v_name, v_status);

  -- Assign role
  IF v_cedula = '1000000000' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= POINTS CALCULATION =============
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  p_pred_home INT, p_pred_away INT,
  p_real_home INT, p_real_away INT
) RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_real_home IS NULL OR p_real_away IS NULL THEN
    RETURN 0;
  END IF;
  -- Marcador exacto
  IF p_pred_home = p_real_home AND p_pred_away = p_real_away THEN
    RETURN 5;
  END IF;
  -- Empate correcto
  IF p_pred_home = p_pred_away AND p_real_home = p_real_away THEN
    RETURN 2;
  END IF;
  -- Ganador correcto
  IF (p_pred_home > p_pred_away AND p_real_home > p_real_away)
     OR (p_pred_home < p_pred_away AND p_real_home < p_real_away) THEN
    RETURN 2;
  END IF;
  RETURN 0;
END;
$$;

-- Recalculate all prediction points for a match (admin-only via RLS on caller)
CREATE OR REPLACE FUNCTION public.recalculate_match_points(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_home INT;
  v_away INT;
BEGIN
  SELECT home_score, away_score INTO v_home, v_away
  FROM public.matches WHERE id = p_match_id;

  UPDATE public.predictions
  SET points = public.calculate_prediction_points(home_score, away_score, v_home, v_away)
  WHERE match_id = p_match_id;
END;
$$;

-- Recalculate champion/runner-up bonuses
CREATE OR REPLACE FUNCTION public.recalculate_bonus_points()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_champ TEXT;
  v_runner TEXT;
BEGIN
  SELECT champion, runner_up INTO v_champ, v_runner
  FROM public.tournament_result WHERE id = 1;

  UPDATE public.bonus_predictions
  SET champion_points = CASE WHEN v_champ IS NOT NULL AND champion = v_champ THEN 10 ELSE 0 END,
      runner_up_points = CASE WHEN v_runner IS NOT NULL AND runner_up = v_runner THEN 10 ELSE 0 END;
END;
$$;

-- ============= RLS POLICIES =============

-- profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- matches
CREATE POLICY "Approved users can view matches"
  ON public.matches FOR SELECT
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage matches"
  ON public.matches FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- predictions
CREATE POLICY "Users view own predictions"
  ON public.predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all predictions"
  ON public.predictions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved users insert own predictions before deadline"
  ON public.predictions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_approved(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND m.status = 'scheduled'
        AND m.match_date > now() + interval '3 hours'
    )
  );

CREATE POLICY "Approved users update own predictions before deadline"
  ON public.predictions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND public.is_approved(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id
        AND m.status = 'scheduled'
        AND m.match_date > now() + interval '3 hours'
    )
  );

CREATE POLICY "Admins manage all predictions"
  ON public.predictions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- bonus_predictions
CREATE POLICY "Users view own bonus"
  ON public.bonus_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all bonus"
  ON public.bonus_predictions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved users insert own bonus"
  ON public.bonus_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_approved(auth.uid()));

CREATE POLICY "Approved users update own bonus"
  ON public.bonus_predictions FOR UPDATE
  USING (auth.uid() = user_id AND public.is_approved(auth.uid()));

-- tournament_result
INSERT INTO public.tournament_result (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE POLICY "Approved users view tournament result"
  ON public.tournament_result FOR SELECT
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage tournament result"
  ON public.tournament_result FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============= LEADERBOARD VIEW =============
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id AS user_id,
  p.full_name,
  p.cedula,
  COALESCE((SELECT SUM(points) FROM public.predictions WHERE user_id = p.id), 0)
    + COALESCE((SELECT champion_points + runner_up_points FROM public.bonus_predictions WHERE user_id = p.id), 0)
    AS total_points,
  COALESCE((SELECT COUNT(*) FROM public.predictions WHERE user_id = p.id AND points = 5), 0) AS exact_count,
  COALESCE((SELECT COUNT(*) FROM public.predictions WHERE user_id = p.id AND points = 2), 0) AS partial_count
FROM public.profiles p
WHERE p.status = 'approved';

GRANT SELECT ON public.leaderboard TO authenticated;
