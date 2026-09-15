import sodium from "libsodium-wrappers-sumo";

export const KDF_ITERATIONS = 2;
export const KDF_MEMORY_BYTES = 67108864;
export const KDF_PARALLELISM = 1;

export const generateSalt = async (): Promise<string> => {
  await sodium.ready;

  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

  return sodium.to_hex(salt);
};

interface IDeriveKeyParams {
  password: string;
  saltHex: string;
  iterations: number;
  memoryLimit: number;
}

export const deriveKey = async ({
  password,
  saltHex,
  iterations,
  memoryLimit,
}: IDeriveKeyParams): Promise<string> => {
  await sodium.ready;

  const salt = sodium.from_hex(saltHex);

  if (salt.length !== sodium.crypto_pwhash_SALTBYTES) {
    throw new Error("Invalid salt length");
  }

  return sodium.crypto_pwhash(
    32,
    password,
    salt,
    iterations,
    memoryLimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
    "hex",
  );
};
