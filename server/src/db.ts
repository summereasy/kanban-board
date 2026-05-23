import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  collectUsedIds,
  generateShortId,
  migrateToShortIds,
  needsShortIdMigration,
} from "./ids.js";
import type { Board, Database } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = path.resolve(__dirname, "../data");

function dataFile(): string {
  return (
    process.env.KANBAN_DATA_FILE ??
    path.join(DEFAULT_DATA_DIR, "db.json")
  );
}

function legacyFile(): string {
  return path.join(path.dirname(dataFile()), "board.json");
}

function emptyBoard(): Board {
  return {
    columns: [
      { id: randomUUID(), title: "To Do", order: 0 },
      { id: randomUUID(), title: "In Progress", order: 1 },
      { id: randomUUID(), title: "Done", order: 2 },
    ],
    cards: [],
  };
}

function isDatabase(value: unknown): value is Database {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Database).projects) &&
    typeof (value as Database).boards === "object" &&
    (value as Database).boards !== null
  );
}

let writeQueue: Promise<void> = Promise.resolve();

/** Reset in-process write queue between tests. */
export function resetDbForTests(): void {
  writeQueue = Promise.resolve();
}

async function migrateIfNeeded(): Promise<Database> {
  const dbPath = dataFile();
  const legacyPath = legacyFile();

  try {
    const raw = await fs.readFile(legacyPath, "utf8");
    const legacy = JSON.parse(raw) as Board;
    const usedIds = new Set<string>();
    const project = {
      id: generateShortId(usedIds),
      name: "Default",
      createdAt: new Date().toISOString(),
    };
    const db: Database = {
      projects: [project],
      boards: { [project.id]: legacy },
    };
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(legacyPath, `${legacyPath}.migrated`);
    return db;
  } catch {
    const usedIds = new Set<string>();
    const project = {
      id: generateShortId(usedIds),
      name: "Default",
      createdAt: new Date().toISOString(),
    };
    const db: Database = {
      projects: [project],
      boards: { [project.id]: emptyBoard() },
    };
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
    return db;
  }
}

async function ensureFile(): Promise<void> {
  try {
    await fs.access(dataFile());
  } catch {
    await migrateIfNeeded();
  }
}

async function normalizeDb(db: Database): Promise<Database> {
  if (!needsShortIdMigration(db)) return db;
  migrateToShortIds(db);
  await writeDb(db);
  return db;
}

export async function readDb(): Promise<Database> {
  await ensureFile();
  const raw = await fs.readFile(dataFile(), "utf8");
  const parsed = JSON.parse(raw);
  if (!isDatabase(parsed)) {
    const db = await migrateIfNeeded();
    return normalizeDb(db);
  }
  return normalizeDb(parsed);
}

export async function writeDb(db: Database): Promise<void> {
  writeQueue = writeQueue.then(() =>
    fs.writeFile(dataFile(), JSON.stringify(db, null, 2), "utf8"),
  );
  await writeQueue;
}

export async function mutateDb<T>(
  fn: (db: Database) => T | Promise<T>,
): Promise<T> {
  const db = await readDb();
  const result = await fn(db);
  await writeDb(db);
  return result;
}

export async function mutateBoard<T>(
  projectId: string,
  fn: (board: Board) => T | Promise<T>,
): Promise<T | null> {
  const db = await readDb();
  const board = db.boards[projectId];
  if (!board) return null;
  const result = await fn(board);
  await writeDb(db);
  return result;
}

export function createProject(
  name: string,
  usedIds: Set<string>,
): {
  project: { id: string; name: string; createdAt: string };
  board: Board;
} {
  return {
    project: {
      id: generateShortId(usedIds),
      name,
      createdAt: new Date().toISOString(),
    },
    board: emptyBoard(),
  };
}

export { collectUsedIds, generateShortId };
