# Polla Mundial Codemodeco 2026

Plataforma web privada para la Polla Mundial Codemodeco 2026. Los usuarios se registran, son aprobados por un administrador, ingresan sus predicciones de marcadores (hasta 3 horas antes del partido) y compiten en una tabla de posiciones en tiempo real.

## Stack

- **Frontend:** React 19 + TanStack Router/Start + Tailwind CSS + shadcn/ui
- **Backend/DB:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Deploy:** Vercel (Nitro preset) — también compatible con Cloudflare Workers
- **Build:** Vite + TypeScript

## Funcionalidades

- Registro con cédula única, nombre y contraseña (bcrypt lo maneja Supabase Auth).
- Estado inicial `pending`; el admin aprueba/rechaza/bloquea.
- Login con cédula + contraseña (solo usuarios aprobados).
- Predicciones editables hasta **3 horas antes** del partido (doble cierre: cliente + RLS).
- Puntaje automático: marcador exacto = 5 pts, ganador/empate correcto = 2 pts (no acumulable).
- Bonus: +10 pts al campeón + 10 pts al subcampeón.
- Panel admin: gestión de usuarios, partidos, resultados y recálculo forzado.
- Tabla de posiciones con TOP 4 destacado y polling cada 30 s.
- Alerta automática si hay partidos cerrando en las próximas 6 horas sin predicción.
- 48 equipos del Mundial 2026 precargados para selección en dropdowns.
- Responsive mobile-first con la identidad visual Codemodeco.

## 1. Instalación local

### Requisitos

