# File Preview

Adds the ability to preview encrypted files directly in the browser without downloading them. Files are decrypted client-side via a service worker that intercepts fetch requests and serves decrypted bytes at stable same-origin URLs. The first supported format is images; future phases will add text, code, PDF, video, and other viewers.

## Decisions

1. **Service worker for serving decrypted content** -- A SW intercepts requests to `/sw/file/<id>`, downloads the encrypted blob from S3, decrypts it using libsodium XChaCha20-Poly1305, and serves the response with the correct Content-Type. This avoids holding both encrypted + decrypted copies in main-thread memory simultaneously. Approved.
2. **SW as a separate phase** -- The SW is general-purpose infrastructure, decoupled from any specific viewer UI. It can later be reused for downloads, video streaming, etc. Approved.
3. **Images only in Phase 2** -- Start with image preview (jpg, png, gif, webp, svg, bmp, ico, avif). Other viewers added in later initiatives. Approved.
4. **Fullscreen Mantine Modal** -- Preview overlay uses the existing `Modal` wrapper with `fullScreen` prop. Approved.
5. **100 MiB preview size limit** -- Files over 100 MiB show a "too large to preview" message with a download button. Approved.
6. **Read-only previews** -- No inline editing. Editing is a separate initiative. Approved.
7. **Buffer approach for Phase 2, streaming later** -- The SW downloads the full file and decrypts before serving the response (no partial/streaming decryption). Sufficient for images. Streaming with Range support can be added in a future phase for video. Approved.

## Verified Findings

### Tayemno codebase

- **No preview exists** -- `VaultListItem/index.tsx:43` has `onClick={() => {}}` (no-op). The only way to view files is downloading.
- **No service worker** -- Confirmed via grep; no SW files in `src/`.
- **StreamCrypto** -- `utils/crypto/StreamCrypto/index.ts` encrypts/decrypts files with XChaCha20-Poly1305 in 64KB chunks. Key as hex string, header as base64. Same algorithm will be reimplemented inside the SW.
- **fetchWithProgress** -- `utils/fetchWithProgress/index.ts` downloads from S3 presigned URLs using ReadableStream reader. Pattern reusable in SW.
- **ILocalVault** -- `types/local.ts` has `mimeType`, `extension`, `sizeBytes`, `symmetricKey`, `contentNonce`, `s3Key` -- all fields needed for preview registration.
- **Download URL endpoint** -- `GET /workspaces/:workspaceId/vaults/:vaultId/download-url` returns `{ presignedUrl }`. Frontend uses `EndpointEnum.WORKSPACES` + workspace ID + `EndpointEnum.VAULTS` path.
- **Modal wrapper** -- `components/ui/Modal/index.tsx` wraps Mantine `Modal` with `IProps extends ModalProps`.
- **Vite config** -- `vite.config.ts` is minimal: `plugins: [react()]`, `envDir: path.resolve(__dirname, "../..")`. Will need modification for SW build entry.
- **libsodium WASM is inlined** -- `libsodium-sumo` ships as a single JS file with base64-encoded WASM (~1.1MB). No separate `.wasm` fetch needed. Safe to import directly in SW.
- **Package location** -- `libsodium-wrappers-sumo` is hoisted to root `node_modules/` (monorepo). ESM entry at `dist/modules-sumo-esm/libsodium-wrappers.mjs`.

### Filen reference (open-source, verified from GitHub)

- **SW entry** -- `packages/filen-web/src/sw/sw.ts` handles `message`, `activate`, and `fetch` events.
- **Protocol** -- `packages/filen-web/src/lib/sw/protocol.ts` defines message types (`SW_MSG_REGISTER_PREVIEW`, `SW_MSG_INIT_CLIENT`, etc.) and content-type allowlist.
- **Registration** -- Main thread sends `postMessage` with file metadata + encryption keys via `MessageChannel`. SW stores in a `PendingRegistry` (bounded LRU map).
- **Fetch interception** -- SW matches `url.pathname.startsWith(SW_DOWNLOAD_PREFIX)` (`/sw/download/`), looks up the pending entry, streams decrypted bytes.
- **Security headers** -- Preview responses get `Content-Security-Policy: sandbox` and `X-Content-Type-Options: nosniff`. Only allowlisted MIME types served inline; others fall back to forced attachment.
- **Content-type allowlist** -- Video/audio: regex `^(video|audio)\/[a-z0-9.+-]+$`. Images: explicit set (jpeg, png, gif, webp, svg+xml, bmp, ico, apng, avif).
- **No Range support needed for images** -- Filen's Range/piece logic is for video seeking. Images are served as full 200 responses.

## Behavioral Changes

- Clicking a file row in the file list opens a fullscreen preview overlay (instead of doing nothing).
- Images (jpg, png, gif, webp, svg, bmp, ico, avif) render inline with zoom/pan controls.
- Non-previewable files show a "preview not available" message with a download button.
- Files over 100 MiB show "too large to preview" with a download button.
- Left/right arrow keys navigate between files in the preview overlay.
- A service worker is registered on app load and controls the page.

## Phase Table

| Phase | Name | Plan | Depends On |
|-------|------|------|------------|
| 1 | Service Worker Infrastructure | [phase-1-service-worker/plan.md](phase-1-service-worker/plan.md) | -- |
| 2 | Image Preview | [phase-2-image-preview/plan.md](phase-2-image-preview/plan.md) | Phase 1 |

## Out of Scope

- File editing / save-back-to-S3
- Thumbnail generation for file listing
- Service worker streaming with Range/206 support (for video seeking)
- Viewers for: text, code, markdown, PDF, DOCX, spreadsheets, video, audio, HEIC, camera RAW
- Refactoring `DownloadProvider` to use the SW
- Web worker for offloading metadata decryption
- Mobile preview support (app is desktop/tablet only)
- Archive (zip/tar) browsing
- Preview caching beyond browser memory
- SW update prompt UI (silent registration is sufficient for now)
- Logout-triggered SW key material cleanup (can be added when auth lifecycle is extended)
