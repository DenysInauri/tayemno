# Phase 2 -- Image Preview

**Size**: ~8 new files, ~4 modified files. Medium-large phase -- the preview overlay, image viewer with zoom/pan, usePreview hook, file-type categorization, i18n keys, and wiring into VaultListItem.

**Why this approach is sufficient -- don't add anything beyond this**: This phase adds image preview only. No text/code viewer, no PDF viewer, no video player, no editable content. The file-type categorization returns "image" or "other" -- don't add categories for file types we aren't handling yet. The zoom/pan implementation uses pointer events and CSS transforms -- don't add a third-party zoom library. The preview overlay uses Mantine's fullscreen Modal -- don't build a custom overlay.

## Steps

### 1. Create `src/utils/fileCategory/index.ts` -- file type categorization

New file. Maps a file extension to a preview category.

```ts
export type FileCategory = "image" | "other";

const IMAGE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "apng", "avif",
]);

export const getFileCategory = (extension: string): FileCategory =>
  IMAGE_EXTENSIONS.has(extension.toLowerCase()) ? "image" : "other";
```

That's it. No "video", "pdf", "code" categories yet -- those are future phases.

### 2. Create `src/api/hooks/useGetVaultDownloadUrl/index.ts` -- Layer 2 hook for download URL

New file. Follows the existing two-layer API hook pattern (see `api-guide.md`).

```ts
import { axios } from "../../index";
import { EndpointEnum } from "../../../enums/api/EndpointEnum";

interface IDownloadUrlResponse {
  presignedUrl: string;
}

export const getVaultDownloadUrl = async (
  workspaceId: string,
  vaultId: string,
): Promise<string> => {
  const { data } = await axios.get<IDownloadUrlResponse>(
    `${EndpointEnum.WORKSPACES}/${workspaceId}${EndpointEnum.VAULTS}/${vaultId}/download-url`,
  );
  return data.presignedUrl;
};
```

This is a plain async function (not a TanStack Query hook) because the preview flow calls it imperatively, not declaratively. It matches the existing pattern used by `DownloadContext` at line 91-93 but extracts it to a reusable function.

### 3. Create `src/components/files/PreviewOverlay/index.tsx` -- fullscreen preview modal

New file. Uses Mantine `Modal` with `fullScreen` prop.

**Props**:
```ts
interface IProps {
  vault: ILocalVault | null;  // null = closed
  vaults: ILocalVault[];      // all vaults in current listing, for prev/next
  onClose: () => void;
  onNavigate: (vault: ILocalVault) => void;
}
```

**Layout** (inside fullscreen Modal):
- **Header bar** (top): File name (left), close button (right), download button.
- **Body** (center, flex: 1): Renders the appropriate viewer based on `getFileCategory(vault.extension)`:
  - `"image"` → `<ImageViewer />`
  - `"other"` → `<UnsupportedPreview />` (message + download button)
- **Footer bar** (bottom, optional): Prev/Next buttons if `vaults.length > 1`. Show current index like "3 / 12".

**Navigation**:
- Left/Right arrow keys call `onNavigate` with the prev/next vault. Wrap around at boundaries.
- Keyboard listener added via `useEffect`, cleaned up on unmount.

**Size guard**: If `vault.sizeBytes > 100 * 1024 * 1024` (100 MiB), show `<TooLargePreview />` instead of the viewer.

The overlay does NOT handle fetching or decryption -- that's the viewer's job via `usePreview`.

### 4. Create `src/components/files/PreviewOverlay/usePreview.ts` -- hook for preview URL

New file (co-located with PreviewOverlay). Manages the lifecycle: get download URL → register with SW → return preview URL → deregister on cleanup.

```ts
interface IUsePreviewResult {
  url: string | null;
  isLoading: boolean;
  error: string | null;
}

export const usePreview = (vault: ILocalVault | null): IUsePreviewResult => {
  // ...
};
```

**Flow**:
1. When `vault` changes (and is not null), generate a unique `id` via `crypto.randomUUID()`.
2. Call `getVaultDownloadUrl(vault.workspaceId, vault.id)` to get presigned URL.
3. Call `registerPreview(id, presignedUrl, vault.symmetricKey, vault.contentNonce, vault.mimeType)`.
4. If registration succeeds, set `url = getPreviewUrl(id)`.
5. On cleanup (vault changes or unmount), call `deregisterPreview(id)`.

**States**:
- `isLoading = true` while fetching download URL and registering.
- `error` set if download URL fetch or SW registration fails.
- `url` set once the SW is ready to serve.

