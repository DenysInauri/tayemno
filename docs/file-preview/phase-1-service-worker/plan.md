# Phase 1 -- Service Worker Infrastructure

**Size**: 6 new files, 1 modified file. Medium phase -- the SW itself is ~120 lines, protocol ~40 lines, registration utility ~30 lines, Vite config change ~15 lines.

**Why this approach is sufficient -- don't add anything beyond this**: This phase creates the minimal SW that can receive a file registration (presigned URL + decryption keys + MIME type), download the encrypted blob, decrypt it, and serve it at a stable URL. No Range request support, no progress reporting, no download interception, no update prompt, no logout cleanup. Those are explicitly out of scope -- the SW only needs to serve one file at a time for Phase 2's image preview. The bounded registry (max 16 entries) prevents unbounded memory growth without needing explicit cleanup.

## Steps

### 1. Create `src/sw/protocol.ts` -- shared constants and types

New file at `packages/frontend/src/sw/protocol.ts`.

This file is imported by BOTH the SW entry point and the main-thread registration utility, so it must contain no DOM or SW-specific APIs.

```ts
// Message types (main thread -> SW via postMessage)
export const SW_MSG_REGISTER_PREVIEW = "REGISTER_PREVIEW";
export const SW_MSG_DEREGISTER_PREVIEW = "DEREGISTER_PREVIEW";

// URL prefix the SW intercepts
export const SW_FILE_PREFIX = "/sw/file/";

// Content-type allowlist for inline serving (defense-in-depth)
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/x-icon",
  "image/apng",
  "image/avif",
]);

export const isAllowedInlineContentType = (ct: string): boolean =>
  ALLOWED_IMAGE_TYPES.has(ct.toLowerCase());

// Shape of the registration message data
export interface ISwPreviewRegistration {
  type: typeof SW_MSG_REGISTER_PREVIEW;
  id: string;
  presignedUrl: string;
  keyHex: string;
  contentNonce: string; // base64
  contentType: string;
}

export interface ISwPreviewDeregistration {
  type: typeof SW_MSG_DEREGISTER_PREVIEW;
  id: string;
}
```

### 2. Create `src/sw/index.ts` -- the service worker entry point

New file at `packages/frontend/src/sw/index.ts`.

Pattern to follow: Filen's `src/sw/sw.ts` structure, but drastically simplified. No client lifecycle, no zip/stream downloads, no progress reporting, no keepalive.

```ts
/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import sodium from "libsodium-wrappers-sumo";
import {
  SW_MSG_REGISTER_PREVIEW,
  SW_MSG_DEREGISTER_PREVIEW,
  SW_FILE_PREFIX,
  isAllowedInlineContentType,
  type ISwPreviewRegistration,
  type ISwPreviewDeregistration,
} from "./protocol";
```

**Pending registry**: A simple `Map<string, PendingPreview>` with a max size of 16. When full, evict the oldest entry (insertion order via `Map.keys().next()`).

```ts
interface IPendingPreview {
  presignedUrl: string;
  keyHex: string;
  contentNonce: string;
  contentType: string;
}

const MAX_PENDING = 16;
const previews = new Map<string, IPendingPreview>();
```

**Message handler**: Listen for `message` events. On `REGISTER_PREVIEW`, store the entry and reply `{ ok: true }` via `event.ports[0]`. On `DEREGISTER_PREVIEW`, delete the entry.

**Activate handler**: Call `self.clients.claim()` so the SW controls the page immediately after registration.

**Install handler**: Call `self.skipWaiting()` to activate immediately (no update prompt needed in Phase 1).

**Fetch handler**:
1. Only intercept same-origin GET requests whose pathname starts with `SW_FILE_PREFIX`.
2. Extract the `id` from the pathname.
3. Look up the pending preview. If not found, respond 404.
4. Re-validate `contentType` against `isAllowedInlineContentType`. If not allowed, respond 403.
5. `await sodium.ready` (lazy WASM init on first use).
6. Fetch the encrypted blob from `presignedUrl`.
7. Decrypt using the same XChaCha20-Poly1305 streaming algorithm as `StreamCrypto.decryptFile`:
   - `crypto_secretstream_xchacha20poly1305_init_pull(header, key)`
   - Read encrypted blob in chunks of `CHUNK_SIZE + ABYTES`
   - Push decrypted chunks into a `ReadableStream`
8. Respond with `new Response(decryptedStream, { status: 200, headers })`.
9. Headers: `Content-Type` from registration, `Content-Security-Policy: sandbox`, `X-Content-Type-Options: nosniff`. No `Content-Disposition` (inline, not attachment).

