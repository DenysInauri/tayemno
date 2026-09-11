import type { ICheckPasswordBreachResponse } from "@tayemno/shared";

const HIBP_API_URL = "https://api.pwnedpasswords.com/range";

export const checkPasswordBreach = async (
  hash: string,
): Promise<ICheckPasswordBreachResponse> => {
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`${HIBP_API_URL}/${prefix}`, {
    headers: { "User-Agent": "Tayemno-PasswordCheck" },
  });

  const body = await response.text();
  const lines = body.split("\r\n");

  for (const line of lines) {
    const [hashSuffix, count] = line.split(":");
    if (hashSuffix === suffix) {
      return { count: parseInt(count, 10) };
    }
  }

  return { count: 0 };
};
