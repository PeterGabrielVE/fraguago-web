FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# ---- dependencias ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- desarrollo (usado por docker-compose) ----
FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev", "-H", "0.0.0.0"]

# ---- build de producción ----
FROM deps AS builder
# Las variables NEXT_PUBLIC_* se incrustan en el bundle durante el build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ARG NEXT_PUBLIC_ENABLE_REGISTRATION=false
ARG NEXT_PUBLIC_POSTHOG_KEY=
ARG NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_ENABLE_REGISTRATION=$NEXT_PUBLIC_ENABLE_REGISTRATION \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_STANDALONE=true
COPY . .
RUN pnpm build

# ---- imagen final de producción ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
