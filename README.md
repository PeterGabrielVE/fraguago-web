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
