---
name: nuevo-componente
description: Crea o construye un componente nuevo en fraguago-web siguiendo las convenciones del proyecto (Next.js App Router + TypeScript + Tailwind + shadcn/ui, consumiendo la API). Úsala cuando el usuario pida crear, construir o generar un componente, una card, un formulario, una vista o un elemento de UI. Puede invocarse con /nuevo-componente.
---

# Crear un componente en fraguago-web

Sigue este procedimiento para crear un componente nuevo en este repo (frontend Next.js). Este proyecto NO accede a base de datos ni a Prisma: los datos se piden a la API por HTTP.

## 1. Entender qué se pide

Si el usuario pasó una descripción al invocar la skill (`$ARGUMENTS`), úsala como especificación del componente. Si no dio detalles, pregúntale lo mínimo imprescindible antes de escribir:

- **Nombre** del componente (en `PascalCase`, p. ej. `GymCard`).
- **Qué hace / qué muestra.**
- **¿Necesita interactividad?** (estado, eventos, hooks del navegador) → decide Server vs Client.
- **¿Consume datos de la API?** ¿Cuáles?

No preguntes más de lo necesario: si algo es evidente por la descripción, asúmelo y sigue.

## 2. Decidir Server vs Client Component

- **Server Component por defecto.** No añadas `"use client"` salvo que haga falta.
- Añade `"use client"` en la primera línea SOLO si el componente usa `useState`, `useEffect`, otros hooks del cliente, o maneja eventos del navegador.
- Si solo una parte necesita interactividad, extrae esa parte a un componente cliente pequeño y deja el resto como Server Component.

## 3. Ubicación del archivo

- Componente reutilizable de UI del proyecto → `components/`.
- Primitiva de shadcn/ui → NO la escribas a mano; instálala con `pnpm dlx shadcn@latest add <componente>` y luego compón sobre ella.
- Si el componente pertenece claramente a una ruta concreta, valora colocarlo junto a esa ruta dentro de `app/`.

Antes de crear nada, revisa `components/` y `components/ui/` para reutilizar lo que ya exista y seguir el patrón de nombres del repo.

## 4. Escribir el componente

Respeta estas reglas:

- **TypeScript estricto:** define e (si se reutiliza) exporta la interfaz de props. Nada de `any`.
- **Tailwind** para estilos; usa los tokens/design system que ya haya en el proyecto, no valores arbitrarios.
- Para clases condicionales usa el helper que ya use el repo (típicamente `cn()` de `lib/utils`).
- Reutiliza componentes de `components/ui/` (shadcn/ui) en vez de reinventarlos.
- **Accesibilidad:** etiquetas, roles, foco y contraste correctos; navegable por teclado.
- Componente pequeño y con una sola responsabilidad.

### Esqueleto de referencia (Server Component)

```tsx
import { cn } from "@/lib/utils";

interface GymCardProps {
  title: string;
  className?: string;
}

export function GymCard({ title, className }: GymCardProps) {
  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
  );
}
```

### Si es Client Component

```tsx
"use client";

import { useState } from "react";

interface CounterProps {
  initial?: number;
}

export function Counter({ initial = 0 }: CounterProps) {
  const [count, setCount] = useState(initial);
  return (
    <button onClick={() => setCount((c) => c + 1)}>
      {count}
    </button>
  );
}
```

## 5. Si consume datos de la API

- Centraliza la llamada en `lib/` (cliente/fetch wrapper) o en un hook de `hooks/`; no repartas `fetch` sueltos por el componente.
- Datos del servidor → obténlos en un Server Component o en un route handler (`app/**/route.ts`).
- Datos que dependen de interacción del cliente → usa un hook en `hooks/`.
- Maneja SIEMPRE los estados de **carga** y **error** en la vista.
- Nunca metas tokens, credenciales ni la URL privada del backend en código de cliente. Usa variables de entorno (`NEXT_PUBLIC_*` solo para lo realmente público).

## 6. Cerrar

- Comprueba que compila y pasa el lint: `pnpm lint` y, si aplica, `pnpm build`.
- Explica brevemente qué creaste, dónde, y cualquier suposición que hiciste sobre la API o el diseño.

## Fuera de alcance

Nada de Prisma, migraciones ni queries a base de datos: eso es del backend. Si el componente necesita un endpoint que no existe, dilo y describe el contrato de API que haría falta, sin resolverlo desde el frontend.