# Phase 2 -- Image Preview

You are implementing Phase 2 of the File Preview initiative for the Tayemno monorepo. Working from the repo root at `/Users/inaurifam/Desktop/tayemno`. The frontend is at `packages/frontend/`.

## Step 0 -- Verify prerequisites

Phase 1 (Service Worker Infrastructure) must be complete. Verify these files exist:

- `packages/frontend/src/sw/protocol.ts` -- must export `SW_MSG_REGISTER_PREVIEW`, `SW_MSG_DEREGISTER_PREVIEW`, `SW_FILE_PREFIX`, `isAllowedInlineContentType`, `ISwPreviewRegistration`, `ISwPreviewDeregistration`.
- `packages/frontend/src/sw/index.ts` -- the SW entry point.
- `packages/frontend/src/utils/serviceWorker/index.ts` -- must export `registerServiceWorker`, `registerPreview`, `deregisterPreview`, `getPreviewUrl`.
- `packages/frontend/src/main.tsx` -- must call `registerServiceWorker()`.
- `packages/frontend/vite.config.ts` -- must have SW build entry and `Service-Worker-Allowed` header.

If ANY of these are missing or incomplete, STOP and report. Do not improvise Phase 1.

## Read first, in this exact order

1. `docs/file-preview/phase-2-image-preview/plan.md` -- the plan you must follow exactly.
2. `docs/file-preview/README.md` -- decisions, findings, scope.
3. `.claude/frontend/code-style.md` -- arrow functions, I prefix, folder structure, useMemo with early returns, !! for nullish checks.
4. `.claude/frontend/ui-guide.md` -- wrapper patterns, SizeEnum.
5. `.claude/frontend/api-guide.md` -- two-layer API hooks, EndpointEnum, QueryKeyEnum.
6. `packages/frontend/src/components/files/VaultListItem/index.tsx` -- you will modify this, note current structure.
7. `packages/frontend/src/components/files/VirtualizedFileTable/index.tsx` -- the parent that renders VaultListItem, note prop flow.
8. `packages/frontend/src/components/ui/Modal/index.tsx` -- the Modal wrapper you will use.
9. `packages/frontend/src/types/local.ts` -- ILocalVault shape (extension, mimeType, sizeBytes, symmetricKey, contentNonce).
10. `packages/frontend/src/contexts/DownloadContext/index.tsx` -- the download function you will call from preview actions.
11. `packages/frontend/src/contexts/AuthContext/index.tsx` -- workspace.id access pattern.
12. `packages/frontend/src/i18n/locales/en.json` -- existing i18n key structure.
13. `packages/frontend/src/utils/serviceWorker/index.ts` -- the SW client functions from Phase 1.
14. `packages/frontend/src/enums/api/EndpointEnum/index.ts` -- current endpoint values.
15. `packages/frontend/src/utils/formatFileSize/index.ts` -- for displaying file size in "too large" message.

Then trace the component tree upward from VaultListItem to understand where the preview state should live and where the PreviewOverlay should be rendered. The plan leaves this as an open decision -- you must investigate and choose the right location based on where the vaults list is available.

## The task

Follow the plan exactly. In summary:

1. Create `src/utils/fileCategory/index.ts` with `getFileCategory(extension)` returning `"image"` or `"other"`.
2. Create `src/api/hooks/useGetVaultDownloadUrl/index.ts` -- plain async function (not a query hook) that fetches the presigned URL.
3. Create `src/components/files/PreviewOverlay/index.tsx` -- fullscreen Modal with header (name + close + download), body (viewer dispatch based on file category), footer (prev/next + counter). Keyboard navigation with arrow keys.
4. Create `src/components/files/PreviewOverlay/usePreview.ts` -- hook managing SW registration lifecycle: get download URL → register preview → return URL → deregister on cleanup.
5. Create `src/components/files/PreviewOverlay/ImageViewer/index.tsx` -- `<img>` with zoom (wheel), pan (drag), double-click toggle. Pure pointer events + CSS transform, no library.
6. Create `src/components/files/PreviewOverlay/UnsupportedPreview/index.tsx` -- "Preview not available" + download button.
7. Create `src/components/files/PreviewOverlay/TooLargePreview/index.tsx` -- "File too large to preview" + size + download button.
8. Wire VaultListItem onClick to open preview. Lift preview state to whichever parent owns the vaults list.
9. Add i18n keys under `"preview"` in `en.json`.

