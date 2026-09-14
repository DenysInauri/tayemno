import Fastify from "fastify";
import cors from "@fastify/cors";
import type { Transporter } from "nodemailer";
import type { HealthCheckResponse } from "@tayemno/shared";
import { registerConfig } from "./config.js";
import { createDb, type Database } from "./db";
import { usersRoutes } from "./routes/users";
import { securityRoutes } from "./routes/security";
import { authRoutes } from "./routes/auth";
import { createTransport } from "./services/email";
import { deleteExpired } from "./repositories/pendingRegistrations";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
    mailTransport: Transporter;
  }
}

const app = Fastify({ logger: true });

await registerConfig(app);
await app.register(cors);

app.decorate("db", createDb(app.config.DATABASE_URL));

const mailTransport = await createTransport(app.config);
app.decorate("mailTransport", mailTransport);

app.get("/health", async (): Promise<HealthCheckResponse> => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
});

await app.register(usersRoutes, { prefix: "/users" });
await app.register(securityRoutes, { prefix: "/security" });
await app.register(authRoutes, { prefix: "/auth" });

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  deleteExpired(app.db).catch((err) => {
    app.log.error(err, "Failed to clean up expired pending registrations");
  });
}, CLEANUP_INTERVAL_MS);

const start = async () => {
  try {
    await app.listen({ port: app.config.PORT });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
