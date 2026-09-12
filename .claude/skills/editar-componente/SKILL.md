---
name: editar-componente
description: Modifica, refactoriza o arregla un componente que YA existe en fraguago-web, respetando su código y convenciones actuales. Úsala cuando el usuario pida editar, cambiar, refactorizar, arreglar un bug, o añadir/quitar algo de un componente, hook o vista existente. Puede invocarse con /editar-componente.
---

# Modificar un componente existente en fraguago-web

Sigue este procedimiento para cambiar código que YA existe en este repo (frontend Next.js, sin Prisma ni base de datos). La regla de oro: **entiende antes de tocar** y haz el **cambio mínimo** coherente con lo que ya hay.

## 1. Entender qué se pide

Si el usuario pasó detalles al invocar la skill (`$ARGUMENTS`), úsalos. Si no queda claro qué archivo o qué cambio, pregunta lo mínimo:

- **Qué componente/archivo** hay que tocar.
- **Qué cambio** exactamente (bug, nueva prop, refactor, estilo, comportamiento).

## 2. Leer y entender ANTES de editar

Este es el paso más importante y lo que diferencia modificar de crear:

- Localiza el archivo (`Grep`/`Glob`) y **léelo completo**.
- Fíjate en: si es Server o Client Component (`"use client"`), qué props recibe, qué hooks/utilidades usa, y el estilo del archivo (nombres, orden de imports, patrones).
- **Busca quién lo usa:** haz grep del nombre del componente por el repo para ver todos los sitios que lo importan. Un cambio en las props o en el comportamiento puede romper esos usos.
- Si toca datos, mira cómo se conecta hoy a la API (hook en `hooks/`, cliente en `lib/`, fetch en Server Component) y respeta ese patrón.

No empieces a escribir hasta tener claro el contexto.

## 3. Hacer el cambio mínimo y coherente

- Cambia solo lo necesario para cumplir lo pedido. No aproveches para reescribir o "mejorar" cosas no relacionadas salvo que el usuario lo pida.
- **Respeta el estilo existente** del archivo: misma forma de importar, mismo uso de `cn()`, mismas convenciones de nombres y de Tailwind. No impongas un estilo distinto al del repo.
- Mantén el límite Server/Client: no añadas `"use client"` a un Server Component salvo que la nueva funcionalidad lo exija; si lo exige, valora extraer solo esa parte a un componente cliente.
- **Si cambias el contrato de props** (nombre, tipo, obligatoriedad, o quitas una), actualiza TODOS los sitios que usan el componente para que sigan compilando.
- Conserva la accesibilidad y el tipado estricto (nada de `any`).

## 4. Verificar

- Comprueba que compila y pasa el lint: `pnpm lint` y, si aplica, `pnpm build`.
- Revisa que los usos existentes del componente siguen siendo válidos tras el cambio.

## 5. Cerrar

Explica de forma breve:

- Qué cambiaste y por qué.
- Qué archivos tocaste (incluye los usos que actualizaste, si cambiaste props).
- Cualquier suposición o efecto secundario a tener en cuenta.

## Fuera de alcance

Nada de Prisma, migraciones ni queries a base de datos: eso es del backend. Si el cambio necesita un endpoint nuevo o distinto en la API, dilo y describe el contrato que haría falta, sin resolverlo desde el frontend.