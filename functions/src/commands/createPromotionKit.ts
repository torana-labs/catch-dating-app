/* eslint-disable max-len */
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {BRAND} from "../shared/generated/brand";
import {authorizeInviteLinkManager, eventInviteToken, hostInviteLinkDocuments} from "../events/inviteLinks";
import type {CreatePromotionKitCallablePayload} from
  "../shared/generated/createPromotionKitCallablePayload";
import type {CreatePromotionKitCallableResponse} from
  "../shared/generated/createPromotionKitCallableResponse";
import {validateCreatePromotionKitCallablePayload} from
  "../shared/generated/validators/createPromotionKitInput";
import {
  assertConfirmMatches,
  commandPreviewHash,
  commandReceiptDocumentId,
  commandReceiptKey,
  commandRequestHash,
  recordCommand,
  replayCommand,
  requirePhoneVerifiedCaller,
} from "./envelope";

// Command promotion.create-kit (contracts/commands/catalog.json; #2062 C3).
// A phone-verified manager of an event's organizer names the channels and
// promoters they will share the event through. Preview lists the links; apply
// creates one invite link per entry in one transaction, through the invite
// link authority and documents createEventInviteLink uses, so opens,
// registrations and check-ins count per link as they do today. The kit's
// links share a campaign id for reports. Nothing is sent: the confirmation,
// reminder and day-of messages from the C3 spec message guests and come in a
// later slice behind explicit confirmation.

export const COMMAND_ID = "promotion.create-kit";
const MINUTE_MS = 60 * 1000;

type Response = CreatePromotionKitCallableResponse;
type Input = CreatePromotionKitCallablePayload["input"];
type Link = Response["result"]["links"][number];

export interface CreatePromotionKitDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  timestamp: () => FirebaseFirestore.Timestamp;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit: typeof defaultCheckRateLimit;
}

