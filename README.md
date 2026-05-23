# Kanban Board

Single-user Kanban board. React + Vite + shadcn/ui frontend, Express + JSON file backend.

## Run (Dev)

```bash
bun install
bun run dev
```

- Client: http://localhost:5173
- API:    http://localhost:3001

## Production (Docker)

Images are published to GHCR on every push to `main` (docs-only changes are skipped).

```bash
# Personal production via Apple Container — see ~/docker/kanban-board/README.md
export KANBAN_API_URL=http://127.0.0.1:38433
```

One port serves both the Web UI and `/api/*`.

## Build & Test

```bash
bun run build    # client + server + cli
bun test         # server API tests
bun start        # production server (requires build first)
```

Local production smoke test:

```bash
bun run build -w client && bun run build -w server
NODE_ENV=production bun start
# → http://localhost:3001
```

## Features

- Columns: create / rename / delete
- Cards:   create / edit / delete
- Drag-and-drop cards between columns
- State persisted to `server/data/db.json` (dev) or Docker volume (production)

## CLI

A terminal CLI that talks to the API.

### Install

```bash
bun install
bun run build -w cli
bun link -w cli
```

This links `kanban` as a global command. The server must be running for commands to work.

### Usage

```bash
# Projects
kanban projects list
kanban projects create <name>
kanban projects rename <projectId> <name>
kanban projects delete <projectId>

# Board (visual overview)
kanban board <projectId>

# Columns
kanban columns create <projectId> <title>
kanban columns rename <projectId> <columnId> <title>
kanban columns delete <projectId> <columnId>

# Cards
kanban cards create <projectId> <columnId> <title> [description]
kanban cards update <projectId> <cardId> [--title/-t] [--description/-d] [--column/-c] [--order/-o]
kanban cards move <projectId> <cardId> <columnId>
kanban cards delete <projectId> <cardId>
```

Set `KANBAN_API_URL` to target a non-default server (default: `http://localhost:3001`).

### Rebuild after changes

```bash
bun run build -w cli
```

### Uninstall

```bash
bun unlink -g kanban-cli
```

## Docker Image

```bash
docker build -t kanban-board .
docker run --rm -p 38433:3001 \
  -v kanban-data:/data \
  -e KANBAN_DATA_FILE=/data/db.json \
  kanban-board
```

Published tags: `ghcr.io/summereasy/kanban-board:latest` and `:sha`.

## Dev vs Production

| | Dev | Production (Docker) |
|---|---|---|
| Start | `bun run dev` | `container start kanban-board` |
| UI | Vite :5173 | Same service :38433 |
| API | :3001 | Same service :38433 |
| Data | `server/data/db.json` | `~/docker/kanban-board/data/` volume |
| Agent | `KANBAN_API_URL=http://localhost:3001` | `KANBAN_API_URL=http://127.0.0.1:38433` |
