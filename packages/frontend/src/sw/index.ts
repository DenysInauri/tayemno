/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// @ts-ignore
import sodium from "libsodium-wrappers-sumo";
import {
  SW_MSG_REGISTER_PREVIEW,
  SW_MSG_DEREGISTER_PREVIEW,
  SW_FILE_PREFIX,
  isAllowedInlineContentType,
  type ISwPreviewRegistration,
  type ISwPreviewDeregistration,
} from "./protocol";

interface IPendingPreview {
  presignedUrl: string;
  keyHex: string;
  contentNonce: string;
  contentType: string;
}

const MAX_PENDING = 16;
const previews = new Map<string, IPendingPreview>();

const CHUNK_SIZE = 64 * 1024;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data as ISwPreviewRegistration | ISwPreviewDeregistration;

  if (data.type === SW_MSG_REGISTER_PREVIEW) {
    if (previews.size >= MAX_PENDING) {
      const oldest = previews.keys().next().value;
      if (oldest !== undefined) previews.delete(oldest);
    }

    previews.set(data.id, {
      presignedUrl: data.presignedUrl,
      keyHex: data.keyHex,
      contentNonce: data.contentNonce,
      contentType: data.contentType,
    });

    event.ports[0]?.postMessage({ ok: true });
    return;
  }

  if (data.type === SW_MSG_DEREGISTER_PREVIEW) {
    previews.delete(data.id);
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SW_FILE_PREFIX)) return;
  if (event.request.method !== "GET") return;

  const id = decodeURIComponent(url.pathname.slice(SW_FILE_PREFIX.length));
  const preview = previews.get(id);

  if (!preview) {
    event.respondWith(new Response("not found", { status: 404 }));
    return;
  }

  if (!isAllowedInlineContentType(preview.contentType)) {
    event.respondWith(new Response("forbidden content type", { status: 403 }));
    return;
  }

  event.respondWith(handlePreview(preview));
});

const handlePreview = async (preview: IPendingPreview): Promise<Response> => {
  try {
    await sodium.ready;

    const key = sodium.from_hex(preview.keyHex);
    const header = sodium.from_base64(
      preview.contentNonce,
      sodium.base64_variants.ORIGINAL,
    );

    const encryptedResponse = await fetch(preview.presignedUrl);

    if (!encryptedResponse.ok) {
      return new Response("failed to fetch encrypted file", { status: 502 });
    }

    const encryptedBlob = await encryptedResponse.blob();
    const totalBytes = encryptedBlob.size;
    const ENCRYPTED_CHUNK_SIZE =
      CHUNK_SIZE + sodium.crypto_secretstream_xchacha20poly1305_ABYTES;

    const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(
      header,
      key,
    );

    const stream = new ReadableStream({
      start(controller) {
        let offset = 0;

        const processChunk = async () => {
          while (offset < totalBytes) {
            const end = Math.min(offset + ENCRYPTED_CHUNK_SIZE, totalBytes);
            const slice = encryptedBlob.slice(offset, end);
            const buffer = new Uint8Array(await slice.arrayBuffer());

            const result = sodium.crypto_secretstream_xchacha20poly1305_pull(
              state,
              buffer,
              null,
            );

            if (!result) {
              controller.error(
                new Error("Decryption failed: corrupted or tampered data"),
              );
              return;
            }

            controller.enqueue(result.message);
            offset = end;
          }

          controller.close();
        };

        processChunk().catch((err) => controller.error(err));
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": preview.contentType,
        "Content-Security-Policy": "sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("preview failed", { status: 502 });
  }
};
