import { describe, expect, it } from "vitest";
import {
  SHORT_ID_LENGTH,
  collectUsedIds,
  generateShortId,
  isLegacyUuid,
  migrateToShortIds,
  needsShortIdMigration,
} from "./ids.js";
import type { Database } from "./types.js";

const PROJECT_UUID = "35d1b12c-0495-4cf6-a8ec-115c5466a2ae";
const CARD_UUID = "0f0c4424-5a4f-4727-93f8-4ab1a1ab3dd2";
const COLUMN_UUID = "77907e05-c68c-4cb6-9cbf-21ec08b62778";

function sampleDb(): Database {
  return {
    projects: [
      {
        id: PROJECT_UUID,
        name: "Legacy project",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    boards: {
      [PROJECT_UUID]: {
        columns: [
          { id: COLUMN_UUID, title: "Done", order: 0 },
        ],
        cards: [
          {
            id: CARD_UUID,
            columnId: COLUMN_UUID,
            title: "Fix bug",
            description: "",
            order: 0,
          },
        ],
      },
    },
  };
}

describe("isLegacyUuid", () => {
  it("recognizes standard UUIDs", () => {
    expect(isLegacyUuid(PROJECT_UUID)).toBe(true);
    expect(isLegacyUuid("00000000-0000-4000-8000-000000000000")).toBe(true);
  });

  it("rejects short nanoids", () => {
    expect(isLegacyUuid("J30xZTET")).toBe(false);
    expect(isLegacyUuid("abc")).toBe(false);
  });
});

describe("generateShortId", () => {
  it("returns 8-character IDs", () => {
    const usedIds = new Set<string>();
    const id = generateShortId(usedIds);
    expect(id).toHaveLength(SHORT_ID_LENGTH);
  });

  it("tracks used IDs and avoids collisions", () => {
    const usedIds = new Set<string>();
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(generateShortId(usedIds));
    }
    expect(ids.size).toBe(50);
    expect(usedIds.size).toBe(50);
  });
});

describe("collectUsedIds", () => {
  it("collects project and card IDs", () => {
    const db = sampleDb();
    const ids = collectUsedIds(db);
    expect(ids.has(PROJECT_UUID)).toBe(true);
    expect(ids.has(CARD_UUID)).toBe(true);
    expect(ids.has(COLUMN_UUID)).toBe(false);
  });
});

describe("needsShortIdMigration", () => {
  it("detects legacy UUID project and card IDs", () => {
    expect(needsShortIdMigration(sampleDb())).toBe(true);
  });

  it("returns false when IDs are already short", () => {
    const db: Database = {
      projects: [{ id: "Ab12Cd34", name: "New", createdAt: "2026-01-01T00:00:00.000Z" }],
      boards: {
        Ab12Cd34: {
          columns: [{ id: COLUMN_UUID, title: "Done", order: 0 }],
          cards: [
            {
              id: "Xy98Zw76",
              columnId: COLUMN_UUID,
              title: "Task",
              description: "",
              order: 0,
            },
          ],
        },
      },
    };
    expect(needsShortIdMigration(db)).toBe(false);
  });
});

describe("migrateToShortIds", () => {
  it("migrates project and card IDs while preserving column references", () => {
    const db = sampleDb();
    migrateToShortIds(db);

    const project = db.projects[0];
    expect(isLegacyUuid(project.id)).toBe(false);
    expect(project.id).toHaveLength(SHORT_ID_LENGTH);

    const board = db.boards[project.id];
    expect(board).toBeDefined();

    const card = board.cards[0];
    expect(isLegacyUuid(card.id)).toBe(false);
    expect(card.id).toHaveLength(SHORT_ID_LENGTH);
    expect(card.columnId).toBe(COLUMN_UUID);
  });

  it("remaps board keys to new project IDs", () => {
    const db = sampleDb();
    migrateToShortIds(db);

    expect(Object.keys(db.boards)).toHaveLength(1);
    expect(db.boards[PROJECT_UUID]).toBeUndefined();
    expect(db.boards[db.projects[0].id]).toBeDefined();
  });
});
