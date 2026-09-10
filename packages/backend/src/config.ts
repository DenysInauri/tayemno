import type { FastifyInstance } from "fastify";
import fastifyEnv from "@fastify/env";

const schema = {
  type: "object" as const,
  required: ["DATABASE_URL"],
  properties: {
    DATABASE_URL: { type: "string" },
    PORT: { type: "number", default: 3000 },
    NODE_ENV: { type: "string", default: "development" },
  },
};

type Config = {
  DATABASE_URL: string;
  PORT: number;
  NODE_ENV: string;
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
