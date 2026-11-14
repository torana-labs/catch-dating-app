/**
 * The sign-in sheet's browser-only state. Nothing here is a credential: the
 * hint only tells the header whether loading Firebase is worth it.
 */
export const signedInHintKey = "catch.account.signedIn";

export const phonePattern = /^\+[1-9][0-9]{7,14}$/u;

export function normalizePhone(value: string): string {
  return value.replace(/[\s()-]/gu, "");
}

export function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private windows and blocked storage only lose the convenience.
  }
}