## Explicitly forbidden in this phase

- Do NOT modify the service worker files from Phase 1 (`src/sw/*`).
- Do NOT modify `vite.config.ts` or `main.tsx` (Phase 1 already set those up).
- Do NOT add file categories beyond "image" and "other" (no "video", "pdf", "code").
- Do NOT add CodeMirror, pdfjs-dist, react-markdown, or any viewer libraries.
- Do NOT add a third-party zoom/pan library (react-zoom-pan-pinch, etc.).
- Do NOT make previews editable.
- Do NOT add thumbnail generation.
- Do NOT add Range request support or streaming.
- Do NOT create new contexts (React Context) for preview state -- use prop drilling from the parent that has the vaults list.
- Do NOT add mobile-specific styles or breakpoints.

## Hard rules

- Arrow functions only -- no `function` keyword.
- Interfaces prefixed with `I` (e.g., `IProps`, `IUsePreviewResult`).
- Folder-based file structure: `PreviewOverlay/index.tsx`, `ImageViewer/index.tsx`, etc.
- Use `SizeEnum` for all numeric spacing/padding/margin values.
- Use `useTranslation()` + `t()` for all user-visible strings.
- Use `!!value` for nullish checks, `useMemo` with early returns for derived values.
- Never pass inline `styles` to UI wrapper components.
- Import order: external libs first, then internal components/utils, separated by blank line.
- Do NOT commit or push.
- Do NOT run destructive git commands.
- Do NOT modify files outside `packages/frontend/`.

## Verify

Run these commands after implementation:

```bash
# Build must succeed
npm run build -w packages/frontend

# TypeScript must compile
npx tsc --noEmit -p packages/frontend/tsconfig.json
```

Manual testing:
1. Upload an image file (jpg, png, gif).
2. Click the file row → fullscreen preview opens, image loads via SW.
3. Zoom with mouse wheel, pan while zoomed, double-click to toggle.
4. Arrow keys navigate between files.
5. Close with Escape or X button.
6. Click a non-image file → "Preview not available" message shown.
7. Check DevTools Network: image request served by SW with `Content-Security-Policy: sandbox` header.

Check `git diff --stat` -- only these paths should appear:
- `packages/frontend/src/utils/fileCategory/index.ts` (new)
- `packages/frontend/src/api/hooks/useGetVaultDownloadUrl/index.ts` (new)
- `packages/frontend/src/components/files/PreviewOverlay/index.tsx` (new)
- `packages/frontend/src/components/files/PreviewOverlay/usePreview.ts` (new)
- `packages/frontend/src/components/files/PreviewOverlay/ImageViewer/index.tsx` (new)
- `packages/frontend/src/components/files/PreviewOverlay/UnsupportedPreview/index.tsx` (new)
- `packages/frontend/src/components/files/PreviewOverlay/TooLargePreview/index.tsx` (new)
- `packages/frontend/src/components/files/VaultListItem/index.tsx` (modified)
- `packages/frontend/src/components/files/VirtualizedFileTable/index.tsx` (modified, OR whichever parent gets the preview state)
- `packages/frontend/src/i18n/locales/en.json` (modified)

Nothing else should be in the diff (other than potentially a parent page component if that's where preview state lives).

## Report

When done, summarize:
1. Exact files created/modified with line counts.
2. Where you placed the preview state (which component) and why.
3. Whether `npm run build` succeeded.
4. Whether `tsc --noEmit` passed.
5. Any deviations from the plan (with justification).

Then stop -- the user reviews before the next initiative.
