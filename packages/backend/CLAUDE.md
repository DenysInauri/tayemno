# Backend

Fastify REST API with Drizzle ORM and PostgreSQL.

## Tech Stack

- **Runtime:** Node.js with ESM (`"type": "module"`)
- **Framework:** Fastify 5
- **ORM:** Drizzle ORM (postgres-js driver)
- **Database:** PostgreSQL
- **Dev server:** tsx watch
- **Shared types:** `@tayemno/shared`

## Project Structure

```
src/
├── index.ts                  # App bootstrap, register plugins and routes
├── config.ts                 # Env schema + Fastify config plugin (@fastify/env)
├── db/
│   ├── index.ts              # createDb, Database type
│   └── schema.ts             # Drizzle table definitions
├── routes/
│   └── <domain>/
│       └── index.ts          # Fastify plugin: /<domain>/* endpoints
├── services/
│   └── <domain>/
│       └── index.ts          # Business logic
└── repositories/
    └── <domain>/
        └── index.ts          # Drizzle DB queries
```

## Architecture: Routes -> Services -> Repositories

Three-layer architecture. Each layer is a plain module with arrow functions.

```
Routes (Fastify plugins)
  → Services (business logic)
    → Repositories (Drizzle queries)
```

### Routes

- Exported as Fastify plugin arrow functions (`async (app: FastifyInstance) => { ... }`)
- Registered in `index.ts` with `app.register(plugin, { prefix: "/<domain>" })`
- Handle request/response typing using generics (`app.get<{ Params: IType }>`)
- Call service functions, passing `app.db` as the first argument
- Import request/response interfaces from `@tayemno/shared`

### Services

- Arrow functions that receive `db: Database` as the first argument
- Contain business logic, call repository functions
- Return typed response objects (interfaces from `@tayemno/shared`)

### Repositories

- Arrow functions that receive `db: Database` as the first argument
- Contain only Drizzle query logic (select, insert, update, delete)
- Import table definitions from `../../db/schema.js`
- Return raw query results (single record, array, or `undefined`)

## Code Style

### Arrow Functions Only

All functions must use arrow function syntax. No `function` keyword in project source files.

```ts
// Correct
export const findByUsername = async (db: Database, username: string) => { ... };
export const usersRoutes = async (app: FastifyInstance) => { ... };

// Incorrect
export async function findByUsername(db: Database, username: string) { ... }
```

### Interface Naming

All interfaces must be prefixed with `I`:

```ts
interface ICheckUsernameParams {
  username: string;
}
```

Type aliases do not use the `I` prefix.

### Folder-Based File Structure

Every module uses `ModuleName/index.ts`:

```
routes/users/index.ts
services/users/index.ts
repositories/users/index.ts
```

### Import Conventions

1. External libraries first (`fastify`, `drizzle-orm`, etc.)
2. `@tayemno/shared` types
3. Internal modules (db, services, repositories)

Separate groups with a blank line when it aids readability.

### Import Paths

- **Folder modules** (`index.ts` files): import by folder path without `/index.js`
  ```ts
  import { createDb } from "./db";
  import { findByUsername } from "../../repositories/users";
  ```
- **Single files**: import with `.js` extension (ESM resolution)
  ```ts
  import { registerConfig } from "./config.js";
  import { users } from "../../db/schema.js";
  ```

### Shared Types

Request/response interfaces used by both frontend and backend live in `@tayemno/shared`. Import them — don't duplicate.

```ts
import type { ICheckUsernameParams, ICheckUsernameResponse } from "@tayemno/shared";
```

## Database

### Drizzle Schema

Table definitions live in `src/db/schema.ts`. Column names use `snake_case` in the DB, mapped to `camelCase` in TypeScript.

### Database Access

The `Database` type is exported from `src/db/index.ts`. All services and repositories receive `db: Database` as a parameter — never import it as a singleton.

```ts
import type { Database } from "../../db";
```

The Drizzle instance is created once in `index.ts` and decorated onto the Fastify instance as `app.db`.

### Drizzle Kit Commands

```bash
npm run db:generate    # Generate migrations from schema changes
npm run db:migrate     # Run pending migrations
npm run db:push        # Push schema directly (dev only)
npm run db:studio      # Open Drizzle Studio
```

## Scripts

```bash
npm run dev            # Start dev server with tsx watch
npm run build          # Compile TypeScript
npm run start          # Run compiled output
```

## Environment

Configuration is loaded via `@fastify/env` from the root `.env` file.

Required variables:
- `DATABASE_URL` — PostgreSQL connection string

Optional variables:
- `PORT` — server port (default: `3000`)
- `NODE_ENV` — environment (default: `"development"`)
