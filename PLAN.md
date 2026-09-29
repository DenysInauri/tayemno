# Plan: Nested Folders + HomePage Fixes

## Summary

Fix three bugs on `HomePage` (breadcrumb shows "...", root folders visible inside folder, can't upload at root) and add `parentFolderId` column for nested folder hierarchy. Each folder keeps independent symmetric keys — `parentFolderId` is purely structural.

## Phases

| # | Name | Content | Depends on |
|---|------|---------|------------|
| 1 | [Backend: schema + nested folders + root vaults](docs/nested-folders-homepage-fixes/phase-1-backend-schema/plan.md) | Add `parentFolderId` column, filter folders by parent, root-level vault query, update shared types. 10 steps, ~9 files. | — |
| 2 | [Frontend: hooks + components fixes](docs/nested-folders-homepage-fixes/phase-2-frontend-fixes/plan.md) | Update `useGetFolders`, `useGetVaults`, `useUploadVault`, `HomePage`, `AddNewEntity`, `UploadFileModal`, `FoldersList`. 8 steps, 7 files. | Phase 1 |

## Approved Decisions

1. Independent folder keys (no chain) — `parentFolderId` is UI hierarchy only.
2. Breadcrumb name via React Router `location.state`.
3. Folder encrypted key passed through props for upload.
4. `onDelete: "cascade"` on `parentFolderId` FK.

## Full docs

All details in `docs/nested-folders-homepage-fixes/README.md`.
