import * as admin from "firebase-admin";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {listingSuppressionHmacKey} from "../listingSuppressions/registry";
import {clientAddress, limiterKey} from "./requestLimits";
import type {EnsureTryItWorkspaceCallablePayload} from
  "../shared/generated/ensureTryItWorkspaceCallablePayload";
import type {EnsureTryItWorkspaceCallableResponse} from
  "../shared/generated/ensureTryItWorkspaceCallableResponse";
import {validateEnsureTryItWorkspaceCallablePayload} from
  "../shared/generated/validators/ensureTryItWorkspaceInput";
import {
  assertConfirmMatches,
  commandPreviewHash,
  commandReceiptDocumentId,
  commandRequestHash,
  recordCommand,
  replayCommand,
  requirePhoneVerifiedCaller,
} from "./envelope";
import {
  readTryItWorkspace,
  requireOpenMarket,
  stageTryItWorkspace,
  TRY_IT_WORKSPACES,
  WORKSPACE_TTL_DAYS,
  type StoredTryItWorkspace,
  type WorkspaceLookup,
} from "./workspace";

// Command workspace.ensure (contracts/commands/catalog.json). The website's
// phone step calls it with the brand name and city once the visitor's
// account is complete (manageWebsiteAccount); Catch Host and the catch CLI
// call the same command. Preview describes the workspace without writing;
// apply creates it, adopts the caller's one existing organizer, or returns
// the workspace they already have.

export const COMMAND_ID = "workspace.ensure";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type Response = EnsureTryItWorkspaceCallableResponse;

export interface EnsureTryItWorkspaceDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit: typeof defaultCheckRateLimit;
}

const defaultDeps: EnsureTryItWorkspaceDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

export async function ensureTryItWorkspaceHandler(
  request: CallableRequest<unknown>,
  deps: EnsureTryItWorkspaceDeps = defaultDeps
): Promise<Response> {
  const caller = requirePhoneVerifiedCaller(request);
  const data = validateCallableWithAjv<EnsureTryItWorkspaceCallablePayload>(
    request, validateEnsureTryItWorkspaceCallablePayload);
  const input = {organizerName: data.input.organizerName.trim(),
    marketId: data.input.marketId};
  const db = deps.firestore();
  await deps.checkRateLimit(db, caller.uid, "ensureTryItWorkspace",
    {maxRequests: 60, windowMs: HOUR_MS});

  if (data.mode === "preview") {
    const lookup = await db.runTransaction(
      (tx) => readTryItWorkspace(tx, db, caller.uid), {readOnly: true});
    if (lookup.kind === "new") requireOpenMarket(input.marketId);
    return describe(lookup, null, input, caller.uid, "previewed", null);
  }

  const requestHash = commandRequestHash(COMMAND_ID, caller.uid, input,
    data.confirm ?? null);
  // Only a brand-new workspace counts against the creation limits.
  const pointer = await db.collection(TRY_IT_WORKSPACES).doc(caller.uid).get();
  if (!pointer.exists || pointer.data()?.state === "expired") {
    await deps.checkRateLimit(db, limiterKey("ip", clientAddress(request)),
      "ensureTryItWorkspaceAddress", {maxRequests: 10, windowMs: HOUR_MS});
    await deps.checkRateLimit(db, "try-it-workspaces",
      "ensureTryItWorkspaceDaily", {maxRequests: 300, windowMs: DAY_MS});
  }
  const receiptId = commandReceiptDocumentId(db, COMMAND_ID, caller.uid,
    data.idempotencyKey);
  const response = await db.runTransaction(async (tx) => {
    const now = deps.now();
    const replay = await replayCommand<Response>(tx, db, {
      commandId: COMMAND_ID, uid: caller.uid,
      idempotencyKey: data.idempotencyKey, requestHash,
      nowMillis: now.getTime(),
    });
    if (replay) return {...replay.response, status: "replayed" as const};
    const lookup = await readTryItWorkspace(tx, db, caller.uid);
    const preview = describe(lookup, null, input, caller.uid, "previewed",
      null);
    assertConfirmMatches(COMMAND_ID, data.confirm, preview.previewHash);
    const workspace = await stageTryItWorkspace(tx, db, lookup, {
      uid: caller.uid, now, commandId: COMMAND_ID, surface: data.surface,
      organizerName: input.organizerName, marketId: input.marketId,
      serverTimestamp: deps.serverTimestamp,
    });
    const applied = describe(lookup, workspace, input, caller.uid, "applied",
      receiptId, preview.previewHash);
    recordCommand(tx, db, {commandId: COMMAND_ID, uid: caller.uid,
      idempotencyKey: data.idempotencyKey, requestHash,
      nowMillis: now.getTime(), response: applied});
    return applied;
  });
  if (response.status === "applied" && response.result.created) {
    // The phone stays out of logs.
    logger.info("Try-it workspace created.", {organizerId:
      response.result.organizerId, surface: data.surface});
  }
  return response;
}

