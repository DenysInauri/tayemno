import sodium from "libsodium-wrappers-sumo";

export enum MemLimit {
  m64 = 67108864,
  m32 = m64 / 2,
  m16 = m32 / 2,
  m8 = m16 / 2,
}

export const generateSalt = async (): Promise<string> => {
  await sodium.ready;

  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

  return sodium.to_hex(salt);
};

interface IDeriveKeyParams {
  password: string;
  saltHex: string;
}

export const deriveKey = async ({
  password,
  saltHex,
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
    10,
    MemLimit.m64,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
    "hex",
  );
};
