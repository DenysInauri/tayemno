import Fastify from "fastify";
import type { HealthCheckResponse } from "@tayemno/shared";
import { registerConfig } from "./config.js";
import { createDb, type Database } from "./db";
import { usersRoutes } from "./routes/users";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }
}

const app = Fastify({ logger: true });

await registerConfig(app);

app.decorate("db", createDb(app.config.DATABASE_URL));

app.get("/health", async (): Promise<HealthCheckResponse> => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
});

await app.register(usersRoutes, { prefix: "/users" });

const start = async () => {
  try {
    await app.listen({ port: app.config.PORT });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