export const ensureTryItWorkspace = onCall(
  appCheckCallableOptionsWithSecrets([listingSuppressionHmacKey]),
  (request) => ensureTryItWorkspaceHandler(request));

/**
 * The plain-language response for a lookup, before (workspace null) or
 * after the workspace is staged. The preview hash covers what the caller is
 * shown, so apply refuses a confirm when the workspace changed meanwhile.
 * @return {Response} The command response.
 */
function describe(lookup: WorkspaceLookup,
  workspace: StoredTryItWorkspace | null,
  input: {organizerName: string; marketId: string}, uid: string,
  status: "previewed" | "applied", receiptId: string | null,
  previewHash?: string): Response {
  const organizer = lookup.kind === "new" ? null : lookup.organizer;
  const organizerName = typeof organizer?.name === "string" ?
    organizer.name : input.organizerName;
  const marketId = typeof organizer?.locationMarketId === "string" ?
    organizer.locationMarketId : input.marketId;
  const publishStatus = (organizer?.publicPage as {publishStatus?: unknown} |
    undefined)?.publishStatus === "published" ? "published" : "draft";
  const expiresAt = workspace ? workspace.expiresAt :
    lookup.kind === "existing" ? lookup.pointer.expiresAt : null;
  const hash = previewHash ?? commandPreviewHash(COMMAND_ID, uid, input,
    {kind: lookup.kind, organizerId: lookup.kind === "existing" ?
      lookup.pointer.organizerId : lookup.organizerId});
  const created = status === "applied" && lookup.kind === "new";
  const keepLine = `If you don't use it, we remove it ${WORKSPACE_TTL_DAYS} ` +
    "days after you last use a tool, unless you publish it or add an event.";
  let headline: string;
  let lines: string[];
  if (lookup.kind === "new") {
    const city = requireOpenMarket(input.marketId).cityLabel;
    headline = status === "previewed" ?
      `This creates your private organizer profile "${organizerName}" in ` +
        `${city}.` :
      `Your private organizer profile "${organizerName}" is ready.`;
    lines = ["Only you can see it until you publish it.",
      "Every tool you try adds to it, and Catch Host shows it when you " +
        "sign in with this phone number.", keepLine];
  } else if (lookup.kind === "adopt") {
    headline = `Your tools will add to "${organizerName}".`;
    lines = ["This is the organizer you already run on Catch."];
  } else {
    headline = `Your organizer profile "${organizerName}" is ready.`;
    lines = publishStatus === "draft" ?
      ["Only you can see it until you publish it."] : [];
    if (lookup.pointer.state === "active") lines.push(keepLine);
  }
  const organizerId = lookup.kind === "existing" ?
    lookup.pointer.organizerId : lookup.organizerId;
  return {
    commandId: COMMAND_ID, status, previewHash: hash,
    summary: {headline, lines},
    effects: lookup.kind === "new" ? [{kind: "organizer_created",
      ref: `organizers/${organizerId}`,
      label: `Private organizer profile "${organizerName}"`}] : [],
    next: [], receiptId,
    result: {organizerId, organizerName, marketId,
      exists: status === "applied" || lookup.kind !== "new", created,
      publishStatus, expiresAt},
  };
}
