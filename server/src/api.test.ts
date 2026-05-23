import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { isLegacyUuid } from "./ids.js";
import "./test/setup.js";

describe("API", () => {
  const app = createApp();

  it("creates a project with a short ID and default board", async () => {
    const res = await request(app)
      .post("/api/projects")
      .send({ name: "Test project" })
      .expect(201);

    expect(res.body.name).toBe("Test project");
    expect(res.body.id).toHaveLength(8);
    expect(isLegacyUuid(res.body.id)).toBe(false);

    const boardRes = await request(app)
      .get(`/api/projects/${res.body.id}/board`)
      .expect(200);

    expect(boardRes.body.columns).toHaveLength(3);
    expect(boardRes.body.cards).toHaveLength(0);
  });

  it("creates cards with short IDs scoped to a project", async () => {
    const project = await request(app)
      .post("/api/projects")
      .send({ name: "Cards project" })
      .expect(201);

    const board = await request(app)
      .get(`/api/projects/${project.body.id}/board`)
      .expect(200);

    const columnId = board.body.columns[0].id;

    const card = await request(app)
      .post(`/api/projects/${project.body.id}/cards`)
      .send({ columnId, title: "My task", description: "Details" })
      .expect(201);

    expect(card.body.title).toBe("My task");
    expect(card.body.id).toHaveLength(8);
    expect(isLegacyUuid(card.body.id)).toBe(false);
  });

  it("moves a card between columns and reorders remaining cards", async () => {
    const project = await request(app)
      .post("/api/projects")
      .send({ name: "Move project" })
      .expect(201);

    const board = await request(app)
      .get(`/api/projects/${project.body.id}/board`)
      .expect(200);

    const [fromColumn, toColumn] = board.body.columns;
    const columnIds = [fromColumn.id, toColumn.id];

    const first = await request(app)
      .post(`/api/projects/${project.body.id}/cards`)
      .send({ columnId: columnIds[0], title: "First", description: "" })
      .expect(201);

    await request(app)
      .post(`/api/projects/${project.body.id}/cards`)
      .send({ columnId: columnIds[0], title: "Second", description: "" })
      .expect(201);

    await request(app)
      .patch(`/api/projects/${project.body.id}/cards/${first.body.id}`)
      .send({ columnId: columnIds[1] })
      .expect(200);

    const updatedBoard = await request(app)
      .get(`/api/projects/${project.body.id}/board`)
      .expect(200);

    const sourceCards = updatedBoard.body.cards
      .filter((c: { columnId: string }) => c.columnId === columnIds[0])
      .sort((a: { order: number }, b: { order: number }) => a.order - b.order);

    expect(sourceCards).toHaveLength(1);
    expect(sourceCards[0].title).toBe("Second");
    expect(sourceCards[0].order).toBe(0);

    const targetCards = updatedBoard.body.cards.filter(
      (c: { columnId: string }) => c.columnId === columnIds[1],
    );
    expect(targetCards).toHaveLength(1);
    expect(targetCards[0].id).toBe(first.body.id);
  });

  it("returns 404 for unknown project", async () => {
    await request(app)
      .get("/api/projects/unknown0/board")
      .expect(404);
  });

  it("returns 400 when creating a card in a missing column", async () => {
    const project = await request(app)
      .post("/api/projects")
      .send({ name: "Validation project" })
      .expect(201);

    await request(app)
      .post(`/api/projects/${project.body.id}/cards`)
      .send({
        columnId: "00000000-0000-4000-8000-000000000000",
        title: "Orphan",
        description: "",
      })
      .expect(400);
  });
});
