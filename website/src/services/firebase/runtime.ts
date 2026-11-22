import {appCheckSiteKey, claimFirebaseConfigured, firebaseConfig as config} from "../../firebaseConfig";
import type {FirebaseApp} from "firebase/app";
import type {AppCheck} from "firebase/app-check";
import type {Auth, User} from "firebase/auth";
import type {Firestore} from "firebase/firestore";
import type {Functions} from "firebase/functions";

/**
 * The website's one Firebase runtime: the public runtime (App Check and Functions) and the signed-in one
 * (plus Auth and Firestore), each loaded on first use, and the shared callable invoke with its App Check
 * deadline. Every service module calls Functions through invokeWebsiteCallable.
 */
let runtimePromise: Promise<FirebaseRuntime | null> | null = null;
let publicRuntimePromise: Promise<PublicFirebaseRuntime | null> | null = null;

interface PublicFirebaseRuntime {
  app: FirebaseApp;
  appCheck: AppCheck;
  functions: Functions;
}

interface FirebaseRuntime {
  app: FirebaseApp;
  appCheck: AppCheck;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
}

export type {User};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function getFirebaseRuntime() {
  if (!config || !appCheckSiteKey) return null;
  runtimePromise ??= loadFirebaseRuntime();
  return runtimePromise;
}

export async function getPublicFirebaseRuntime() {
  if (!config || !appCheckSiteKey) return null;
  publicRuntimePromise ??= loadPublicFirebaseRuntime();
  return publicRuntimePromise;
}

async function loadPublicFirebaseRuntime():
  Promise<PublicFirebaseRuntime | null> {
  if (!config || !appCheckSiteKey) return null;
  const [
    {initializeApp},
    {initializeAppCheck, ReCaptchaEnterpriseProvider},
    {getFunctions},
  ] = await Promise.all([
    import("firebase/app"),
    import("firebase/app-check"),
    import("firebase/functions"),
  ]);
  const app = initializeApp(config);
  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return {app, appCheck, functions: getFunctions(app, "asia-south1")};
}

/**
 * The site's App Check token for the HTTP Functions that require one, such
 * as the website lead intake behind /api/join-waitlist (sent as
 * X-Firebase-AppCheck). Firebase and App Check load on the first call, not
 * with the page. Null where this build has no Firebase or App Check
 * configuration, or when a token cannot be minted: it never throws, and the
 * endpoint answers a missing token with 401.
 */
export async function getWebsiteAppCheckToken(): Promise<string | null> {
  try {
    const runtime = await getPublicFirebaseRuntime();
    if (!runtime) return null;
    return (await appCheckTokenWithinDeadline(runtime.appCheck)).token || null;
  } catch {
    return null;
  }
}

/**
 * The signed-in website account's Firebase ID token, for the one website lead
 * that credits its sender: a host referral, which the lead intake reads as
 * `Authorization: Bearer` (functions/src/waitlist/websiteLead.ts). Firebase
 * Auth loads on the first call, not with the page, and the call waits for the
 * saved sign-in to be restored. Null when no one is signed in, the account is
 * anonymous (the intake would not credit it), this build has no Firebase
 * configuration, or a token cannot be read: it never throws, so a referral
 * without an account goes exactly as before.
 */
export async function getWebsiteReferrerIdToken(): Promise<string | null> {
  if (!claimFirebaseConfigured) return null;
  try {
    const runtime = await getFirebaseRuntime();
    if (!runtime) return null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const restored = await Promise.race([
      runtime.auth.authStateReady().then(() => true),
      new Promise<false>((resolve) => {timer = setTimeout(() => resolve(false), REFERRER_SIGN_IN_DEADLINE_MS);}),
    ]).finally(() => clearTimeout(timer));
    const user = restored ? runtime.auth.currentUser : null;
    if (!user || user.isAnonymous) return null;
    return (await user.getIdToken()) || null;
  } catch {
    return null;
  }
}

/** A referral waits this long for a saved sign-in, then goes without one. */
const REFERRER_SIGN_IN_DEADLINE_MS = 5_000;

/**
 * How long a website call waits for its App Check token. App Check mints the
 * token through the reCAPTCHA Enterprise script, which has no failure path:
 * when a content blocker, a network or a firewall stops the script, the token
 * never settles. The Functions SDK starts its own timeout only after the token,
 * so without this a call, and the page waiting on it, would wait forever.
 */
const APP_CHECK_TOKEN_DEADLINE_MS = 15_000;

class AppCheckDeadlineError extends Error {
  constructor() {
    super("App Check could not start in this browser.");
    this.name = "AppCheckDeadlineError";
  }
}

/** App Check's token, or an AppCheckDeadlineError once the deadline passes. */
async function appCheckTokenWithinDeadline(appCheck: AppCheck) {
  const {getToken} = await import("firebase/app-check");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new AppCheckDeadlineError()), APP_CHECK_TOKEN_DEADLINE_MS);
  });
  try {
    return await Promise.race([getToken(appCheck), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The app's one Firestore instance. In a browser it keeps an IndexedDB cache
 * shared across tabs, so a repeat visit paints from cache while the listener
 * catches up; rules still decide every server read. Firestore can be set up
 * only once per app, so a second caller, or a browser without IndexedDB,
 * gets the existing or in-memory instance.
 */
export async function websiteFirestore(app: FirebaseApp): Promise<Firestore> {
  const firestore = await import("firebase/firestore");
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return firestore.getFirestore(app);
  try {
    return firestore.initializeFirestore(app, {localCache: firestore.persistentLocalCache({
      tabManager: firestore.persistentMultipleTabManager()})});
  } catch {
    return firestore.getFirestore(app);
  }
}

async function loadFirebaseRuntime(): Promise<FirebaseRuntime | null> {
  const [publicRuntime, {getAuth}] = await Promise.all([
    getPublicFirebaseRuntime(),
    import("firebase/auth"),
  ]);
  if (!publicRuntime) return null;
  const {app, appCheck, functions} = publicRuntime;
  return {
    app,
    appCheck,
    auth: getAuth(app),
    firestore: await websiteFirestore(app),
    functions,
  };
}

/**
 * Firestore for a signed-in page's own read models, or null when this build
 * has no account sign-in. The page listens under the same rules the apps do.
 */
export async function getSignedInFirestore(): Promise<Firestore | null> {
  const runtime = await getFirebaseRuntime();
  return runtime && claimFirebaseConfigured ? runtime.firestore : null;
}

/**
 * Every website callable goes through here, so each one waits a bounded time
 * for App Check. "public" uses the runtime without Auth or Firestore, for
 * calls that never act as a signed-in person.
 */
export async function invokeWebsiteCallable<Request, Response>(
  name: string,
  payload: Request,
  configured: boolean,
  capabilityLabel = "Event runtime",
  runtimeKind: "full" | "public" = "full"
): Promise<Response> {
  const runtime = runtimeKind === "public" ? await getPublicFirebaseRuntime() : await getFirebaseRuntime();
  if (!runtime || !configured) {
    throw new Error(`${capabilityLabel} are not configured for this build.`);
  }
  // A token that cannot be minted in time fails the call instead of holding
  // it. A token exchange that fails outright still lets the call go without
  // one, as the SDK does, and the function answers for itself.
  await appCheckTokenWithinDeadline(runtime.appCheck).catch((error: unknown) => {
    if (error instanceof AppCheckDeadlineError) throw error;
  });
  const {httpsCallable} = await import("firebase/functions");
  const callable = httpsCallable<Request, Response>(runtime.functions, name);
  return (await callable(payload)).data;
}