const defaultDeps: CreatePromotionKitDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  timestamp: () => admin.firestore.Timestamp.now(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

export async function createPromotionKitHandler(request: CallableRequest<unknown>,
  deps: CreatePromotionKitDeps = defaultDeps): Promise<Response> {
  const caller = requirePhoneVerifiedCaller(request);
  const data = validateCallableWithAjv<CreatePromotionKitCallablePayload>(request,
    validateCreatePromotionKitCallablePayload);
  const input = normalizedInput(data.input);
  const db = deps.firestore();
  await deps.checkRateLimit(db, caller.uid, "createPromotionKit", {maxRequests: 20, windowMs: MINUTE_MS});
  const campaignId = `kit_${createHash("sha256").update(commandReceiptKey(caller.uid, data.idempotencyKey)).digest("hex").slice(0, 24)}`;
  const planned: Link[] = input.links.map((link) => ({label: link.label, source: link.source ?? null,
    kind: link.kind ?? "channel", inviteLinkId: null, url: null}));
  const labels = new Set(planned.map((link) => link.label.toLowerCase()));
  if (labels.size !== planned.length) {
    return respond("refused", {eventId: input.eventId, organizerId: null, campaignId, links: planned,
      reasons: ["duplicate_label"], hash: commandPreviewHash(COMMAND_ID, caller.uid, input, {reasons: ["duplicate_label"]})});
  }
  const eventRef = db.collection("events").doc(input.eventId);

  if (data.mode === "preview") {
    const {organizerId} = await db.runTransaction((tx) => authorizeInviteLinkManager(tx, db, eventRef, caller.uid),
      {readOnly: true});
    return respond("previewed", {eventId: input.eventId, organizerId, campaignId, links: planned, reasons: [],
      hash: previewHashFor(caller.uid, input, organizerId)});
  }

  const now = deps.now();
  const requestHash = commandRequestHash(COMMAND_ID, caller.uid, input, data.confirm ?? null);
  const receiptId = commandReceiptDocumentId(db, COMMAND_ID, caller.uid, data.idempotencyKey);
  return db.runTransaction(async (tx) => {
    const replay = await replayCommand<Response>(tx, db, {commandId: COMMAND_ID, uid: caller.uid,
      idempotencyKey: data.idempotencyKey, requestHash, nowMillis: now.getTime()});
    if (replay) return {...replay.response, status: "replayed" as const};
    const {organizerId} = await authorizeInviteLinkManager(tx, db, eventRef, caller.uid);
    const hash = previewHashFor(caller.uid, input, organizerId);
    assertConfirmMatches(COMMAND_ID, data.confirm, hash);
    const windowEndsAt = admin.firestore.Timestamp.fromMillis(deps.timestamp().toMillis() +
      (input.attributionWindowDays ?? 30) * 24 * 60 * MINUTE_MS);
    const links = planned.map((link) => {
      const inviteRef = db.collection("eventInviteLinks").doc();
      const inviteToken = eventInviteToken(inviteRef.id);
      const documents = hostInviteLinkDocuments({eventId: input.eventId, organizerId, hostUid: caller.uid,
        label: link.label, source: link.source, inviteToken,
        linkKind: link.kind === "promoter" ? "promoter" : "hostChannel", destinationKind: "catchEvent",
        intendedRecipientContactId: null, campaignId, attributionWindowEndsAt: windowEndsAt,
        now: deps.serverTimestamp()});
      tx.create(inviteRef, documents.link);
      tx.create(db.collection("eventInviteLinkSecrets").doc(inviteRef.id), documents.secret);
      return {...link, inviteLinkId: inviteRef.id, url: `${BRAND.web.origin}/invite/${inviteToken}`};
    });
    const applied = respond("applied", {eventId: input.eventId, organizerId, campaignId, links, reasons: [], hash, receiptId});
    recordCommand(tx, db, {commandId: COMMAND_ID, uid: caller.uid, idempotencyKey: data.idempotencyKey, requestHash,
      nowMillis: now.getTime(), response: applied});
    return applied;
  });
}

export const createPromotionKit = onCall(appCheckCallableOptions, (request) => createPromotionKitHandler(request));

/** Trimmed labels and sources, so a retry with stray spaces matches. */
function normalizedInput(input: Input): Input {
  return {...input, links: input.links.map((link) => ({...link, label: link.label.trim(),
    ...(link.source === undefined ? {} : {source: link.source.trim()})}))};
}

function previewHashFor(uid: string, input: Input, organizerId: string): string {
  return commandPreviewHash(COMMAND_ID, uid, input, {organizerId});
}

function respond(status: Response["status"], options: {eventId: string; organizerId: string | null;
  campaignId: string; links: Link[]; reasons: string[]; hash: string; receiptId?: string}): Response {
  const {links} = options;
  return {
    commandId: COMMAND_ID, status, previewHash: options.hash,
    summary: summaryFor(status, links, options.reasons),
    effects: status === "applied" ? links.map((link) => ({kind: "invite_link",
      ref: link.inviteLinkId ? `eventInviteLinks/${link.inviteLinkId}` : null,
      label: `Tracked link: ${link.label}`.slice(0, 200)})) : [],
    next: [], receiptId: options.receiptId ?? null,
    result: {eventId: options.eventId, organizerId: options.organizerId, campaignId: options.campaignId, links,
      reasons: options.reasons},
  };
}

function summaryFor(status: Response["status"], links: Link[], reasons: string[]): Response["summary"] {
  if (status === "refused") {
    return {headline: "We can't make this kit.", lines: [reasons[0] === "duplicate_label" ?
      "Give each link a different name." : "Check the event and try again."]};
  }
  const lines = links.map((link) => `${link.kind === "promoter" ? "Promoter" : "Channel"}: ${link.label}`.slice(0, 200));
  lines.push("Each link counts its own opens, sign-ups and check-ins. Nothing is sent to anyone.");
  return status === "previewed" ?
    {headline: `We'll make ${links.length} tracked ${links.length === 1 ? "link" : "links"}.`, lines} :
    {headline: `Your ${links.length} tracked ${links.length === 1 ? "link is" : "links are"} ready to share.`,
      lines: ["Share each link where it's named, or print its QR code.", ...lines.slice(-1)]};
}
