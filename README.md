# FraguaGo Web (Frontend Dashboard)

Next.js 14 dashboard para gestión de gimnasios. Conecta con la API de FraguaGo.

## Instalación

```bash
npm install
```

## Configuración

Copia `.env.local.example` a `.env.local`:

```bash
cp .env.local.example .env.local
```

Asegúrate de que apunta a tu API:

```
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

(En producción, usa la URL pública de tu API en Render/Vercel)

## Desarrollo

```bash
npm run dev
```

Abre http://localhost:3000

## Compilación

```bash
npm run build
npm run start
```

## Modo offline

La app sigue funcionando si el gimnasio se queda sin internet:

- **Sin conexión se puede**: consultar socios, planes, membresías y rutinas ya
  descargados; marcar entradas; dar de alta socios (datos, ficha médica y
  contacto de emergencia).
- **Kiosko público** (`/check-in/<slug>`): sin conexión guarda cédula y hora
  "a ciegas" (`kiosk.ts`) y el API las valida al recibirlas. Las que rechaza
  aparecen en Asistencia como «Entradas del kiosko sin confirmar».
- **Requiere conexión**: pagos, asignar o renovar membresías, ventas, reportes,
  importaciones, IA e inicio de sesión.

Cómo está hecho (todo en `lib/offline/`):

| Pieza | Archivo | Qué hace |
| --- | --- | --- |
| Base local | `db.ts` | IndexedDB (Dexie), una base por gimnasio + usuario |
| Conexión | `connectivity.ts` | Eventos del navegador + sondeo a `/api/health` |
| Cola | `outbox.ts` | Operaciones pendientes; su `id` es la clave de idempotencia |
| Sincronización | `sync-engine.ts`, `sync.ts` | Envía la cola a `POST /api/sync/operations` |
| Lecturas | `resources.ts` | `listResource` / `getResource`: API con copia local |
| Dominio | `attendance.ts`, `members.ts` | Check-in y alta de socios |

El service worker (`public/sw.js`) guarda solo el HTML y los estáticos; nunca
respuestas de `/api`. Se registra en producción (`NEXT_PUBLIC_ENABLE_SW=true`
para probarlo en desarrollo).

Para que un recurso nuevo se pueda leer sin conexión: agrégalo a `CACHEABLE`
en `resources.ts` y léelo con `listResource` / `getResource`.

```bash
pnpm test   # pruebas de la cola y la sincronización
```

## Características

- ✅ Login con Bearer token
- ✅ Dashboard con KPIs
- ✅ Gestión de socios
- ✅ Fichas médicas
- ✅ Medicamentos y contactos de emergencia
- ✅ Objetivos de entrenamiento
- ✅ Registro de pagos
- ✅ Control de asistencia
- ✅ Finanzas
- ✅ Membresías
- ✅ Y mucho más…

## Stack

- Next.js 14 (App Router)
- TypeScript
- CSS vanilla (sin tailwind, sin componentes)
- Fetch API nativa

## Estructura

```
app/
├─ (dashboard)/     — Rutas protegidas
│  ├─ dashboard/    — Panel principal
│  ├─ members/      — Gestión de socios
│  ├─ health/       — Fichas médicas
│  ├─ medications/  — Medicamentos
│  └─ ...
├─ login/           — Pantalla de login
├─ layout.tsx       — Root layout
└─ globals.css      — Estilos globales

lib/
├─ api.ts           — Cliente HTTP
└─ auth.ts          — Login/logout

components/
├─ Sidebar.tsx      — Navegación lateral
├─ Flame.tsx        — Logo
└─ ResourceManager.tsx  — Componente CRUD genérico
```

## Deployment

### Vercel

```bash
git push                    # Push a GitHub
```

Luego en Vercel:
1. Importa el repo
2. En Environment, añade `NEXT_PUBLIC_API_URL` con tu URL de API
3. Deploy automático

### Otros

Compatible con Netlify, Cloudflare Pages, etc. Solo asegúrate de que `next.config.mjs` está configurado correctamente.
