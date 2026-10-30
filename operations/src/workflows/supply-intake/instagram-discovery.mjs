import {hashValue} from "../../platform/canonical-json.mjs";
import {invariant} from "../../platform/errors.mjs";
import {assertPolicy, RAW_PAYLOAD_PERSISTENCE} from "./acquisition.mjs";
import {PAGE_SNAPSHOT_VERSION} from "./page-snapshot.mjs";
import {BUSINESS_DISCOVERY_JSON_ID} from "./sources/instagram/extractor.mjs";
import {normalizeOrganizerSurfaceUrl} from "./sources/surfaces.mjs";

// Instagram profiles are read through Meta's Business Discovery API, never
// fetched: instagram.com disallows crawlers. The call runs as Catch's own
// Instagram account (Instagram API with Facebook Login, graph.facebook.com),
// which Meta allows with Standard Access because the app serves only an
// account Catch owns. It returns another business or creator account's
// public name, bio, website and recent captions; personal and age-gated
// accounts return nothing. Every other URL goes to the wrapped page source.

export const INSTAGRAM_DISCOVERY_ADAPTER_ID = "instagram_business_discovery";
export const MAX_DISCOVERY_REQUESTS_PER_INTAKE = 2;
const MEDIA_LIMIT = 12;
const TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_TEXT_CHARS = 20_000;
// Graph API error code for an expired or revoked access token.
const INVALID_TOKEN_CODE = 190;

export class InstagramDiscoveryPageSource {
  constructor({inner, policy, accountId, accessToken, graphVersion, transport = fetch, clock = () => new Date(),
    maxRequests = MAX_DISCOVERY_REQUESTS_PER_INTAKE} = {}) {
    assertPolicy(policy);
    invariant(inner && typeof inner.capture === "function", "ACQUISITION_PORT_MISSING",
      "Instagram discovery wraps another page source.");
    invariant(/^[0-9]{1,32}$/u.test(accountId ?? ""), "INVALID_INSTAGRAM_DISCOVERY_CONFIG",
      "Instagram discovery needs Catch's numeric Instagram account id.");
    invariant(typeof accessToken === "string" && accessToken.length > 0, "INVALID_INSTAGRAM_DISCOVERY_CONFIG",
      "Instagram discovery needs an access token.");
    invariant(/^v[1-9][0-9]*\.[0-9]+$/u.test(graphVersion ?? ""), "INVALID_INSTAGRAM_DISCOVERY_CONFIG",
      "Instagram discovery needs a Graph API version such as v26.0.");
    this.adapterId = INSTAGRAM_DISCOVERY_ADAPTER_ID;
    this.inner = inner;
    this.policy = structuredClone(policy);
    this.accountId = accountId;
    this.accessToken = accessToken;
    this.graphVersion = graphVersion;
    this.transport = transport;
    this.clock = clock;
    this.maxRequests = maxRequests;
    this.requests = 0;
  }

  async capture({runKey, url}) {
    const username = instagramUsername(url);
    if (!username) return this.inner.capture({runKey, url});
    const profileUrl = `https://www.instagram.com/${username}`;
    if (this.requests >= this.maxRequests) {
      return this.result({runKey, profileUrl, outcome: "discovery_limit_reached", status: null, account: null,
        networkRequests: 0});
    }
    this.requests += 1;
    const fields = `business_discovery.username(${username}){username,name,biography,website,` +
      `media.limit(${MEDIA_LIMIT}){caption,permalink,timestamp}}`;
    const request = new URL(`https://graph.facebook.com/${this.graphVersion}/${this.accountId}`);
    request.searchParams.set("fields", fields);
    let status = null;
    let body = null;
    try {
      // The token travels in a header so it never lands in a request log.
      const response = await this.transport(request, {method: "GET", redirect: "error",
        headers: {Authorization: `Bearer ${this.accessToken}`}, signal: AbortSignal.timeout(TIMEOUT_MS)});
      status = response.status;
      const raw = await response.text();
      body = raw.length <= MAX_RESPONSE_BYTES ? JSON.parse(raw) : null;
    } catch {
      return this.result({runKey, profileUrl, outcome: "provider_error", status, account: null, networkRequests: 1});
    }
    const account = discoveredAccount(body?.business_discovery);
    if (status === 200 && account?.username === username) {
      return this.result({runKey, profileUrl, outcome: "fetched", status, account, networkRequests: 1});
    }
    // Any other refusal is a personal, private, age-gated or missing account.
    const outcome = Number(body?.error?.code) === INVALID_TOKEN_CODE ? "provider_auth_error" :
      status !== null && status >= 400 && status < 500 ? "not_discoverable" : "provider_error";
    return this.result({runKey, profileUrl, outcome, status, account: null, networkRequests: 1});
  }

