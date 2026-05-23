import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { projectsRouter } from "./routes/projects.js";
import { columnsRouter } from "./routes/columns.js";
import { cardsRouter } from "./routes/cards.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function clientDistDir(): string {
  return (
    process.env.CLIENT_DIST ??
    path.resolve(__dirname, "../../client/dist")
  );
}

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/projects", projectsRouter);
  app.use("/api/projects/:projectId/columns", columnsRouter);
  app.use("/api/projects/:projectId/cards", cardsRouter);

  if (process.env.NODE_ENV === "production") {
    const dist = clientDistDir();
    app.use(express.static(dist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(dist, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  }

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
