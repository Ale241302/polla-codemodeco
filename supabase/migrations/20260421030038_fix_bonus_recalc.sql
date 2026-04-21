-- ============================================================
-- Migration: endurecer el recálculo de puntos bonus
-- ------------------------------------------------------------
-- Esta migración arregla el caso en que al guardar el campeón/subcampeón
-- en el panel admin, los puntos bonus no se aplican a los usuarios.
--
-- Causas posibles que cubre:
--   1) La fila id=1 de public.tournament_result nunca existió (un
--      UPDATE sobre ella afecta 0 filas silenciosamente y la función
--      queda leyendo NULL).
--   2) Falta GRANT EXECUTE a los roles anon/authenticated para poder
--      invocar la función desde supabase.rpc().
--   3) La función antigua no deja rastro cuando algo no calza; la
--      nueva versión devuelve un JSON con el detalle (total de filas
--      revisadas, cuántos aciertan campeón y cuántos subcampeón) y
--      además emite NOTICE con los valores que leyó.
-- ============================================================

-- 1) Garantizar la fila id=1 (idempotente).
INSERT INTO public.tournament_result (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 2) Reemplazar la función de recálculo por una versión que:
--    - sigue siendo SECURITY DEFINER (para saltar la RLS de update en
--      bonus_predictions, que solo permite que cada usuario actualice
--      su propia fila);
--    - devuelve JSONB con el conteo, para diagnóstico;
--    - emite NOTICE con los nombres leídos del torneo.
CREATE OR REPLACE FUNCTION public.recalculate_bonus_points()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_champ  TEXT;
  v_runner TEXT;
  v_total  INT;
  v_champ_hits  INT;
  v_runner_hits INT;
BEGIN
  SELECT champion, runner_up INTO v_champ, v_runner
  FROM public.tournament_result
  WHERE id = 1;

  RAISE NOTICE 'recalculate_bonus_points: champion=%, runner_up=%', v_champ, v_runner;

  UPDATE public.bonus_predictions
  SET champion_points  = CASE WHEN v_champ  IS NOT NULL AND champion  = v_champ  THEN 10 ELSE 0 END,
      runner_up_points = CASE WHEN v_runner IS NOT NULL AND runner_up = v_runner THEN 10 ELSE 0 END;

  SELECT
    COUNT(*)                                     ,
    COUNT(*) FILTER (WHERE champion_points  > 0) ,
    COUNT(*) FILTER (WHERE runner_up_points > 0)
  INTO v_total, v_champ_hits, v_runner_hits
  FROM public.bonus_predictions;

  RETURN jsonb_build_object(
    'total_bonus_rows', v_total,
    'champion_hits',    v_champ_hits,
    'runner_up_hits',   v_runner_hits,
    'champion',         v_champ,
    'runner_up',        v_runner
  );
END;
$$;

-- 3) GRANTs explícitos. Por defecto PostgreSQL concede EXECUTE a PUBLIC,
--    pero en proyectos Supabase recientes se puede revocar. Dejamos el
--    permiso explícito para que supabase.rpc() desde el navegador funcione
--    con la sesión del admin (rol authenticated).
REVOKE ALL ON FUNCTION public.recalculate_bonus_points() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_bonus_points() TO authenticated, service_role;

-- También aseguramos el execute en recalculate_match_points, por consistencia.
GRANT EXECUTE ON FUNCTION public.recalculate_match_points(UUID) TO authenticated, service_role;
