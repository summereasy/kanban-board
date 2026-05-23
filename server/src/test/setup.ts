import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach } from "vitest";
import { resetDbForTests } from "../db.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "kanban-test-"));
  process.env.KANBAN_DATA_FILE = path.join(tempDir, "db.json");
  resetDbForTests();
});

afterEach(async () => {
  delete process.env.KANBAN_DATA_FILE;
  await rm(tempDir, { recursive: true, force: true });
});
