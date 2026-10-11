import {
  SW_MSG_REGISTER_PREVIEW,
  SW_MSG_DEREGISTER_PREVIEW,
  SW_FILE_PREFIX,
} from "../../sw/protocol";

export const registerServiceWorker = async (): Promise<void> => {
  if (!("serviceWorker" in navigator)) return;

  await navigator.serviceWorker.register(
    import.meta.env.DEV
      ? new URL("../../sw/index.ts", import.meta.url)
      : new URL("../../sw/index.js", import.meta.url),
    { type: "module", scope: "/" },
  );

  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => resolve(),
        { once: true },
      );
    });
  }
};

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
      {
        type: SW_MSG_REGISTER_PREVIEW,
        id,
        presignedUrl,
        keyHex,
        contentNonce,
        contentType,
      },
      [port2],
    );
  });
};

export const deregisterPreview = (id: string): void => {
  navigator.serviceWorker.controller?.postMessage({
    type: SW_MSG_DEREGISTER_PREVIEW,
    id,
  });
};

export const getPreviewUrl = (id: string): string =>
  `${SW_FILE_PREFIX}${encodeURIComponent(id)}`;
