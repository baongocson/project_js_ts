# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/data-core/package.json packages/data-core/package.json
RUN npm ci --no-audit --no-fund

FROM dependencies AS build
COPY backend backend
COPY frontend frontend
COPY packages/data-core packages/data-core
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev --workspace=@dashboard/backend --workspace=@dashboard/data-core --no-audit --no-fund

FROM node:24-bookworm-slim AS backend
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/packages/data-core/package.json ./packages/data-core/package.json
COPY --from=build /app/packages/data-core/dist ./packages/data-core/dist
RUN mkdir -p /app/backend/storage/originals && chown -R node:node /app/backend/storage
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "backend/dist/main.js"]

FROM caddy:2-alpine AS web
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/frontend/dist /srv
EXPOSE 80 443
