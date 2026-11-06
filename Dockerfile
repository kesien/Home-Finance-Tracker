FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production DB_FILE=/data/finance.db PORT=3000
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/backend backend
COPY --from=build /app/frontend/dist frontend/dist
VOLUME /data
EXPOSE 3000
CMD ["node", "backend/src/index.js"]
