# Tayemno

Monorepo with a React (Vite + Mantine) frontend, Fastify backend, and shared packages.

## Project Structure

```
packages/
  frontend/   # React SPA (Vite, Mantine, Formik, Yup, i18next)
    src/
      validations/   # Yup schemas (one per form, i18n keys as error messages)
  backend/    # Fastify REST API (Drizzle ORM, PostgreSQL)
  shared/     # Shared types and utilities
```

## Documentation

- [Frontend Code Style](frontend/code-style.md) — arrow functions, interface naming, form patterns, validation schemas, i18n key structure
- [Frontend UI Guide](frontend/ui-guide.md) — wrapper component patterns, folder conventions, SizeEnum usage
- [Frontend API Guide](frontend/api-guide.md) — two-layer hook pattern, QueryKeyEnum, EndpointEnum, mutation/query examples
- [Backend Architecture](backend/architecture.md) — three-layer architecture, routes/services/repositories, Drizzle ORM, code style
- [Encryption Key Hierarchy](encryption-key-hierarchy.md) — E2EE key derivation, hierarchy, sharing model, storage mapping

## Desktop Only

The frontend targets desktop and tablet viewports only. Mobile viewports show a full-screen block message (`MobileBlockScreen` component in `main.tsx`). Do not add mobile-specific responsive styles or breakpoints to pages and components.

## Quick Start

```bash
npm install           # install all workspace dependencies
npm run dev -w packages/frontend   # start frontend dev server
```

## Build

```bash
npm run build -w packages/frontend
```

## Git

- Never include `Co-Authored-By` in commit messages.
