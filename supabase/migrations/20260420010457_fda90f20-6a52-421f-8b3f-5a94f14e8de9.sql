
-- Recreate updated_at function with explicit search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate leaderboard view as security_invoker
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard
WITH (security_invoker = true) AS
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

-- Allow approved users to see basic info of other approved users (needed for leaderboard)
CREATE POLICY "Approved users view approved profiles for leaderboard"
  ON public.profiles FOR SELECT
  USING (
    status = 'approved'
    AND public.is_approved(auth.uid())
  );

-- Allow approved users to see points of other users via leaderboard view
CREATE POLICY "Approved users view all prediction points"
  ON public.predictions FOR SELECT
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users view all bonus points"
  ON public.bonus_predictions FOR SELECT
  USING (public.is_approved(auth.uid()));
