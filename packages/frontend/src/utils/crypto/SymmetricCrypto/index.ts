import sodium from "libsodium-wrappers-sumo";

export interface EncryptedPayload {
  nonce: string;
  ciphertext: string;
}

export class SymmetricCrypto {
  private static async init(): Promise<void> {
    await sodium.ready;
  }

  static async generateKey(): Promise<string> {
    await this.init();

    const key = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();

    return sodium.to_hex(key);
  }

  static async encrypt(
    plaintext: string,
    keyHex: string,
    additionalData?: string,
  ): Promise<EncryptedPayload> {
    await this.init();

    const key = this.parseKey(keyHex);

    const nonce = sodium.randombytes_buf(
      sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES,
    );

    const message = sodium.from_string(plaintext);

    const aad = additionalData ? sodium.from_string(additionalData) : null;

    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      message,
      aad,
      null,
      nonce,
      key,
    );

    return {
      nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
      ciphertext: sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL),
    };
  }

  static async decrypt(
    payload: EncryptedPayload,
    keyHex: string,
    additionalData?: string,
  ): Promise<string> {
    await this.init();

    const key = this.parseKey(keyHex);

    const nonce = sodium.from_base64(
      payload.nonce,
      sodium.base64_variants.ORIGINAL,
    );

    const ciphertext = sodium.from_base64(
      payload.ciphertext,
      sodium.base64_variants.ORIGINAL,
    );

    const aad = additionalData ? sodium.from_string(additionalData) : null;

    try {
      const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        ciphertext,
        aad,
        nonce,
        key,
        "uint8array",
      );

      return sodium.to_string(plaintext);
    } catch {
      throw new Error("Decryption failed: invalid key, AAD, or ciphertext");
    }
  }

  private static parseKey(keyHex: string): Uint8Array {
    if (typeof keyHex !== "string" || !/^[0-9a-fA-F]+$/.test(keyHex)) {
      throw new Error("Key must be a valid hex string");
    }

    const expectedHexLength =
      sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES * 2;

    if (keyHex.length !== expectedHexLength) {
      throw new Error(
        `Key must contain exactly ${expectedHexLength} hex characters`,
      );
    }

    const key = sodium.from_hex(keyHex);

    if (key.length !== sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES) {
      throw new Error("Invalid key length");
    }

    return key;
  }
}
