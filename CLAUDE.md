# Tayemno

Monorepo with a React (Vite + Mantine) frontend and shared packages.

## Project Structure

```
packages/
  frontend/   # React SPA (Vite, Mantine, Formik, Yup, i18next)
  shared/     # Shared types and utilities
```

## Documentation

- [UI Guide](docs/ui-guide.md) — wrapper component patterns, folder conventions, SizeEnum usage
- [Code Style Guide](docs/code-style-guide.md) — arrow functions, interface naming, form patterns, i18n key structure
- [API Guide](docs/api-guide.md) — two-layer hook pattern, QueryKeyEnum, EndpointEnum, mutation/query examples
- [Encryption Key Hierarchy](docs/encryption-key-hierarchy.md) — E2EE key derivation, hierarchy, sharing model, storage mapping

## Quick Start

```bash
npm install           # install all workspace dependencies
npm run dev -w packages/frontend   # start frontend dev server
```

## Build

```bash
npm run build -w packages/frontend
```
