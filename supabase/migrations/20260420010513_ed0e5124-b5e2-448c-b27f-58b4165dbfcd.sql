
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  p_pred_home INT, p_pred_away INT,
  p_real_home INT, p_real_away INT
) RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_real_home IS NULL OR p_real_away IS NULL THEN
    RETURN 0;
  END IF;
  IF p_pred_home = p_real_home AND p_pred_away = p_real_away THEN
    RETURN 5;
  END IF;
  IF p_pred_home = p_pred_away AND p_real_home = p_real_away THEN
    RETURN 2;
  END IF;
  IF (p_pred_home > p_pred_away AND p_real_home > p_real_away)
     OR (p_pred_home < p_pred_away AND p_real_home < p_real_away) THEN
    RETURN 2;
  END IF;
  RETURN 0;
END;
$$;