  result({runKey, profileUrl, outcome, status, account, networkRequests}) {
    const capturedAt = this.clock().toISOString();
    const snapshot = account ? snapshotFromAccount({profileUrl, status, account, fetchedAt: capturedAt}) : null;
    return {snapshot, receipt: {
      schemaVersion: 1,
      runKey,
      adapterId: this.adapterId,
      policyVersion: this.policy.policyVersion,
      policyDecisionId: null,
      requestedUrl: profileUrl,
      finalUrl: snapshot ? profileUrl : null,
      outcome,
      status: typeof status === "number" && status >= 100 && status <= 599 ? status : null,
      contentType: snapshot ? "application/json" : null,
      capturedAt: networkRequests > 0 ? capturedAt : null,
      snapshotHash: snapshot?.contentHash ?? null,
      snapshotBytes: snapshot ? Buffer.byteLength(JSON.stringify(snapshot), "utf8") : 0,
      networkRequestsConsumed: networkRequests,
      budgetWindow: null,
      rawPayloadPersistence: RAW_PAYLOAD_PERSISTENCE,
      firestorePersistenceAllowed: false,
    }};
  }
}

/** The username of an Instagram profile URL; posts, reels and stories name none. */
export function instagramUsername(url) {
  try {
    const surface = normalizeOrganizerSurfaceUrl(url);
    const key = surface.platform === "instagram" ? surface.normalizedKey : null;
    const username = key?.startsWith("instagram:") ? key.slice("instagram:".length).toLowerCase() : null;
    return username && /^[a-z0-9._]{1,30}$/u.test(username) ? username : null;
  } catch {
    return null;
  }
}

/** Only the public fields Catch asked for, bounded. */
function discoveredAccount(value) {
  if (!value || typeof value !== "object") return null;
  const bounded = (field, max) => typeof field === "string" && field.trim() ? field.trim().slice(0, max) : null;
  const media = Array.isArray(value.media?.data) ? value.media.data : [];
  return {
    username: bounded(value.username, 30)?.toLowerCase() ?? null,
    name: bounded(value.name, 200),
    biography: bounded(value.biography, 1000),
    website: bounded(value.website, 2000),
    media: {data: media.slice(0, MEDIA_LIMIT).map((item) => ({
      caption: bounded(item?.caption, 2200),
      permalink: bounded(item?.permalink, 2000),
      timestamp: bounded(item?.timestamp, 40),
    }))},
  };
}

function snapshotFromAccount({profileUrl, status, account, fetchedAt}) {
  const text = [account.name, account.biography, account.website,
    ...account.media.data.map((item) => item.caption)].filter(Boolean).join("\n\n").slice(0, MAX_TEXT_CHARS);
  const snapshot = {
    schemaVersion: PAGE_SNAPSHOT_VERSION,
    url: profileUrl,
    finalUrl: profileUrl,
    status,
    contentType: "application/json",
    fetchedAt,
    title: account.name ?? account.username,
    canonicalUrl: profileUrl,
    meta: account.biography ? {description: account.biography} : {},
    jsonLd: [],
    embeddedJson: [{id: BUSINESS_DISCOVERY_JSON_ID, value: account}],
    jsonParseFailures: 0,
    text,
  };
  return {...snapshot, contentHash: hashValue(snapshot)};
}
