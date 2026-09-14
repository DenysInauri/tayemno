# Backend Architecture

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
packages/backend/src/
├── index.ts                  # App bootstrap, register plugins and routes
├── config.ts                 # Env schema + Fastify config plugin (@fastify/env)
├── db/
│   ├── index.ts              # createDb, Database type
│   └── schema.ts             # Drizzle table definitions
├── routes/
│   └── <domain>/
│       ├── index.ts           # Composes sub-route plugins
│       └── <endpoint>/
│           └── index.ts       # Single endpoint handler
├── services/
│   └── <domain>/
│       ├── index.ts           # Re-exports all functions
│       └── <function>/
│           └── index.ts       # Single service function
├── repositories/
│   └── <domain>/
│       └── index.ts           # All query functions in one file
└── utils/
    └── <domain>/
        └── index.ts          # Pure utility functions
```

## Architecture: Routes -> Services -> Repositories

Three-layer architecture. Each layer is a plain module with arrow functions.

```
Routes (Fastify plugins)
  → Services (business logic)
    → Repositories (Drizzle queries)
```

### Routes

- Each domain has a folder under `routes/` with an `index.ts` that composes sub-route plugins
- Each endpoint lives in its own subfolder (`routes/<domain>/<endpoint>/index.ts`)
- The domain `index.ts` registers sub-routes via `app.register(subRoute)` — no prefix needed since paths are defined in each endpoint file
- Registered in the app entrypoint with `app.register(domainRoutes, { prefix: "/<domain>" })`
- Handle request/response typing using generics (`app.get<{ Params: IType }>`)
- Call service functions, passing `app.db` as the first argument
- Import request/response interfaces from `@tayemno/shared`

```
routes/auth/
  index.ts                      # registers all sub-routes
  register/index.ts             # POST /register
  verifyEmail/index.ts          # POST /verify-email
  resendVerification/index.ts   # POST /resend-verification
```

```ts
// routes/auth/index.ts
export const authRoutes = async (app: FastifyInstance) => {
  await app.register(registerRoute);
  await app.register(verifyEmailRoute);
};

// routes/auth/register/index.ts
export const registerRoute = async (app: FastifyInstance) => {
  app.post<{ Body: IRegisterRequest }>("/register", async (request, reply) => {
    // ...
  });
};
```

### Services

- Each function lives in its own subfolder (`services/<domain>/<function>/index.ts`)
- The domain `index.ts` re-exports all functions for convenient imports
- Arrow functions that receive `db: Database` as the first argument
- Contain business logic, call repository functions
- Return typed response objects (interfaces from `@tayemno/shared`)

```
services/auth/
  index.ts                      # re-exports register, verifyEmail, resendVerification
  register/index.ts             # register()
  verifyEmail/index.ts          # verifyEmail()
  resendVerification/index.ts   # resendVerification()
```

### Repositories

- All functions for a domain live in a single `index.ts` file (`repositories/<domain>/index.ts`)
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
import type {
  ICheckUsernameParams,
  ICheckUsernameResponse,
} from "@tayemno/shared";
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
