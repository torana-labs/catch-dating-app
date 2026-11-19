import {brand} from "./brand.ts";

// The /refer/ form's sign-in words (features/referral): who is signed in and
// whether the referral can be credited to them. The page's own copy, and the
// reward it states, stay in content/playbook/pages/resources/refer.json; no
// trial length is typed here.

const host = brand.stores.hostAppName;

export const referralSignInCopy = {
  /** Signed out: the form still sends, but credit needs sign-in. */
  signedOut: `Your free month is credited only to the owner of a live host page on ${brand.name}, signed in here. You can send the form signed out, but it won’t be credited to you.`,
  /** The button that opens the site's sign-in sheet. */
  signIn: `Sign in with your ${host} number`,
  /** {name} is the host page this account owns, or its phone number. */
  signedInAs: "Signed in as {name}",
  /** When the account has no phone number to show. */
  fallbackName: "your account",
  /** Signed in as the owner of a live host page. */
  owner: "This referral is credited to your host page. Your month is free once they pay their first bill.",
  /** Signed in, but the account owns no live host page. */
  notOwner: `This number doesn’t own a live host page on ${brand.name}, so this referral won’t be credited to you. To use another number, sign out from the account menu, then sign in here with the number you use in ${host}.`,
  /** Signed in, but the site could not read which host pages the account owns. */
  unknown: "Credit goes to the host account you sign in with.",
} as const;
