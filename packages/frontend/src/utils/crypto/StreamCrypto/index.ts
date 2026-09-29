import sodium from "libsodium-wrappers-sumo";

const CHUNK_SIZE = 64 * 1024;

export class StreamCrypto {
  private static async init(): Promise<void> {
    await sodium.ready;
  }

  static async encryptFile(
    file: File,
    keyHex: string,
  ): Promise<{ header: string; encryptedBlob: Blob }> {
    await this.init();

    const key = sodium.from_hex(keyHex);
    const { state, header } =
      sodium.crypto_secretstream_xchacha20poly1305_init_push(key);

    const chunks: Uint8Array[] = [];
    const totalBytes = file.size;
    let offset = 0;

    while (offset < totalBytes) {
      const end = Math.min(offset + CHUNK_SIZE, totalBytes);
      const slice = file.slice(offset, end);
      const buffer = new Uint8Array(await slice.arrayBuffer());

      const isLast = end === totalBytes;
      const tag = isLast
        ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
        : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;

      const encryptedChunk =
        sodium.crypto_secretstream_xchacha20poly1305_push(
          state,
          buffer,
          null,
          tag,
        );

      chunks.push(encryptedChunk);
      offset = end;
    }

    return {
      header: sodium.to_base64(header, sodium.base64_variants.ORIGINAL),
      encryptedBlob: new Blob(
        chunks.map((c) => new Uint8Array(c) as BlobPart),
        { type: "application/octet-stream" },
      ),
    };
  }

  static async decryptFile(
    encryptedBlob: Blob,
    keyHex: string,
    headerBase64: string,
  ): Promise<Blob> {
    await this.init();

    const key = sodium.from_hex(keyHex);
    const header = sodium.from_base64(headerBase64, sodium.base64_variants.ORIGINAL);
    const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, key);

    const chunks: Uint8Array[] = [];
    const totalBytes = encryptedBlob.size;
    const ENCRYPTED_CHUNK_SIZE = CHUNK_SIZE + sodium.crypto_secretstream_xchacha20poly1305_ABYTES;
    let offset = 0;

    while (offset < totalBytes) {
      const end = Math.min(offset + ENCRYPTED_CHUNK_SIZE, totalBytes);
      const slice = encryptedBlob.slice(offset, end);
      const buffer = new Uint8Array(await slice.arrayBuffer());

      const result = sodium.crypto_secretstream_xchacha20poly1305_pull(state, buffer, null);

      if (!result) {
        throw new Error("Decryption failed: corrupted or tampered data");
      }

      chunks.push(result.message);
      offset = end;
    }

    return new Blob(
      chunks.map((c) => new Uint8Array(c) as BlobPart),
    );
  }
}
