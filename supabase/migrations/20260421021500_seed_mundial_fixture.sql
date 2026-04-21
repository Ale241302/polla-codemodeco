-- ============================================================
-- Migration: seed Mundial 2026 fixture (104 matches)
-- Fuente: polla_mundial_2026_70_FINAL.xlsx / hoja "🎯 Predicciones"
--   Columnas importadas: fecha, fase, local, visita, GL real, GV real
--   Hora de kickoff por defecto: 18:00:00 UTC (editable desde panel admin)
--   Status inicial: 'scheduled' (el admin lo cambia a 'finished' con los
--   resultados reales; los marcadores pre-cargados son ejemplos del Excel
--   que el admin puede actualizar cuando jueguen los partidos).
-- ============================================================

-- ===== 1) Equipos faltantes (los otros ya están en la migración 4) =====
INSERT INTO public.teams (name, confederation, flag_emoji) VALUES
  ('Sudáfrica', 'CAF', '🇿🇦'),
  ('República Checa', 'UEFA', '🇨🇿'),
  ('Bosnia y Herzegovina', 'UEFA', '🇧🇦'),
  ('Escocia', 'UEFA', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'),
  ('Suecia', 'UEFA', '🇸🇪'),
  ('Cabo Verde', 'CAF', '🇨🇻'),
  ('RD del Congo', 'CAF', '🇨🇩'),
  ('Curazao', 'CONCACAF', '🇨🇼'),
  ('Haití', 'CONCACAF', '🇭🇹'),
  ('Jordania', 'AFC', '🇯🇴')
ON CONFLICT (name) DO NOTHING;

-- ===== 2) Partidos =====
-- Idempotente: si ya hay 100+ partidos cargados, no reinserta.
-- Si hay menos (p. ej. partidos de prueba), los borra y re-carga los 104.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.matches) >= 100 THEN
    RAISE NOTICE 'Ya hay % partidos cargados, no se sobreescriben',
      (SELECT COUNT(*) FROM public.matches);
    RETURN;
  END IF;

  -- Limpia posibles partidos de prueba previos (esto también borra predictions
  -- asociadas por ON DELETE CASCADE, así que solo es seguro si aún no hay apuestas reales)
  DELETE FROM public.matches;

  INSERT INTO public.matches (home_team, away_team, match_date, phase, status, home_score, away_score) VALUES
  ('México', 'Sudáfrica', '2026-06-11 18:00:00+00'::timestamptz, 'Grupo A', 'scheduled', 1, 1),
  ('Corea del Sur', 'República Checa', '2026-06-11 18:00:00+00'::timestamptz, 'Grupo A', 'scheduled', 2, 3),
  ('Canadá', 'Bosnia y Herzegovina', '2026-06-12 18:00:00+00'::timestamptz, 'Grupo B', 'scheduled', 1, 2),
  ('Estados Unidos', 'Paraguay', '2026-06-12 18:00:00+00'::timestamptz, 'Grupo D', 'scheduled', 4, 0),
  ('Qatar', 'Suiza', '2026-06-13 18:00:00+00'::timestamptz, 'Grupo B', 'scheduled', 1, 5),
  ('Brasil', 'Marruecos', '2026-06-13 18:00:00+00'::timestamptz, 'Grupo C', 'scheduled', 2, 1),
  ('Haití', 'Escocia', '2026-06-13 18:00:00+00'::timestamptz, 'Grupo C', 'scheduled', 5, 5),
  ('Australia', 'Turquía', '2026-06-13 18:00:00+00'::timestamptz, 'Grupo D', 'scheduled', 0, 2),
  ('Alemania', 'Curazao', '2026-06-14 18:00:00+00'::timestamptz, 'Grupo E', 'scheduled', 3, 0),
  ('Países Bajos', 'Japón', '2026-06-14 18:00:00+00'::timestamptz, 'Grupo F', 'scheduled', 3, 4),
  ('Costa de Marfil', 'Ecuador', '2026-06-14 18:00:00+00'::timestamptz, 'Grupo E', 'scheduled', 2, 2),
  ('Suecia', 'Túnez', '2026-06-14 18:00:00+00'::timestamptz, 'Grupo F', 'scheduled', 4, 3),
  ('España', 'Cabo Verde', '2026-06-15 18:00:00+00'::timestamptz, 'Grupo H', 'scheduled', 0, 4),
  ('Bélgica', 'Egipto', '2026-06-15 18:00:00+00'::timestamptz, 'Grupo G', 'scheduled', 5, 1),
  ('Arabia Saudita', 'Uruguay', '2026-06-15 18:00:00+00'::timestamptz, 'Grupo H', 'scheduled', 5, 4),
  ('Irán', 'Nueva Zelanda', '2026-06-15 18:00:00+00'::timestamptz, 'Grupo G', 'scheduled', 4, 5),
  ('Francia', 'Senegal', '2026-06-16 18:00:00+00'::timestamptz, 'Grupo I', 'scheduled', 3, 4),
  ('Irak', 'Noruega', '2026-06-16 18:00:00+00'::timestamptz, 'Grupo I', 'scheduled', 5, 3),
  ('Argentina', 'Argelia', '2026-06-16 18:00:00+00'::timestamptz, 'Grupo J', 'scheduled', 0, 1),
  ('Austria', 'Jordania', '2026-06-16 18:00:00+00'::timestamptz, 'Grupo J', 'scheduled', 0, 1),
  ('Portugal', 'RD del Congo', '2026-06-17 18:00:00+00'::timestamptz, 'Grupo K', 'scheduled', 3, 5),
  ('Inglaterra', 'Croacia', '2026-06-17 18:00:00+00'::timestamptz, 'Grupo L', 'scheduled', 3, 4),
  ('Ghana', 'Panamá', '2026-06-17 18:00:00+00'::timestamptz, 'Grupo L', 'scheduled', 3, 0),
  ('Uzbekistán', 'Colombia', '2026-06-17 18:00:00+00'::timestamptz, 'Grupo K', 'scheduled', 2, 1),
  ('República Checa', 'Sudáfrica', '2026-06-18 18:00:00+00'::timestamptz, 'Grupo A', 'scheduled', 4, 3),
  ('Suiza', 'Bosnia y Herzegovina', '2026-06-18 18:00:00+00'::timestamptz, 'Grupo B', 'scheduled', 0, 0),
  ('Canadá', 'Qatar', '2026-06-18 18:00:00+00'::timestamptz, 'Grupo B', 'scheduled', 3, 0),
  ('México', 'Corea del Sur', '2026-06-18 18:00:00+00'::timestamptz, 'Grupo A', 'scheduled', 5, 4),
  ('Estados Unidos', 'Australia', '2026-06-19 18:00:00+00'::timestamptz, 'Grupo D', 'scheduled', 2, 0),
  ('Escocia', 'Marruecos', '2026-06-19 18:00:00+00'::timestamptz, 'Grupo C', 'scheduled', 3, 2),
  ('Brasil', 'Haití', '2026-06-19 18:00:00+00'::timestamptz, 'Grupo C', 'scheduled', 2, 0),
  ('Turquía', 'Paraguay', '2026-06-19 18:00:00+00'::timestamptz, 'Grupo D', 'scheduled', 1, 5),
  ('Países Bajos', 'Suecia', '2026-06-20 18:00:00+00'::timestamptz, 'Grupo F', 'scheduled', 5, 0),
  ('Alemania', 'Costa de Marfil', '2026-06-20 18:00:00+00'::timestamptz, 'Grupo E', 'scheduled', 1, 0),
  ('Ecuador', 'Curazao', '2026-06-20 18:00:00+00'::timestamptz, 'Grupo E', 'scheduled', 5, 5),
  ('Túnez', 'Japón', '2026-06-20 18:00:00+00'::timestamptz, 'Grupo F', 'scheduled', 5, 4),
  ('España', 'Arabia Saudita', '2026-06-21 18:00:00+00'::timestamptz, 'Grupo H', 'scheduled', 2, 0),
  ('Bélgica', 'Irán', '2026-06-21 18:00:00+00'::timestamptz, 'Grupo G', 'scheduled', 4, 5),
  ('Uruguay', 'Cabo Verde', '2026-06-21 18:00:00+00'::timestamptz, 'Grupo H', 'scheduled', 0, 5),
  ('Nueva Zelanda', 'Egipto', '2026-06-21 18:00:00+00'::timestamptz, 'Grupo G', 'scheduled', 4, 1),
  ('Argentina', 'Austria', '2026-06-22 18:00:00+00'::timestamptz, 'Grupo J', 'scheduled', 2, 0),
  ('Francia', 'Irak', '2026-06-22 18:00:00+00'::timestamptz, 'Grupo I', 'scheduled', 3, 3),
  ('Noruega', 'Senegal', '2026-06-22 18:00:00+00'::timestamptz, 'Grupo I', 'scheduled', 0, 2),
  ('Jordania', 'Argelia', '2026-06-22 18:00:00+00'::timestamptz, 'Grupo J', 'scheduled', 0, 0),
  ('Portugal', 'Uzbekistán', '2026-06-23 18:00:00+00'::timestamptz, 'Grupo K', 'scheduled', 3, 3),
  ('Inglaterra', 'Ghana', '2026-06-23 18:00:00+00'::timestamptz, 'Grupo L', 'scheduled', 0, 1),
  ('Panamá', 'Croacia', '2026-06-23 18:00:00+00'::timestamptz, 'Grupo L', 'scheduled', 2, 2),
  ('Colombia', 'RD del Congo', '2026-06-23 18:00:00+00'::timestamptz, 'Grupo K', 'scheduled', 1, 4),
  ('Suiza', 'Canadá', '2026-06-24 18:00:00+00'::timestamptz, 'Grupo B', 'scheduled', 2, 4),
  ('Bosnia y Herzegovina', 'Qatar', '2026-06-24 18:00:00+00'::timestamptz, 'Grupo B', 'scheduled', 1, 1),
  ('Marruecos', 'Haití', '2026-06-24 18:00:00+00'::timestamptz, 'Grupo C', 'scheduled', 2, 3),
  ('Brasil', 'Escocia', '2026-06-24 18:00:00+00'::timestamptz, 'Grupo C', 'scheduled', 0, 0),
  ('Sudáfrica', 'Corea del Sur', '2026-06-24 18:00:00+00'::timestamptz, 'Grupo A', 'scheduled', 4, 4),
  ('República Checa', 'México', '2026-06-24 18:00:00+00'::timestamptz, 'Grupo A', 'scheduled', 1, 2),
  ('Curazao', 'Costa de Marfil', '2026-06-25 18:00:00+00'::timestamptz, 'Grupo E', 'scheduled', 0, 2),
  ('Ecuador', 'Alemania', '2026-06-25 18:00:00+00'::timestamptz, 'Grupo E', 'scheduled', 3, 5),
  ('Japón', 'Suecia', '2026-06-25 18:00:00+00'::timestamptz, 'Grupo F', 'scheduled', 2, 4),
  ('Túnez', 'Países Bajos', '2026-06-25 18:00:00+00'::timestamptz, 'Grupo F', 'scheduled', 3, 4),
  ('Paraguay', 'Australia', '2026-06-25 18:00:00+00'::timestamptz, 'Grupo D', 'scheduled', 4, 3),
  ('Turquía', 'Estados Unidos', '2026-06-25 18:00:00+00'::timestamptz, 'Grupo D', 'scheduled', 4, 0),
  ('Noruega', 'Francia', '2026-06-26 18:00:00+00'::timestamptz, 'Grupo I', 'scheduled', 1, 4),
  ('Senegal', 'Irak', '2026-06-26 18:00:00+00'::timestamptz, 'Grupo I', 'scheduled', 1, 3),
  ('Cabo Verde', 'Arabia Saudita', '2026-06-26 18:00:00+00'::timestamptz, 'Grupo H', 'scheduled', 0, 0),
  ('Uruguay', 'España', '2026-06-26 18:00:00+00'::timestamptz, 'Grupo H', 'scheduled', 0, 5),
  ('Egipto', 'Irán', '2026-06-26 18:00:00+00'::timestamptz, 'Grupo G', 'scheduled', 2, 1),
  ('Nueva Zelanda', 'Bélgica', '2026-06-26 18:00:00+00'::timestamptz, 'Grupo G', 'scheduled', 2, 5),
  ('Croacia', 'Ghana', '2026-06-27 18:00:00+00'::timestamptz, 'Grupo L', 'scheduled', 4, 2),
  ('Panamá', 'Inglaterra', '2026-06-27 18:00:00+00'::timestamptz, 'Grupo L', 'scheduled', 3, 2),
  ('Colombia', 'Portugal', '2026-06-27 18:00:00+00'::timestamptz, 'Grupo K', 'scheduled', 3, 5),
  ('RD del Congo', 'Uzbekistán', '2026-06-27 18:00:00+00'::timestamptz, 'Grupo K', 'scheduled', 1, 3),
  ('Argelia', 'Austria', '2026-06-27 18:00:00+00'::timestamptz, 'Grupo J', 'scheduled', 1, 1),
  ('Jordania', 'Argentina', '2026-06-27 18:00:00+00'::timestamptz, 'Grupo J', 'scheduled', 1, 3),
  ('2° Grupo A', '2° Grupo B', '2026-06-28 18:00:00+00'::timestamptz, '16avos P73', 'scheduled', 0, 0),
  ('1° Grupo E', '3° Gpo A/B/C/D/F', '2026-06-29 18:00:00+00'::timestamptz, '16avos P74', 'scheduled', 0, 0),
  ('1° Grupo F', '2° Grupo C', '2026-06-29 18:00:00+00'::timestamptz, '16avos P75', 'scheduled', 0, 0),
  ('1° Grupo E', '2° Grupo F', '2026-06-29 18:00:00+00'::timestamptz, '16avos P76', 'scheduled', 0, 0),
  ('1° Grupo I', '3° Gpo C/D/F/G/H', '2026-06-30 18:00:00+00'::timestamptz, '16avos P77', 'scheduled', 0, 0),
  ('2° Grupo E', '2° Grupo I', '2026-06-30 18:00:00+00'::timestamptz, '16avos P78', 'scheduled', 0, 0),
  ('1° Grupo A', '3° Gpo C/E/F/H/I', '2026-06-30 18:00:00+00'::timestamptz, '16avos P79', 'scheduled', 0, 0),
  ('1° Grupo L', '3° Gpo E/H/I/J/K', '2026-07-01 18:00:00+00'::timestamptz, '16avos P80', 'scheduled', 0, 0),
  ('1° Grupo D', '3° Gpo B/E/F/I/J', '2026-07-01 18:00:00+00'::timestamptz, '16avos P81', 'scheduled', 0, 0),
  ('1° Grupo G', '3° Gpo A/E/H/I/J', '2026-07-01 18:00:00+00'::timestamptz, '16avos P82', 'scheduled', 0, 0),
  ('2° Grupo K', '2° Grupo L', '2026-07-02 18:00:00+00'::timestamptz, '16avos P83', 'scheduled', 0, 0),
  ('1° Grupo H', '2° Grupo J', '2026-07-02 18:00:00+00'::timestamptz, '16avos P84', 'scheduled', 0, 0),
  ('1° Grupo B', '3° Gpo E/F/G/I/J', '2026-07-02 18:00:00+00'::timestamptz, '16avos P85', 'scheduled', 0, 0),
  ('1° Grupo J', '2° Grupo H', '2026-07-03 18:00:00+00'::timestamptz, '16avos P86', 'scheduled', 0, 0),
  ('1° Grupo K', '3° Gpo D/E/I/J/L', '2026-07-03 18:00:00+00'::timestamptz, '16avos P87', 'scheduled', 0, 0),
  ('2° Grupo D', '2° Grupo G', '2026-07-03 18:00:00+00'::timestamptz, '16avos P88', 'scheduled', 0, 0),
  ('Gan. P74', 'Gan. P77', '2026-07-04 18:00:00+00'::timestamptz, 'Octavos P89', 'scheduled', 0, 0),
  ('Gan. P73', 'Gan. P75', '2026-07-04 18:00:00+00'::timestamptz, 'Octavos P90', 'scheduled', 0, 0),
  ('Gan. P76', 'Gan. P78', '2026-07-05 18:00:00+00'::timestamptz, 'Octavos P91', 'scheduled', 0, 0),
  ('Gan. P79', 'Gan. P80', '2026-07-05 18:00:00+00'::timestamptz, 'Octavos P92', 'scheduled', 0, 0),
  ('Gan. P83', 'Gan. P84', '2026-07-06 18:00:00+00'::timestamptz, 'Octavos P93', 'scheduled', 0, 0),
  ('Gan. P81', 'Gan. P82', '2026-07-06 18:00:00+00'::timestamptz, 'Octavos P94', 'scheduled', 0, 0),
  ('Gan. P86', 'Gan. P88', '2026-07-07 18:00:00+00'::timestamptz, 'Octavos P95', 'scheduled', 0, 0),
  ('Gan. P85', 'Gan. P87', '2026-07-07 18:00:00+00'::timestamptz, 'Octavos P96', 'scheduled', 0, 0),
  ('Gan. P89', 'Gan. P90', '2026-07-09 18:00:00+00'::timestamptz, 'Cuartos P97', 'scheduled', 0, 0),
  ('Gan. P93', 'Gan. P94', '2026-07-10 18:00:00+00'::timestamptz, 'Cuartos P98', 'scheduled', 0, 0),
  ('Gan. P91', 'Gan. P92', '2026-07-11 18:00:00+00'::timestamptz, 'Cuartos P99', 'scheduled', 0, 0),
  ('Gan. P95', 'Gan. P96', '2026-07-11 18:00:00+00'::timestamptz, 'Cuartos P100', 'scheduled', 0, 0),
  ('Gan. P97', 'Gan. P98', '2026-07-14 18:00:00+00'::timestamptz, 'Semifinal P101', 'scheduled', 0, 0),
  ('Gan. P99', 'Gan. P100', '2026-07-15 18:00:00+00'::timestamptz, 'Semifinal P102', 'scheduled', 0, 0),
  ('Per. P101', 'Per. P102', '2026-07-18 18:00:00+00'::timestamptz, 'Tercer Puesto', 'scheduled', 0, 0),
  ('Gan. P101', 'Gan. P102', '2026-07-19 18:00:00+00'::timestamptz, '🏆 FINAL', 'scheduled', 0, 0);
END $$;

-- ===== 3) Verificación =====
SELECT phase, COUNT(*) AS partidos
FROM public.matches
GROUP BY phase
ORDER BY MIN(match_date);
