FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Les variables NEXT_PUBLIC_* sont figées dans le bundle client au moment du
# build, pas lues au runtime du conteneur — doivent donc être passées en
# argument de build (Dokploy: section "Build Args"), pas seulement en
# variable d'environnement runtime.
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* est inliné dans le bundle au build — doit être fourni ici,
# le fixer seulement au runtime (docker-compose environment / Dokploy env)
# n'a aucun effet sur du code déjà compilé.
ARG NEXT_PUBLIC_API_URL=https://backend.zylooffice.com
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3003 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3003

HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=10s \
    --retries=5 \
    CMD node -e "require('http').get('http://localhost:3003', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
