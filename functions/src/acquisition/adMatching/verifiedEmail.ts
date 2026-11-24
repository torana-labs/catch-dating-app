import * as admin from "firebase-admin";

/**
 * The only email the ad platforms may receive for an account: the one
 * Firebase Auth holds and has verified (an email-link check, or a Google or
 * Apple sign-in, which verify it). `users.email` and `organizers.email` are
 * typed by the account holder and never checked, so a match on them could
 * name someone else; they still count for opt-outs, never for uploads.
 * @param {object|undefined} user Firebase Auth user record fields.
 * @return {string|null} The verified email, or null.
 */
export function verifiedAuthEmail(user: {
  email?: string | null;
  emailVerified?: boolean;
} | undefined): string | null {
  return user?.emailVerified === true && typeof user.email === "string" &&
    user.email.trim() ? user.email : null;
}

/**
 * The verified Firebase Auth email of one account, or null when it has
 * none, is unverified, or the account is gone.
 * @param {string} uid Account.
 * @return {Promise<string|null>} The verified email.
 */
export async function firebaseVerifiedEmail(uid: string):
  Promise<string | null> {
  try {
    return verifiedAuthEmail(await admin.auth().getUser(uid));
  } catch (error) {
    if ((error as {code?: unknown}).code === "auth/user-not-found") {
      return null;
    }
    throw error;
  }
}
