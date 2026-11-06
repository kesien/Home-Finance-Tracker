# --- build: függőségek (a natív better-sqlite3 modulhoz szükség esetén fordítóeszközökkel) és a frontend buildje
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# --- futtatás: csak a szükséges fájlok, nem-root felhasználóval
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production DB_FILE=/data/finance.db BACKUP_DIR=/data/backups PORT=3000
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/backend backend
COPY --from=build /app/frontend/dist frontend/dist
# A /data-t előre létrehozzuk és a `node` felhasználóra állítjuk: az új named volume ezt a tulajdonost örökli.
RUN mkdir -p /data/backups && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3000
CMD ["node", "backend/src/index.js"]
