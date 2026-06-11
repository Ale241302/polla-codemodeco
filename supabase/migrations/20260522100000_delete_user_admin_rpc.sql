-- Elimina un usuario completamente desde el dashboard de admin
CREATE OR REPLACE FUNCTION public.delete_user_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario que llama la función tiene rol 'admin'
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'No tienes permisos de administrador para realizar esta acción';
  END IF;

  -- Eliminar al usuario de auth.users (esto debería hacer CASCADE a profiles y user_roles 
  -- si las llaves foráneas están configuradas con ON DELETE CASCADE, si no, se eliminan acá también)
  DELETE FROM auth.users WHERE id = target_user_id;

END;
$$;