**Abort**: Use `AbortController` to cancel the download URL fetch if vault changes before it completes.

Uses `useAuth()` to get `workspace.id` for the API call.

### 5. Create `src/components/files/PreviewOverlay/ImageViewer/index.tsx` -- image viewer with zoom/pan

New file. Renders the preview URL in an `<img>` element with zoom and pan controls.

**Props**:
```ts
interface IProps {
  url: string;        // The SW preview URL
  fileName: string;   // For alt text
}
```

**Features**:
- Image displayed in a container that fills the modal body, centered via flexbox.
- `object-fit: contain` by default (fit image to viewport).
- **Zoom**: Mouse wheel zooms in/out. Zoom range: 0.5x to 5x. Zoom toward cursor position (not center).
- **Pan**: When zoomed in (> 1x), click-and-drag to pan. Cursor changes to `grab`/`grabbing`.
- **Double-click**: Toggle between 1x (fit) and 2x zoom.
- **Reset**: Pressing Escape or navigating resets zoom to 1x.

**Implementation**: Use CSS `transform: scale(X) translate(Y, Z)` on the `<img>` element. Track `scale`, `translateX`, `translateY` in state. Pointer events for drag (`onPointerDown`, `onPointerMove`, `onPointerUp` with `setPointerCapture`). Wheel event for zoom with `deltaY`.

No third-party library -- pure math and pointer events, following Filen's approach.

**Loading state**: While `<img>` is loading (`onLoad` not yet fired), show a `Loader` spinner from Mantine.

**Error state**: If `<img>` fires `onError`, show error message.

### 6. Create `src/components/files/PreviewOverlay/UnsupportedPreview/index.tsx`

New file. Simple centered message: "Preview not available for this file type" with a download button.

```ts
interface IProps {
  vault: ILocalVault;
}
```

Uses `useDownload()` to trigger the existing download flow.

### 7. Create `src/components/files/PreviewOverlay/TooLargePreview/index.tsx`

New file. Similar to UnsupportedPreview but with message: "This file is too large to preview" + file size display + download button.

### 8. Wire `VaultListItem` to open preview

Modify `packages/frontend/src/components/files/VaultListItem/index.tsx`.

Currently `onClick={() => {}}` (line 43). Change to call a callback that opens the preview overlay.

**Option A**: VaultListItem receives an `onPreview` callback from its parent.
**Option B**: VaultListItem manages its own preview state.

**Decision**: The preview overlay needs the full vault list (for prev/next navigation), which VaultListItem doesn't have. The overlay should live in the parent that HAS the vault list. Two valid approaches:

- **Approach 1**: Lift preview state to `VirtualizedFileTable` or its parent page. VaultListItem receives `onPreview(vault)` as a prop.
- **Approach 2**: Use React context for preview state.

**Recommended: Approach 1** -- simpler, no new context needed. The executing session must choose based on where VirtualizedFileTable is rendered and whether the parent has access to the vaults list. Check the component tree upward from VaultListItem.

### 9. Add i18n keys

Add to `packages/frontend/src/i18n/locales/en.json` under a new `"preview"` section:

```json
"preview": {
  "close": "Close",
  "download": "Download",
  "previous": "Previous",
  "next": "Next",
  "unsupported": {
    "title": "Preview not available",
    "description": "This file type cannot be previewed. Download it to view."
  },
  "tooLarge": {
    "title": "File too large to preview",
    "description": "This file is {{size}}. Files over 100 MB cannot be previewed."
  },
  "error": {
    "title": "Failed to load preview",
    "description": "Something went wrong while loading the preview."
  },
  "loading": "Loading preview...",
  "counter": "{{current}} / {{total}}"
}
```

## Verification

1. `npm run build -w packages/frontend` -- must succeed.
2. `npx tsc --noEmit -p packages/frontend/tsconfig.json` -- must pass.
3. Dev server: Click on a .jpg/.png file in the file listing → fullscreen preview opens with the image rendered.
4. Dev server: Zoom with mouse wheel, pan by dragging while zoomed, double-click to toggle zoom.
5. Dev server: Arrow keys navigate to prev/next file. Counter updates.
6. Dev server: Click a .pdf or unknown file → "Preview not available" message with download button.
7. Dev server: Close preview via X button or Escape key.
8. DevTools Network tab: Confirm the image request goes through the SW (check Response headers for `Content-Security-Policy: sandbox`).
