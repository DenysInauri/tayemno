import srp from "secure-remote-password/client";
import { deriveKey } from "../../../utils/crypto/deriveKey";
import { SymmetricCrypto } from "../../../utils/crypto/SymmetricCrypto";
import {
  type ISignInInitResponse,
  ISignInVerifyResponse,
} from "@tayemno/shared";

interface ISignInVerifyParams {
  email: string;
  clientPublicEphemeral: string;
  clientSessionProof: string;
}

interface ISignInInitParams {
  identifier: string;
}

interface IParams {
  identifier: string;
  password: string;
  signInInit: (params: ISignInInitParams) => Promise<ISignInInitResponse>;
  signInVerify: (params: ISignInVerifyParams) => Promise<ISignInVerifyResponse>;
}

export const performSignIn = async ({
  identifier,
  password,
  signInInit,
  signInVerify,
}: IParams) => {
  const initResponse = await signInInit({ identifier });
  const { email } = initResponse;

  const srpPrivateKey = srp.derivePrivateKey(
    initResponse.srpSalt,
    email,
    password,
  );

  const clientEphemeral = srp.generateEphemeral();

  const clientSession = srp.deriveSession(
    clientEphemeral.secret,
    initResponse.serverPublicEphemeral,
    initResponse.srpSalt,
    email,
    srpPrivateKey,
  );

  const verifyResponse = await signInVerify({
    email,
    clientPublicEphemeral: clientEphemeral.public,
    clientSessionProof: clientSession.proof,
  });

  srp.verifySession(
    clientEphemeral.public,
    clientSession,
    verifyResponse.serverSessionProof,
  );

  const kek = await deriveKey({
    password,
    saltHex: verifyResponse.user.kdfSalt,
    iterations: verifyResponse.user.kdfIterations,
    memoryLimit: verifyResponse.user.kdfMemoryKib * 1024,
  });

  const privateKey = await SymmetricCrypto.decrypt(
    {
      ciphertext: verifyResponse.user.encryptedPrivateKey,
      nonce: verifyResponse.user.privateKeyNonce,
    },
    kek,
  );

  return {
    token: verifyResponse.token,
    user: verifyResponse.user,
    keyPair: { publicKey: verifyResponse.user.publicKey, privateKey },
    workspace: verifyResponse.workspace,
  };
};
