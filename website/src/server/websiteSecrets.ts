import "server-only";
import {applicationDefault} from "firebase-admin/app";

/**
 * Secret Manager values the website server reads at run time, from the same
 * project as its public reader, with the service's own credential. A secret
 * that does not exist yet, or that the service may not read, is null, so the
 * feature that needs it stays off instead of failing a deploy or a page.
 */
export interface SecretAccess {
  fetch: typeof fetch;
  accessToken: () => Promise<string>;
  project: string | undefined;
  now: () => number;
}

const found = 10 * 60_000;
const missing = 60_000;
const cache = new Map<string, {value: string | null; until: number}>();

const defaultAccess = (): SecretAccess => ({
  fetch,
  accessToken: async () => (await applicationDefault().getAccessToken()).access_token,
  project: process.env.CATCH_PUBLIC_FIRESTORE_PROJECT,
  now: Date.now,
});

export async function readWebsiteSecret(name: string, access: SecretAccess = defaultAccess()): Promise<string | null> {
  const cached = cache.get(name);
  if (cached && cached.until > access.now()) return cached.value;
  const value = await fetchSecret(name, access).catch(() => null);
  cache.set(name, {value, until: access.now() + (value ? found : missing)});
  return value;
}

async function fetchSecret(name: string, access: SecretAccess): Promise<string | null> {
  if (!access.project || !/^[A-Za-z0-9_-]{1,255}$/u.test(name)) return null;
  const url = `https://secretmanager.googleapis.com/v1/projects/${encodeURIComponent(access.project)}` +
    `/secrets/${name}/versions/latest:access`;
  const response = await access.fetch(url, {
    headers: {Authorization: `Bearer ${await access.accessToken()}`},
    signal: AbortSignal.timeout(2_000),
  });
  if (!response.ok) return null;
  const body = await response.json() as {payload?: {data?: string}};
  const value = body.payload?.data ? Buffer.from(body.payload.data, "base64").toString("utf8").trim() : "";
  return value || null;
}

/** Tests only: forget cached values. */
export function forgetWebsiteSecrets(): void {
  cache.clear();
}
