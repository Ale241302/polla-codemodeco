-- ============================================================
-- Migration: restaurar fila id=1 de tournament_result
-- ------------------------------------------------------------
-- Si por error se borró la fila id=1 de public.tournament_result,
-- la función recalculate_bonus_points lee NULL en champion/runner_up
-- y los puntos bonus de todos los usuarios quedan en 0.
-- Esta migración la garantiza idempotentemente.
-- ============================================================

INSERT INTO public.tournament_result (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
