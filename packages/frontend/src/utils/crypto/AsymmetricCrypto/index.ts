import sodium from "libsodium-wrappers-sumo";

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export class AsymmetricCrypto {
  private static async init(): Promise<void> {
    await sodium.ready;
  }

  static async generateKeyPair(): Promise<KeyPair> {
    await this.init();

    const keyPair = sodium.crypto_box_keypair();

    return {
      publicKey: sodium.to_hex(keyPair.publicKey),
      privateKey: sodium.to_hex(keyPair.privateKey),
    };
  }

  static async encrypt(
    plaintext: string,
    recipientPublicKeyHex: string,
  ): Promise<string> {
    await this.init();

    const recipientPublicKey = sodium.from_hex(recipientPublicKeyHex);

    this.validateKey(
      recipientPublicKey,
      sodium.crypto_box_PUBLICKEYBYTES,
      "public key",
    );

    const message = sodium.from_string(plaintext);
    const ciphertext = sodium.crypto_box_seal(message, recipientPublicKey);

    return sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL);
  }

  static async decrypt(
    ciphertextBase64: string,
    recipientPublicKeyHex: string,
    recipientPrivateKeyHex: string,
  ): Promise<string> {
    await this.init();

    const recipientPublicKey = sodium.from_hex(recipientPublicKeyHex);
    const recipientPrivateKey = sodium.from_hex(recipientPrivateKeyHex);

    this.validateKey(
      recipientPublicKey,
      sodium.crypto_box_PUBLICKEYBYTES,
      "public key",
    );

    this.validateKey(
      recipientPrivateKey,
      sodium.crypto_box_SECRETKEYBYTES,
      "private key",
    );

    const ciphertext = sodium.from_base64(
      ciphertextBase64,
      sodium.base64_variants.ORIGINAL,
    );

    if (ciphertext.length < sodium.crypto_box_SEALBYTES) {
      throw new Error("Invalid ciphertext");
    }

    try {
      const plaintext = sodium.crypto_box_seal_open(
        ciphertext,
        recipientPublicKey,
        recipientPrivateKey,
        "uint8array",
      );

      return sodium.to_string(plaintext);
    } catch {
      throw new Error("Decryption failed: invalid key or corrupted ciphertext");
    }
  }

  private static validateKey(
    key: Uint8Array,
    expectedLength: number,
    keyName: string,
  ): void {
    if (key.length !== expectedLength) {
      throw new Error(
        `Invalid ${keyName} length: expected ${expectedLength} bytes`,
      );
    }
  }
}
