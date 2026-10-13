const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SPECIAL = "!@#$%^&*";
const ALL = LOWERCASE + UPPERCASE + DIGITS + SPECIAL;

const randomChar = (charset: string): string => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return charset[array[0] % charset.length];
};

export const generateTempPassword = (length = 16): string => {
  const required = [
    randomChar(LOWERCASE),
    randomChar(UPPERCASE),
    randomChar(DIGITS),
    randomChar(SPECIAL),
  ];

  const remaining = Array.from({ length: length - required.length }, () =>
    randomChar(ALL),
  );

  const all = [...required, ...remaining];

  for (let i = all.length - 1; i > 0; i--) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const j = array[0] % (i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.join("");
};
