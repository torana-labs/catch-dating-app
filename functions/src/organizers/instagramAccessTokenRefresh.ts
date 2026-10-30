import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  InstagramAccessTokenStore,
  requireToken,
} from "./instagramAccessTokenStore";
import type {InstagramTokenErrorCode} from "./instagramAccessTokenStore";
import {instagramAccessToken} from "./instagramClaimWebhook";
import {
  catchInstagramAccountId,
  catchInstagramGraphVersion,
} from "./organizerClaimVerification";

const dayMillis = 24 * 60 * 60_000;
// Instagram Login tokens last 60 days. Renewing at 30 days left leaves a
// month of daily retries before the token lapses.
const renewWithinMillis = 30 * dayMillis;
const alertWithinMillis = 14 * dayMillis;

export class InstagramTokenRefreshError extends Error {
  /** rejected: Meta says the token itself is invalid (OAuth code 190). */
  constructor(message: string, readonly rejected: boolean) {
    super(message);
    this.name = "InstagramTokenRefreshError";
  }
}

export interface InstagramTokenClient {
  refresh(token: string):
    Promise<{accessToken: string; expiresInSeconds: number}>;
  /** The professional account id the token acts for. */
  accountId(token: string): Promise<string>;
}

const requestTimeoutMillis = 8000;
const maxResponseBytes = 16 * 1024;

/** Meta's refresh endpoint for long-lived Instagram Login tokens. */
export class InstagramGraphTokenClient implements InstagramTokenClient {
  constructor(private readonly graphVersion: string,
    private readonly fetchImpl: typeof fetch = fetch) {}

  async refresh(token: string):
    Promise<{accessToken: string; expiresInSeconds: number}> {
    // Meta documents the token as a query parameter on this endpoint.
    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", token);
    const body = await this.requestJson(url, {});
    const expiresIn = body.expires_in;
    if (typeof expiresIn !== "number" || !Number.isSafeInteger(expiresIn) ||
        expiresIn < 7 * 24 * 60 * 60 || expiresIn > 90 * 24 * 60 * 60) {
      throw new InstagramTokenRefreshError("Unexpected token lifetime.", false);
    }
    try {
      return {accessToken: requireToken(body.access_token),
        expiresInSeconds: expiresIn};
    } catch {
      throw new InstagramTokenRefreshError("Unexpected token.", false);
    }
  }

  async accountId(token: string): Promise<string> {
    if (!/^v[1-9][0-9]*\.[0-9]+$/u.test(this.graphVersion)) {
      throw new InstagramTokenRefreshError("Invalid Graph version.", false);
    }
    const url = new URL(
      `https://graph.instagram.com/${this.graphVersion}/me`);
    url.searchParams.set("fields", "user_id");
    const body = await this.requestJson(url,
      {Authorization: `Bearer ${token}`});
    const id = typeof body.user_id === "number" ? String(body.user_id) :
      body.user_id;
    if (typeof id !== "string" || !/^[0-9]{1,32}$/u.test(id)) {
      throw new InstagramTokenRefreshError("Unexpected account id.", false);
    }
    return id;
  }

