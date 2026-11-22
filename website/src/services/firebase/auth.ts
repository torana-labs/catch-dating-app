import {claimFirebaseConfigured, publicEventRegistrationFirebaseConfigured, publicFormsFirebaseConfigured} from "../../firebaseConfig";
import type {User} from "firebase/auth";
import {getFirebaseRuntime} from "./runtime";

/**
 * Website sign-in: auth state watchers, the phone and Google steps, and sign-out.
 */
export {beginClaimPhoneLink, signInOrLinkClaimGoogle} from "../../firebaseClaimAccountLinking";

export interface PublicEventPhoneVerification {
  clear: () => void;
  confirm: (code: string) => Promise<User>;
}

export function watchClaimAuthState(
  callback: (user: User | null) => void
): () => void {
  if (!claimFirebaseConfigured) {
    callback(null);
    return () => undefined;
  }
  let cancelled = false;
  let unsubscribe: () => void = () => undefined;
  void getFirebaseRuntime()
    .then(async (runtime) => {
      if (!runtime) {
        callback(null);
        return;
      }
      const {onAuthStateChanged} = await import("firebase/auth");
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(runtime.auth, callback);
    })
    .catch(() => {
      callback(null);
    });
  return () => {
    cancelled = true;
    unsubscribe();
  };
}

/** Sales contact verification can refresh credentials without changing UID. */
export function watchSalesDemoAuthState(callback: (user: User | null) => void): () => void {
  if (!claimFirebaseConfigured) {callback(null); return () => undefined;}
  let cancelled = false;
  let unsubscribe: () => void = () => undefined;
  void getFirebaseRuntime().then(async (runtime) => {
    if (cancelled) return;
    if (!runtime) {callback(null); return;}
    const {onIdTokenChanged} = await import("firebase/auth");
    if (cancelled) return;
    unsubscribe = onIdTokenChanged(runtime.auth, callback);
  }).catch(() => {if (!cancelled) callback(null);});
  return () => {cancelled = true; unsubscribe();};
}

export const watchEventRuntimeAuthState: typeof watchClaimAuthState = (callback) => watchClaimAuthState(callback);
export const watchPublicFormAuthState: typeof watchClaimAuthState = (callback) => watchClaimAuthState(callback);

export async function signInForClaim() {
  const runtime = await getFirebaseRuntime();
  if (!runtime) {
    throw new Error("Claim sign-in is not configured for this build.");
  }
  const {signInOrLinkClaimGoogle} = await import("../../firebaseClaimAccountLinking");
  await signInOrLinkClaimGoogle(runtime.auth);
}

export async function signOutClaimUser() {
  const runtime = await getFirebaseRuntime();
  if (!runtime) return;
  const {signOut} = await import("firebase/auth");
  await signOut(runtime.auth);
}

export async function beginWebsiteAccountPhoneVerification(
  phoneNumber: string, recaptchaContainerId: string
): Promise<PublicEventPhoneVerification> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !claimFirebaseConfigured) {
    throw new Error("Account verification is not configured for this build.");
  }
  const {RecaptchaVerifier} = await import("firebase/auth");
  const {beginClaimPhoneLink} = await import("../../firebaseClaimAccountLinking");
  const verifier = new RecaptchaVerifier(runtime.auth, recaptchaContainerId, {size: "invisible"});
  try {
    const challenge = await beginClaimPhoneLink(runtime.auth, phoneNumber, verifier);
    return {clear: () => verifier.clear(),
      confirm: async (code) => (await challenge.confirm(code)).user};
  } catch (error) {verifier.clear(); throw error;}
}

export async function beginPublicEventPhoneVerification(
  phoneNumber: string,
  recaptchaContainerId: string
): Promise<PublicEventPhoneVerification> {
  const runtime = await getFirebaseRuntime();
  if (!runtime || !(
    publicEventRegistrationFirebaseConfigured || publicFormsFirebaseConfigured
  )) {
    throw new Error("Website phone verification is not configured for this build.");
  }
  const {RecaptchaVerifier} = await import("firebase/auth");
  const {beginClaimPhoneLink} = await import("../../firebaseClaimAccountLinking");
  const verifier = new RecaptchaVerifier(
    runtime.auth,
    recaptchaContainerId,
    {size: "invisible"}
  );
  try {
    const confirmation = await beginClaimPhoneLink(
      runtime.auth,
      phoneNumber,
      verifier
    );
    return {
      clear: () => verifier.clear(),
      confirm: async (code) => (await confirmation.confirm(code)).user,
    };
  } catch (error) {
    verifier.clear();
    throw error;
  }
}

/** Explicit account switching is shared by public guest surfaces. */
export const signOutGuestUser: typeof signOutClaimUser = () => signOutClaimUser();

/** Verification adds a contact to the current identity; it never signs in as another account. */
export async function verifyGuestEmail(uid: string, email: string, eventId: string): Promise<void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime) throw new Error("Authentication unavailable");
  const {verifyEmailOnCurrentAccount} = await import("../../firebaseClaimAccountLinking");
  await verifyEmailOnCurrentAccount(runtime.auth, uid, email,
    new URL(`/events/${encodeURIComponent(eventId)}/`, window.location.origin).href);
}

export async function refreshGuestIdentity(uid: string): Promise<void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime) throw new Error("Authentication unavailable");
  const user = runtime.auth.currentUser;
  if (!user || user.uid !== uid) throw new Error("Account changed");
  await user.reload();
  if (runtime.auth.currentUser?.uid !== uid) throw new Error("Account changed");
  await user.getIdToken(true);
}

export const beginSalesDemoPhoneVerification: typeof beginWebsiteAccountPhoneVerification = (phoneNumber, recaptchaContainerId) =>
  beginWebsiteAccountPhoneVerification(phoneNumber, recaptchaContainerId);
export const watchWebsiteAccountAuthState: typeof watchSalesDemoAuthState = (callback) => watchSalesDemoAuthState(callback);
export const signOutWebsiteAccount: typeof signOutClaimUser = () => signOutClaimUser();
