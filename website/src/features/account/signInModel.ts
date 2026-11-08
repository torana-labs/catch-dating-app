/**
 * The sign-in sheet's browser-only state. Nothing here is a credential: the
 * email address waits for its link on this device only, the hint only tells
 * the header whether loading Firebase is worth it, and the marker separates
 * this sheet's email links from the public forms' own.
 */
export const emailForSignInKey = "catch.account.emailForSignIn";
export const signedInHintKey = "catch.account.signedIn";
export const emailLinkMarker = "catchSignIn";
const emailLinkParams = ["apiKey", "oobCode", "mode", "lang", "continueUrl", "tenantId", emailLinkMarker];

export const phonePattern = /^\+[1-9][0-9]{7,14}$/u;
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function normalizePhone(value: string): string {
  return value.replace(/[\s()-]/gu, "");
}

/** Where an email link returns: the page the reader was on, marked as ours. */
export function emailLinkReturnUrl(href: string): string {
  const url = new URL(href);
  for (const param of emailLinkParams) url.searchParams.delete(param);
  url.hash = "";
  url.searchParams.set(emailLinkMarker, "1");
  return url.toString();
}

/** True when this page load came back from this sheet's email link. */
export function isMarkedEmailLinkReturn(href: string): boolean {
  const url = new URL(href);
  if (url.searchParams.get(emailLinkMarker) === "1") return true;
  const continueUrl = url.searchParams.get("continueUrl");
  if (!continueUrl) return false;
  try {
    return new URL(continueUrl).searchParams.get(emailLinkMarker) === "1";
  } catch {
    return false;
  }
}

/** The same page without the one-time link parameters. */
export function withoutEmailLinkParams(href: string): string {
  const url = new URL(href);
  for (const param of emailLinkParams) url.searchParams.delete(param);
  return `${url.pathname}${url.search}${url.hash}`;
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
