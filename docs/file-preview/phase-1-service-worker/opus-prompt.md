# Phase 1 -- Service Worker Infrastructure

You are implementing Phase 1 of the File Preview initiative for the Tayemno monorepo. Working from the repo root at `/Users/inaurifam/Desktop/tayemno`. The frontend is at `packages/frontend/`.

## Read first, in this exact order

1. `docs/file-preview/phase-1-service-worker/plan.md` -- the plan you must follow exactly.
2. `docs/file-preview/README.md` -- context, decisions, verified findings, scope boundaries.
3. `.claude/frontend/code-style.md` -- arrow functions only, interface naming (I prefix), folder-based structure.
4. `.claude/frontend/ui-guide.md` -- wrapper patterns, SizeEnum.
5. `packages/frontend/src/utils/crypto/StreamCrypto/index.ts` -- the decryption algorithm you must replicate in the SW. Pay close attention to `decryptFile`: chunk size, ABYTES, key from hex, header from base64, the pull loop.
6. `packages/frontend/src/utils/fetchWithProgress/index.ts` -- the fetch pattern you can reference for downloading from S3.
7. `packages/frontend/vite.config.ts` -- the current config you will modify.
8. `packages/frontend/src/main.tsx` -- where you will add SW registration.
9. `packages/frontend/tsconfig.json` -- check current compiler options and include/exclude.

## The task

Follow the plan exactly. In summary:

1. Create `src/sw/protocol.ts` with message types, URL prefix constant, content-type allowlist function, and registration/deregistration interfaces.
2. Create `src/sw/index.ts` -- the service worker entry point. It handles `install` (skipWaiting), `activate` (clients.claim), `message` (register/deregister preview entries in a bounded Map), and `fetch` (intercept `/sw/file/<id>`, download encrypted blob from S3, decrypt with libsodium XChaCha20-Poly1305 matching StreamCrypto's algorithm exactly, serve as Response with security headers).
3. Create `src/utils/serviceWorker/index.ts` with `registerServiceWorker`, `registerPreview`, `deregisterPreview`, and `getPreviewUrl` functions.
4. Update `vite.config.ts` to add the SW as a second build entry with stable output path `sw/index.js`, and add `Service-Worker-Allowed` header for dev server.
5. Update `src/main.tsx` to call `registerServiceWorker()` on startup (fire-and-forget, before render).
6. Create `tsconfig.sw.json` for the SW with `lib: ["WebWorker"]` and update the main tsconfig to exclude `src/sw/`.

## Explicitly forbidden in this phase

- Do NOT create any UI components, modals, overlays, or viewer components. That is Phase 2.
- Do NOT add any API hooks (`useGet*`, `usePost*`). Phase 2 handles that.
- Do NOT add Range request support or partial content (206) responses.
- Do NOT add progress reporting, download interception, or watched streams.
- Do NOT add logout/cleanup handlers or client lifecycle management.
- Do NOT add SW update prompts or version checking.
- Do NOT add i18n keys or translation entries.
- Do NOT modify any component files (`VaultListItem`, `FileListItem`, etc.).
- Do NOT install new npm dependencies -- `libsodium-wrappers-sumo` is already installed.

## Hard rules

- Arrow functions only -- no `function` keyword.
- Interfaces prefixed with `I` (e.g., `ISwPreviewRegistration`).
- Folder-based file structure: `componentName/index.tsx` for components, but utility files like `protocol.ts` can be standalone within their folder.
- Do NOT commit or push.
- Do NOT run destructive git commands.
- Do NOT modify files outside `packages/frontend/`.

## Verify

Run these commands after implementation:

```bash
# Build must succeed and produce the SW output
npm run build -w packages/frontend
ls packages/frontend/dist/sw/index.js  # must exist

# TypeScript must compile without errors
npx tsc --noEmit -p packages/frontend/tsconfig.json
npx tsc --noEmit -p packages/frontend/tsconfig.sw.json
```

Check `git diff --stat` -- only these paths should appear:
- `packages/frontend/src/sw/protocol.ts` (new)
- `packages/frontend/src/sw/index.ts` (new)
- `packages/frontend/src/utils/serviceWorker/index.ts` (new)
- `packages/frontend/vite.config.ts` (modified)
- `packages/frontend/src/main.tsx` (modified)
- `packages/frontend/tsconfig.json` (modified, if exclude added)
- `packages/frontend/tsconfig.sw.json` (new)

Nothing else should be in the diff.

## Report

When done, summarize:
1. Exact files created/modified with line counts.
2. Whether `npm run build` succeeded and `dist/sw/index.js` was produced.
3. Whether `tsc --noEmit` passed for both tsconfigs.
4. Any issues encountered and how they were resolved.
5. Any deviations from the plan (with justification).

Then stop -- the user reviews before Phase 2.
