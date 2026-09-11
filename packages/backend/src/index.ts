import Fastify from "fastify";
import cors from "@fastify/cors";
import type { HealthCheckResponse } from "@tayemno/shared";
import { registerConfig } from "./config.js";
import { createDb, type Database } from "./db";
import { usersRoutes } from "./routes/users";
import { securityRoutes } from "./routes/security";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }
}

const app = Fastify({ logger: true });

await registerConfig(app);
await app.register(cors);

app.decorate("db", createDb(app.config.DATABASE_URL));

app.get("/health", async (): Promise<HealthCheckResponse> => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
});

await app.register(usersRoutes, { prefix: "/users" });
await app.register(securityRoutes, { prefix: "/security" });

const start = async () => {
  try {
    await app.listen({ port: app.config.PORT });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
