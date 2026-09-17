FROM node:24.19.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run assets && npm run build && VITE_BASE_PATH=/staging/ npm run build -w frontend -- --outDir dist-staging

FROM nginx:1.28-alpine AS frontend
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY --from=build /app/frontend/dist-staging /usr/share/nginx/html/staging
COPY deploy/nginx-container.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

FROM node:24.19.0-bookworm-slim AS backend
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000 NEWS_DATA_FILE=/app/storage/news.json
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && mkdir /app/storage && chown node:node /app/storage
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
COPY --from=build --chown=node:node /app/frontend/dist/index.html ./frontend/dist/index.html
COPY --from=build --chown=node:node /app/frontend/dist-staging/index.html ./frontend/dist-staging/index.html
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:4000/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","backend/dist/server.mjs"]
