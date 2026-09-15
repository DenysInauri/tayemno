interface ISrpChallenge {
  serverSecretEphemeral: string;
  expiresAt: number;
}

const store = new Map<string, ISrpChallenge>();

const CHALLENGE_TTL_MS = 2 * 60 * 1000;

export const setSrpChallenge = (
  username: string,
  serverSecretEphemeral: string,
) => {
  store.set(username, {
    serverSecretEphemeral,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
};

export const getSrpChallenge = (
  username: string,
): string | null => {
  const challenge = store.get(username);

  if (!challenge) return null;

  if (Date.now() > challenge.expiresAt) {
    store.delete(username);
    return null;
  }

  store.delete(username);

  return challenge.serverSecretEphemeral;
};

export const cleanupExpiredChallenges = () => {
  const now = Date.now();

  for (const [key, value] of store) {
    if (now > value.expiresAt) {
      store.delete(key);
    }
  }
};
