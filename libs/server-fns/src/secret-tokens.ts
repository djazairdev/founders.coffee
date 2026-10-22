const base64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
};

/** A new secret token for a link: 32 random bytes, as 43 URL-safe characters. */
export const newSecretToken = (): string =>
  base64Url(crypto.getRandomValues(new Uint8Array(32)));

/**
 * The SHA-256 hash of a secret token, which is all the database keeps of it, so a leaked row never
 * holds a working link. A token is 256 random bits, so it needs no salt or slow hash.
 */
export const hashSecretToken = async (token: string): Promise<string> =>
  base64Url(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
    ),
  );
