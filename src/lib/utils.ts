import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Devuelve un Date cuyos componentes locales coinciden con los componentes
 * UTC del input. Úsalo cuando quieras mostrar una fecha/hora guardada en la
 * base de datos EXACTAMENTE como se registró, sin convertir a la zona
 * horaria del usuario.
 *
 * Ejemplo: si la BD tiene '2026-06-11 14:00:00+00', al formatear con
 * date-fns verás "14:00" en cualquier zona horaria.
 */
export function asUtcLocal(input: string | Date): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds()
  );
}