  private async requestJson(url: URL, headers: Record<string, string>):
    Promise<Record<string, unknown>> {
    let response: Response;
    let text: string;
    try {
      response = await this.fetchImpl(url, {method: "GET", headers,
        redirect: "error", signal: AbortSignal.timeout(requestTimeoutMillis)});
      text = await response.text();
    } catch {
      throw new InstagramTokenRefreshError("Instagram request failed.", false);
    }
    let body: unknown = null;
    try {
      body = text.length <= maxResponseBytes ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    const value = typeof body === "object" && body !== null &&
      !Array.isArray(body) ? body as Record<string, unknown> : null;
    if (!response.ok) {
      const error = value?.error;
      const code = typeof error === "object" && error !== null ?
        (error as Record<string, unknown>).code : null;
      // Never copy Meta's message: it can echo the token.
      throw new InstagramTokenRefreshError("Instagram rejected the request.",
        code === 190);
    }
    if (!value) {
      throw new InstagramTokenRefreshError("Unexpected Instagram response.",
        false);
    }
    return value;
  }
}

export interface InstagramTokenRefreshDeps {
  accountId: string;
  /** The version Firebase pinned at deploy, read only when needed. */
  pinnedToken: () => string;
  store: Pick<InstagramAccessTokenStore,
    "record" | "readToken" | "addToken" | "saveRefresh" | "saveFailure">;
  client: InstagramTokenClient;
  now?: () => number;
}

export type InstagramTokenRefreshResult =
  | {outcome: "unconfigured"}
  | {outcome: "current"; expiresAtMillis: number}
  | {outcome: "refreshed"; expiresAtMillis: number;
      source: "record" | "pinned"}
  | {outcome: "failed"; code: InstagramTokenErrorCode;
      expiresAtMillis: number | null};

/**
 * Renews the token once 30 days or fewer remain. It refreshes the recorded
 * token first and the deploy-pinned one second, so a token pasted in by
 * hand takes over when the recorded one stops working.
 */
export async function refreshInstagramAccessTokenHandler(
  deps: InstagramTokenRefreshDeps): Promise<InstagramTokenRefreshResult> {
  const accountId = deps.accountId.trim();
  if (!accountId) return {outcome: "unconfigured"};
  const now = deps.now ?? Date.now;
  const record = await deps.store.record(accountId);
  const revision = record?.revision ?? null;
  const recordedVersion = record?.secretVersion ?? null;
  const expiresAtMillis = recordedVersion && record?.expiresAt ?
    record.expiresAt.toMillis() : null;
  if (expiresAtMillis !== null && expiresAtMillis - now() > renewWithinMillis) {
    return {outcome: "current", expiresAtMillis};
  }

  const sources: Array<{source: "record" | "pinned";
    token: () => Promise<string>}> = [];
  if (recordedVersion) {
    sources.push({source: "record",
      token: () => deps.store.readToken(recordedVersion)});
  }
  sources.push({source: "pinned",
    token: async () => requireToken(deps.pinnedToken())});

  let code: InstagramTokenErrorCode = "refreshFailed";
  let dropToken = false;
  for (const {source, token} of sources) {
    let refreshed: {accessToken: string; expiresInSeconds: number};
    try {
      refreshed = await deps.client.refresh(await token());
      if (await deps.client.accountId(refreshed.accessToken) !== accountId) {
        code = "accountMismatch";
        continue;
      }
    } catch (error) {
      const rejected = error instanceof InstagramTokenRefreshError &&
        error.rejected;
      code = rejected ? "refreshRejected" : "refreshFailed";
      // A recorded token Meta calls invalid must not keep serving the webhook.
      dropToken ||= rejected && source === "record";
      continue;
    }
    let secretVersion: string;
    try {
      secretVersion = await deps.store.addToken(refreshed.accessToken);
    } catch {
      code = "secretWriteFailed";
      break;
    }
    const renewedUntil = now() + refreshed.expiresInSeconds * 1000;
    await deps.store.saveRefresh(accountId, revision,
      {secretVersion, expiresAtMillis: renewedUntil, nowMillis: now()});
    return {outcome: "refreshed", expiresAtMillis: renewedUntil, source};
  }
  await deps.store.saveFailure(accountId, revision,
    {code, dropToken, nowMillis: now()});
  return {outcome: "failed", code,
    expiresAtMillis: dropToken ? null : expiresAtMillis};
}

export const refreshInstagramAccessToken = onSchedule({
  schedule: "every day 05:30", timeZone: "Asia/Kolkata",
  secrets: [instagramAccessToken], maxInstances: 1, retryCount: 0,
  timeoutSeconds: 60,
}, async () => {
  const result = await refreshInstagramAccessTokenHandler({
    accountId: catchInstagramAccountId.value(),
    pinnedToken: () => instagramAccessToken.value(),
    store: new InstagramAccessTokenStore(admin.firestore()),
    client: new InstagramGraphTokenClient(
      catchInstagramGraphVersion.value().trim()),
  });
  if (result.outcome === "refreshed") {
    logger.info("Instagram access token renewed", {source: result.source,
      expiresAt: new Date(result.expiresAtMillis).toISOString()});
  } else if (result.outcome === "failed") {
    const expiresAt = result.expiresAtMillis === null ? null :
      new Date(result.expiresAtMillis).toISOString();
    // Error severity once the webhook has two weeks or less of known token.
    if (result.expiresAtMillis === null ||
        result.expiresAtMillis - Date.now() <= alertWithinMillis) {
      logger.error("Instagram access token renewal failed",
        {code: result.code, expiresAt});
    } else {
      logger.warn("Instagram access token renewal failed; will retry",
        {code: result.code, expiresAt});
    }
  }
});
