import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env, isAllowedClientOrigin } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiRateLimiter } from "./middleware/security.middleware";
import routes from "./routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedClientOrigin(origin));
      },
      credentials: true,
    }),
  );
  app.use(compression({ threshold: 1024 }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(apiRateLimiter);

  app.use(
    "/uploads",
    express.static("uploads", {
      immutable: env.NODE_ENV === "production",
      maxAge: env.NODE_ENV === "production" ? "30d" : "1h",
      etag: true,
    }),
  );
  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