**Decryption detail**: The decrypt logic mirrors `StreamCrypto.decryptFile` exactly:
- `CHUNK_SIZE = 64 * 1024`
- `ENCRYPTED_CHUNK_SIZE = CHUNK_SIZE + sodium.crypto_secretstream_xchacha20poly1305_ABYTES`
- Key from hex: `sodium.from_hex(keyHex)`
- Header from base64: `sodium.from_base64(contentNonce, sodium.base64_variants.ORIGINAL)`
- Loop through encrypted blob in `ENCRYPTED_CHUNK_SIZE` chunks, calling `crypto_secretstream_xchacha20poly1305_pull`

**Error handling**: If fetch or decryption fails, respond with `new Response("preview failed", { status: 502 })`.

### 3. Create `src/utils/serviceWorker/index.ts` -- main-thread registration utility

New file at `packages/frontend/src/utils/serviceWorker/index.ts`.

Exports three functions:

```ts
export const registerServiceWorker = async (): Promise<void> => {
  if (!("serviceWorker" in navigator)) return;
  await navigator.serviceWorker.register(
    import.meta.env.DEV
      ? new URL("../../sw/index.ts", import.meta.url)
      : new URL("../../sw/index.js", import.meta.url),
    { type: "module", scope: "/" }
  );
  // Wait for controller to be available
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
    });
  }
};
```

**Note on dev vs prod URL**: In dev mode, Vite serves `.ts` files directly via its dev server transform pipeline when the SW is registered with `type: "module"`. In production, the built `.js` file is used. The `new URL(..., import.meta.url)` pattern lets Vite resolve and bundle the SW entry correctly.

```ts
export const registerPreview = async (
  id: string,
  presignedUrl: string,
  keyHex: string,
  contentNonce: string,
  contentType: string,
): Promise<boolean> => {
  const sw = navigator.serviceWorker.controller;
  if (!sw) return false;

  const { port1, port2 } = new MessageChannel();

  return new Promise<boolean>((resolve) => {
    port1.onmessage = (e) => resolve(e.data?.ok === true);
    sw.postMessage(
      { type: SW_MSG_REGISTER_PREVIEW, id, presignedUrl, keyHex, contentNonce, contentType },
      [port2],
    );
  });
};

export const deregisterPreview = (id: string): void => {
  navigator.serviceWorker.controller?.postMessage(
    { type: SW_MSG_DEREGISTER_PREVIEW, id },
  );
};

export const getPreviewUrl = (id: string): string =>
  `${SW_FILE_PREFIX}${encodeURIComponent(id)}`;
```

### 4. Update `vite.config.ts` -- add SW build configuration

Existing file at `packages/frontend/vite.config.ts`.

Before:
```ts
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, "../.."),
});
```

After:
```ts
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, "../.."),
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        sw: path.resolve(__dirname, "src/sw/index.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === "sw" ? "sw/index.js" : "assets/[name]-[hash].js",
      },
    },
  },
});
```

This gives the SW a stable output path (`/sw/index.js`) that matches the registration URL. The main app bundle continues using hashed filenames.

**Dev mode**: Vite's dev server can serve the `.ts` source directly because the SW is registered with `type: "module"`. But the dev server needs a header to allow SW scope. Add to Vite config:

```ts
server: {
  headers: {
    "Service-Worker-Allowed": "/",
  },
},
```

### 5. Register the SW on app startup

Modify `packages/frontend/src/main.tsx`.

Before:
```tsx
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    ...
  </StrictMode>,
);
```

After -- add SW registration BEFORE the render call:
```tsx
import { registerServiceWorker } from "./utils/serviceWorker";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    ...
  </StrictMode>,
);
```

The registration is fire-and-forget (no `await`). The SW activates in the background. Components that need the SW (Phase 2) will check `navigator.serviceWorker.controller` before using it.

### 6. Add TypeScript config for the SW

The SW uses `ServiceWorkerGlobalScope` which requires `lib: ["webworker"]` in tsconfig. Since the SW can't include DOM types (conflicts with `webworker`), it needs a separate tsconfig.

Create `packages/frontend/tsconfig.sw.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "WebWorker"],
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src/sw/**/*.ts"]
}
```

The existing `tsconfig.json` should exclude `src/sw/` to avoid type conflicts between DOM and WebWorker libs. Add `"exclude": ["src/sw"]` if not already present.

## Verification

1. `npm run build -w packages/frontend` -- must succeed. Check that `dist/sw/index.js` exists alongside `dist/index.html`.
2. `npm run dev -w packages/frontend` -- open browser, check DevTools > Application > Service Workers. The SW should be registered and active.
3. In DevTools Console, run: `navigator.serviceWorker.controller` -- should not be null.
4. Navigate to `http://localhost:5173/sw/file/nonexistent` -- should get a 404 response (from the SW, not Vite's dev server).
