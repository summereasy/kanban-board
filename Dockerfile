FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY cli/package.json ./cli/

RUN bun install --frozen-lockfile

COPY client ./client
COPY server ./server

RUN bun run --filter client build && bun run --filter server build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV KANBAN_DATA_FILE=/data/db.json
ENV CLIENT_DIST=/app/client/dist

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "server/dist/index.js"]
