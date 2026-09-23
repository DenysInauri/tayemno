import type { FastifyInstance } from "fastify";
import fastifyEnv from "@fastify/env";

const schema = {
  type: "object" as const,
  required: ["DATABASE_URL", "JWT_SECRET", "S3_ENDPOINT", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET"],
  properties: {
    DATABASE_URL: { type: "string" },
    PORT: { type: "number", default: 3000 },
    NODE_ENV: { type: "string", default: "development" },
    JWT_SECRET: { type: "string" },
    SMTP_HOST: { type: "string", default: "smtp.ethereal.email" },
    SMTP_PORT: { type: "number", default: 587 },
    SMTP_USER: { type: "string", default: "dangelo.wyman69@ethereal.email" },
    SMTP_PASS: { type: "string", default: "kENsNCdet2jn9eGWq2" },
    SMTP_FROM: { type: "string", default: "noreply@tayemno.com" },
    S3_ENDPOINT: { type: "string" },
    S3_REGION: { type: "string", default: "auto" },
    S3_ACCESS_KEY_ID: { type: "string" },
    S3_SECRET_ACCESS_KEY: { type: "string" },
    S3_BUCKET: { type: "string" },
  },
};

type Config = {
  DATABASE_URL: string;
  PORT: number;
  NODE_ENV: string;
  JWT_SECRET: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_BUCKET: string;
};

declare module "fastify" {
  interface FastifyInstance {
    config: Config;
  }
}

export async function registerConfig(app: FastifyInstance) {
  await app.register(fastifyEnv, {
    schema,
    dotenv: {
      path: new URL("../../../.env", import.meta.url).pathname,
    },
  });
}
