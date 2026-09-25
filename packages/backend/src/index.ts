import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import type { Transporter } from "nodemailer";
import type { HealthCheckResponse } from "@tayemno/shared";
import { createS3Client, type S3 } from "./utils/s3";
import { registerConfig } from "./config.js";
import { createDb, type Database } from "./db";
import { usersRoutes } from "./routes/users";
import { securityRoutes } from "./routes/security";
import { authRoutes } from "./routes/auth";
import { foldersRoutes } from "./routes/folders";
import { vaultsRoutes } from "./routes/vaults";
import { createTransport } from "./services/email";
import { deleteExpired } from "./repositories/pendingRegistrations";
import { cleanupExpiredChallenges } from "./utils/srpChallengeStore";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
    mailTransport: Transporter;
    s3: S3;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

const app = Fastify({ logger: true });

await registerConfig(app);
await app.register(cors);
await app.register(jwt, { secret: app.config.JWT_SECRET });

app.decorate("db", createDb(app.config.DATABASE_URL));

const mailTransport = await createTransport(app.config);
app.decorate("mailTransport", mailTransport);

app.decorate("s3", createS3Client({
  endpoint: app.config.S3_ENDPOINT,
  region: app.config.S3_REGION,
  accessKeyId: app.config.S3_ACCESS_KEY_ID,
  secretAccessKey: app.config.S3_SECRET_ACCESS_KEY,
}));

app.get("/health", async (): Promise<HealthCheckResponse> => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
});

await app.register(usersRoutes, { prefix: "/users" });
await app.register(securityRoutes, { prefix: "/security" });
await app.register(authRoutes, { prefix: "/auth" });
await app.register(foldersRoutes, { prefix: "/workspaces/:workspaceId/folders" });
await app.register(vaultsRoutes, { prefix: "/vaults" });

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  deleteExpired(app.db).catch((err) => {
    app.log.error(err, "Failed to clean up expired pending registrations");
  });
}, CLEANUP_INTERVAL_MS);

const CHALLENGE_CLEANUP_INTERVAL_MS = 60 * 1000;
setInterval(() => {
  cleanupExpiredChallenges();
}, CHALLENGE_CLEANUP_INTERVAL_MS);

const start = async () => {
  try {
    await app.listen({ port: app.config.PORT });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
