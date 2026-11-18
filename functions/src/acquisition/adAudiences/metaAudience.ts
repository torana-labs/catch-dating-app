import {randomInt} from "node:crypto";

/**
 * Meta Marketing API calls for one customer-file custom audience: find it by
 * name, create it when missing, replace its whole membership, or delete it.
 * Rows are already hashed; nothing here sees a raw phone or email.
 */
export const META_GRAPH = "https://graph.facebook.com/v26.0";
/** Catch's Meta ad account (`tool/ads/meta_campaigns.json`). */
export const META_AD_ACCOUNT_ID = "3245368689001899";
/** Meta takes at most 10,000 rows per replace batch. */
export const META_REPLACE_BATCH = 10_000;
/** Multi-key rows, in this order; a missing key is an empty string. */
export const META_AUDIENCE_SCHEMA = ["EMAIL", "PHONE"] as const;

export type MetaAudienceRow = [email: string, phone: string];

export class MetaAudienceError extends Error {
  constructor(readonly code: string) {
    super(`Meta audience request failed: ${code}`);
  }
}

export interface MetaGraphDeps {
  token: string;
  fetch?: typeof fetch;
}

async function graph(deps: MetaGraphDeps, method: "GET" | "POST" | "DELETE",
  path: string, body?: Record<string, unknown>, step = "graph"):
  Promise<Record<string, unknown>> {
  if (!deps.token || /[\r\n]/u.test(deps.token)) {
    throw new MetaAudienceError("meta_credential_unavailable");
  }
  let response: Response;
  try {
    response = await (deps.fetch ?? fetch)(`${META_GRAPH}/${path}`, {
      method, redirect: "error",
      headers: {"Authorization": `Bearer ${deps.token}`,
        ...(body ? {"Content-Type": "application/json"} : {})},
      ...(body ? {body: JSON.stringify(body)} : {}),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new MetaAudienceError(`${step}_transport`);
  }
  const text = await response.text().catch(() => "");
  let parsed: unknown = null;
  try {
    parsed = text.length <= 262_144 ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    throw new MetaAudienceError(`${step}_${response.status}`);
  }
  return parsed && typeof parsed === "object" ?
    parsed as Record<string, unknown> : {};
}

/**
 * The audience with this exact name in Catch's ad account, or null.
 * @param {MetaGraphDeps} deps Token and fetch.
 * @param {string} name Audience name.
 * @return {Promise<string|null>} Audience ID.
 */
export async function findMetaAudience(deps: MetaGraphDeps, name: string):
  Promise<string | null> {
  let after: string | null = null;
  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({fields: "id,name", limit: "200",
      ...(after ? {after} : {})});
    const body = await graph(deps, "GET",
      `act_${META_AD_ACCOUNT_ID}/customaudiences?${query}`, undefined,
      "find");
    const rows = Array.isArray(body.data) ? body.data : [];
    for (const row of rows) {
      const item = row as Record<string, unknown>;
      if (item.name === name && typeof item.id === "string") return item.id;
    }
    const paging = body.paging as Record<string, unknown> | undefined;
    const cursors = paging?.cursors as Record<string, unknown> | undefined;
    if (!paging?.next || typeof cursors?.after !== "string") return null;
    after = cursors.after;
  }
  return null;
}

/**
 * Creates a customer-file audience of user-provided contacts.
 * @param {MetaGraphDeps} deps Token and fetch.
 * @param {string} name Audience name.
 * @param {string} description Audience description.
 * @return {Promise<string>} Audience ID.
 */
export async function createMetaAudience(deps: MetaGraphDeps, name: string,
  description: string): Promise<string> {
  const body = await graph(deps, "POST",
    `act_${META_AD_ACCOUNT_ID}/customaudiences`, {name, description,
      subtype: "CUSTOM", customer_file_source: "USER_PROVIDED_ONLY"},
    "create");
  if (typeof body.id !== "string") {
    throw new MetaAudienceError("create_malformed");
  }
  return body.id;
}

/**
 * Replaces the audience's whole membership with these rows in one replace
 * session (`/usersreplace`): anyone not in the rows leaves the audience.
 * @param {MetaGraphDeps} deps Token and fetch.
 * @param {string} audienceId Audience ID.
 * @param {MetaAudienceRow[]} rows Hashed rows; at least one.
 * @param {number} sessionId Session ID, unique within the ad account.
 * @return {Promise<object>} Rows received and invalid.
 */
export async function replaceMetaAudience(deps: MetaGraphDeps,
  audienceId: string, rows: MetaAudienceRow[],
  sessionId: number = randomInt(1, 2 ** 47)):
  Promise<{received: number; invalid: number}> {
  if (rows.length === 0) throw new MetaAudienceError("replace_empty");
  let received = 0;
  let invalid = 0;
  const batches = Math.ceil(rows.length / META_REPLACE_BATCH);
  for (let index = 0; index < batches; index += 1) {
    const data = rows.slice(index * META_REPLACE_BATCH,
      (index + 1) * META_REPLACE_BATCH);
    const body = await graph(deps, "POST", `${audienceId}/usersreplace`, {
      session: {session_id: sessionId, batch_seq: index + 1,
        last_batch_flag: index === batches - 1,
        estimated_num_total: rows.length},
      payload: {schema: META_AUDIENCE_SCHEMA, data},
    }, "replace");
    received += Number(body.num_received) || 0;
    invalid += Number(body.num_invalid_entries) || 0;
  }
  return {received, invalid};
}

/**
 * Deletes the audience, which removes everyone in it.
 * @param {MetaGraphDeps} deps Token and fetch.
 * @param {string} audienceId Audience ID.
 * @return {Promise<void>} Completion.
 */
export async function deleteMetaAudience(deps: MetaGraphDeps,
  audienceId: string): Promise<void> {
  await graph(deps, "DELETE", audienceId, undefined, "delete");
}
