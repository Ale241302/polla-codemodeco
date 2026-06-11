-- ============================================================
-- Migration: recover password via identity card (cédula)
-- Permite validar si una cédula existe y restablecer la
-- contraseña directamente en auth.users sin enviar correos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_cedula_exists(p_cedula text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE cedula = p_cedula
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_password_by_cedula(p_cedula text, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Obtener el ID del usuario desde profiles
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE cedula = p_cedula
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Actualizar la contraseña en auth.users usando el hashing crypt con gen_salt
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

-- Otorgar permisos de ejecución a los roles anon y authenticated para que puedan ser llamadas por el cliente
GRANT EXECUTE ON FUNCTION public.check_cedula_exists(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_password_by_cedula(text, text) TO anon, authenticated, service_role;
