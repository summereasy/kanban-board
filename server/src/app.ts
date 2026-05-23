import express from "express";
import cors from "cors";
import { projectsRouter } from "./routes/projects.js";
import { columnsRouter } from "./routes/columns.js";
import { cardsRouter } from "./routes/cards.js";

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/projects", projectsRouter);
  app.use("/api/projects/:projectId/columns", columnsRouter);
  app.use("/api/projects/:projectId/cards", cardsRouter);

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({ error: "internal server error" });
    },
  );

  return app;
}
