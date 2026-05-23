# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

From the repo root:
- `bun run dev` — Start client (port 5173) + server (port 3001) concurrently
- `bun run build` — Build all three workspaces (client, server, cli) sequentially
- `bun start` — Start production server only (serves API + built client when `NODE_ENV=production`)
- `bun test` — Run server API tests (vitest)
- `bun run kanban` — Run the CLI tool

Workspace-scoped:
- `bun run dev -w server` — Server in watch mode (tsx)
- `bun run dev -w client` — Vite dev server with HMR
- `bun run build -w cli` — Compile CLI TypeScript
- `bun run dev -w cli` — CLI in watch mode

## Architecture

**Monorepo with three bun workspaces**: `client/`, `server/`, `cli/`. All use `"type": "module"` (full ES modules) and TypeScript with strict mode.

**Server** (`server/src/`): Express REST API with file-based persistence (`server/data/db.json`). The `db.ts` module uses an async write queue to serialize file operations and avoid race conditions. Routes are split into three files: projects, columns, cards — all nested under `/api/projects/:projectId/...`. On first run, auto-migrates a legacy `board.json` to the multi-project `db.json` format. In production (`NODE_ENV=production`), also serves the built React SPA from `client/dist`.

**Client** (`client/src/`): React SPA with hash-based routing (`#board` vs. projects list). State is managed via a custom `useBoard` hook. API calls go through a centralized `api.ts` fetch wrapper. Card moves use optimistic updates — the UI updates immediately, then reconciles with the server response. Drag-and-drop is powered by `@dnd-kit`. UI uses shadcn/ui components + Tailwind CSS. Path alias `@/` resolves to `src/`.

**CLI** (`cli/src/`): Commander.js CLI with four command groups (`projects`, `board`, `columns`, `cards`). Uses `chalk` for color and `cli-table3` for table output. Targets `KANBAN_API_URL` env var (defaults to `http://localhost:3001`). Requires the server to be running.

**Data shape**:
```json
{
  "projects": [...],
  "boards": { "<projectId>": { "columns": [...], "cards": [...] } }
}
```

Types are duplicated across the three workspaces (not shared via a package).

## Production / Docker

- **CI**: `.github/workflows/publish-image.yml` builds and pushes multi-arch images to `ghcr.io/summereasy/kanban-board` on push to `main`.
- **Personal production**: Apple Container setup in `~/docker/services/kanban-board.sh` (port 38433, data volume at `~/docker/kanban-board/data`).
- **Dockerfile**: multi-stage — bun build, node runtime. CLI is not included in the image.

## Keeping Things in Sync

**Types are duplicated** — when adding or changing a data field (e.g., adding `tags` to a card), you must update the type definition in all three workspaces (`client/src/`, `server/src/`, `cli/src/`) and update the relevant API route handler in `server/src/routes/`. After any such change, run `bun run build` to confirm TypeScript compiles cleanly across all workspaces.

**Skill auto-sync** — `.claude/settings.json` has a PostToolUse hook that automatically copies `.claude/skills/kanban-cli/SKILL.md` to `~/.claude/skills/kanban-cli/SKILL.md` whenever the file is edited. When adding a new CLI command or changing CLI behavior, update the skill file and the hook will propagate it.

**CLI auto-rebuild** — the same settings file has a hook that runs `bun run build -w cli` automatically after any edit to `cli/src/`. The `kanban` binary is symlinked via `bun link`, so the rebuilt output is immediately live.
