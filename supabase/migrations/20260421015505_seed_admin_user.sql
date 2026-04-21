-- ============================================================
-- Migration: seed admin user (cedula 0000000, password admin123)
-- Crea el usuario administrador directamente en auth.users
-- sin pasar por el flujo de signup y SIN enviar correos.
-- El trigger handle_new_user se encarga de crear el perfil (approved)
-- y asignar el rol 'admin' al detectar cédula '0000000'.
-- Después del primer login, cambia la contraseña en la tabla auth.users
-- o desde el panel de Supabase.
-- ============================================================

DO $$
DECLARE
  v_user_id    UUID := gen_random_uuid();
  v_email      TEXT := '0000000@polla.codemodeco.local';
  v_password   TEXT := 'admin123';
  v_cedula     TEXT := '0000000';
  v_full_name  TEXT := 'Administrador';
  v_existing   UUID;
BEGIN
  -- Si ya existe un usuario con esa cédula o ese email, no lo creamos de nuevo.
  SELECT id INTO v_existing
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RAISE NOTICE 'Admin ya existe con id %, no se recrea', v_existing;
    -- Garantizar que el perfil esté aprobado y con rol admin
    UPDATE public.profiles SET status = 'approved' WHERE id = v_existing;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_existing, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN;
  END IF;

  -- Inserta el usuario en auth.users
  -- email_confirmed_at = now() => NO se envía correo de confirmación
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    jsonb_build_object('cedula', v_cedula, 'full_name', v_full_name),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Inserta la identidad asociada (necesaria para que Supabase permita login)
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );

  -- El trigger handle_new_user ya debió crear el perfil con status='approved'
  -- y rol 'admin' porque la cédula es '0000000'. Reforzamos por si acaso.
  UPDATE public.profiles SET status = 'approved' WHERE id = v_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Admin creado con id %', v_user_id;
END $$;

-- Verificación (debería devolver una fila)
SELECT p.cedula, p.full_name, p.status, r.role
FROM public.profiles p
LEFT JOIN public.user_roles r ON r.user_id = p.id
WHERE p.cedula = '0000000';