- Node.js 20+ (o Bun)
- Cuenta en [Supabase](https://supabase.com)
- Opcional: Supabase CLI para aplicar migraciones desde consola

### Pasos

```bash
# 1. Instalar dependencias
npm install --legacy-peer-deps
# o: bun install

# 2. Copiar variables de entorno
cp .env.example .env
# Edita .env y reemplaza los valores con los de tu proyecto Supabase
#   (Settings → API → Project URL y anon/public key)

# 3. Aplicar migraciones a Supabase (ver sección 2)

# 4. Correr en modo desarrollo
npm run dev
# Abre http://localhost:5173
```

## 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia la URL y la `anon/publishable key` a tu archivo `.env`.
3. Aplica las migraciones en orden:

**Opción A — Supabase CLI**

```bash
npx supabase link --project-ref TU_PROYECTO
npx supabase db push
```

**Opción B — SQL Editor en el dashboard de Supabase**

Abre cada archivo en `supabase/migrations/` y ejecútalos en orden cronológico:

1. `20260420010437_*.sql` — schema, tablas, RLS, triggers, scoring
2. `20260420010457_*.sql` — vista leaderboard + políticas extra
3. `20260420010513_*.sql` — recálculo con `search_path`
4. `20260420195900_teams_and_admin_cedula.sql` — tabla `teams` + 48 equipos + admin cédula `0000000`

4. En **Authentication → Settings**, desactiva "Confirm email" durante pruebas (los usuarios usan un email sintético `CEDULA@polla.codemodeco.local` generado por la app).

## 3. Crear el administrador

El trigger `handle_new_user` auto-aprueba y asigna rol `admin` a cualquier cuenta registrada con cédula `0000000`.

1. Inicia la app (`npm run dev`).
2. Ve a `/register` y registra:
   - **Cédula:** `0000000`
   - **Nombre:** el que quieras (ej. "Administrador")
   - **Contraseña:** `admin123` (o la que prefieras, mínimo 6 caracteres)
3. Al terminar, inicia sesión con esa cédula y contraseña.
4. Verás el botón **Admin** en la barra superior con acceso al panel.

> **Importante:** cambia la contraseña del admin después del primer login (desde el panel de Supabase, tabla `auth.users`).

## 4. Estructura de base de datos

Todas las tablas viven en el schema `public` con Row Level Security activado.

| Tabla | Descripción |
|---|---|
| `profiles` | Datos del usuario (cedula única, nombre, estado pending/approved/rejected/blocked). 1-a-1 con `auth.users`. |
| `user_roles` | Roles del usuario (`admin` o `user`). Separado por seguridad (evita recursión RLS). |
| `teams` | 48 selecciones del Mundial 2026: nombre, confederación, bandera emoji, grupo. |
| `matches` | Partidos: equipos, fecha, fase, estado (scheduled/live/finished), marcador real. |
| `predictions` | Predicción de cada usuario por partido. Único por (user_id, match_id). Guarda puntos calculados. |
| `bonus_predictions` | Campeón y subcampeón predichos por el usuario + puntos bonus. |
| `tournament_result` | Campeón y subcampeón reales (fila única id=1). |
| `leaderboard` (vista) | Suma `predictions.points + bonus.champion_points + bonus.runner_up_points` por usuario aprobado. |

### Funciones importantes

- `calculate_prediction_points(pred_h, pred_a, real_h, real_a)` — devuelve 5 / 2 / 0 según la regla.
- `recalculate_match_points(match_id)` — actualiza todas las predicciones del partido.
- `recalculate_bonus_points()` — actualiza `champion_points` y `runner_up_points` comparando con `tournament_result`.
- `handle_new_user()` — trigger que al crearse un usuario en `auth.users` inserta su perfil y rol; auto-aprueba la cédula `0000000` como admin.

### Políticas RLS destacadas

- Las predicciones solo pueden insertarse o actualizarse si faltan **más de 3 horas** para el partido y el estado es `scheduled` — definido a nivel de base de datos, no solo del cliente.
- Los usuarios solo ven su propio perfil, pero todos los aprobados ven el leaderboard.
- Solo admins pueden crear partidos, ingresar resultados y modificar cualquier perfil.

## 5. Deploy

El proyecto incluye un post-build (`scripts/build-vercel.mjs`) que genera `.vercel/output/` (Vercel Build Output API v3): servicio estático de `dist/client/` + una función serverless `__ssr` que envuelve el handler SSR de TanStack Start y bundlea todas las dependencias con esbuild.

### Subir a GitHub (común a ambos)

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/polla-codemodeco.git
git push -u origin main
```

### Opción A — Vercel

1. Ve a [vercel.com/new](https://vercel.com/new) e importa el repo.
2. En **Framework Preset** elige `Other` (no Next.js ni Vite).
3. Añade las **Environment Variables**:

   | Variable | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | tu URL de Supabase |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | tu anon key |
   | `VITE_SUPABASE_PROJECT_ID` | tu ref de proyecto |
   | `SUPABASE_URL` | igual que VITE_SUPABASE_URL |
   | `SUPABASE_PUBLISHABLE_KEY` | igual que la anon key |

4. **Deploy**. Vercel ejecutará `npm run build`, que a su vez corre `vite build && node scripts/build-vercel.mjs`. El script produce `.vercel/output/` y Vercel lo detecta automáticamente.

### Opción B — Cloudflare Workers (sin cambios de código)

El scaffold ya está listo para Cloudflare. Solo necesitas:

1. Instalar wrangler: `npm i -g wrangler`
2. Autenticar: `wrangler login`
3. Añadir los secretos de Supabase:
   ```bash
   wrangler secret put VITE_SUPABASE_URL
   wrangler secret put VITE_SUPABASE_PUBLISHABLE_KEY
   wrangler secret put SUPABASE_URL
   wrangler secret put SUPABASE_PUBLISHABLE_KEY
   ```
4. Desplegar: `npm run build && wrangler deploy`

### Configuración en Supabase (ambas opciones)

En **Supabase → Authentication → URL Configuration**, añade la URL del deploy (`https://tu-app.vercel.app` o `https://tu-app.workers.dev`) en:

- **Site URL**
- **Redirect URLs**

### Verificar

- Abre la URL desplegada — ves el logo Codemodeco y el call-to-action.
- Registra la cédula `0000000` como admin, o registra usuarios de prueba y apruébalos desde el panel.

## 6. Scripts útiles

```bash
npm run dev       # desarrollo local (HMR)
npm run build     # build de producción (Nitro + Vite)
npm run preview   # preview del build
npm run lint      # ESLint
npm run format    # Prettier
```

## 7. Seguridad

- Contraseñas hasheadas por Supabase Auth (bcrypt, salt único por usuario).
- **Row Level Security** en todas las tablas: las reglas de negocio (3h, solo aprobados, etc.) se aplican en la DB, no solo en el cliente.
- La `service_role_key` **nunca** se expone al navegador; solo se usa en código servidor y es opcional.
- Sesiones gestionadas por Supabase (JWT) con refresh automático.
- Validación de formularios con Zod antes de enviar al servidor.

## 8. Estructura del proyecto

```
polla-codemodeco/
├── public/                       # estáticos (si necesitas)
├── src/
│   ├── assets/
│   │   └── codemodeco-logo.png   # logo institucional
│   ├── components/
│   │   ├── AppHeader.tsx         # navegación superior (logo + links + logout)
│   │   ├── Logo.tsx              # componente del logo PNG
│   │   └── ui/                   # shadcn/ui (Button, Card, Input, Select, Tabs…)
│   ├── integrations/supabase/
│   │   ├── client.ts             # cliente del navegador (anon key)
│   │   ├── client.server.ts      # cliente servidor (service role, opcional)
│   │   ├── auth-middleware.ts    # middleware TanStack Start
│   │   └── types.ts              # tipos auto-generados
│   ├── lib/
│   │   ├── auth-context.tsx      # AuthProvider + useAuth + cedulaToEmail
│   │   └── utils.ts
│   ├── routes/
│   │   ├── __root.tsx            # layout raíz + toaster
│   │   ├── index.tsx             # landing pública
│   │   ├── login.tsx             # /login
│   │   ├── register.tsx          # /register
│   │   ├── pending.tsx           # /pending (cuenta pendiente/rechazada/bloqueada)
│   │   ├── dashboard.tsx         # /dashboard (predicciones + bonus + partidos)
│   │   ├── leaderboard.tsx       # /leaderboard (TOP 4 + tabla general)
│   │   └── admin.tsx             # /admin (usuarios, partidos, resultados)
│   ├── router.tsx
│   └── styles.css
├── supabase/
│   └── migrations/               # 4 migraciones en orden cronológico
├── scripts/
│   └── build-vercel.mjs          # post-build: genera .vercel/output/ (Build Output API v3)
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vercel.json                   # config de deploy
├── vite.config.ts
└── README.md
```

## 9. Créditos

Construido para Cooperativa Codemodeco · Mundial 2026.
