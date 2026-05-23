import { nanoid } from "nanoid";
import type { Database } from "./types.js";

export const SHORT_ID_LENGTH = 8;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLegacyUuid(id: string): boolean {
  return UUID_RE.test(id);
}

export function collectUsedIds(db: Database): Set<string> {
  const ids = new Set<string>();
  for (const project of db.projects) ids.add(project.id);
  for (const board of Object.values(db.boards)) {
    for (const card of board.cards) ids.add(card.id);
  }
  return ids;
}

export function generateShortId(usedIds: Set<string>): string {
  for (;;) {
    const id = nanoid(SHORT_ID_LENGTH);
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
  }
}

export function needsShortIdMigration(db: Database): boolean {
  if (db.projects.some((p) => isLegacyUuid(p.id))) return true;
  for (const board of Object.values(db.boards)) {
    if (board.cards.some((c) => isLegacyUuid(c.id))) return true;
  }
  return false;
}

export function migrateToShortIds(db: Database): Database {
  const usedIds = collectUsedIds(db);
  for (const id of [...usedIds]) {
    if (isLegacyUuid(id)) usedIds.delete(id);
  }

  const projectIdMap = new Map<string, string>();
  for (const project of db.projects) {
    if (isLegacyUuid(project.id)) {
      const newId = generateShortId(usedIds);
      projectIdMap.set(project.id, newId);
      project.id = newId;
    }
  }

  const boards: Database["boards"] = {};
  for (const [oldProjectId, board] of Object.entries(db.boards)) {
    const projectId = projectIdMap.get(oldProjectId) ?? oldProjectId;
    for (const card of board.cards) {
      if (isLegacyUuid(card.id)) {
        card.id = generateShortId(usedIds);
      }
    }
    boards[projectId] = board;
  }
  db.boards = boards;
  return db;
}
