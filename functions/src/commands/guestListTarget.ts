import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import {createPrivateEventSetup} from "../events/progressiveSetup/service";
import {marketForIdOrAlias} from "../locations/marketConfig";
import type {CommandSurface} from "./envelope";
import {localDateTime} from "./importEventFromLink";
import {
  readTryItWorkspace,
  stageTryItWorkspace,
  type WorkspaceLookup,
} from "./workspace";

// Where guests.import-list saves guests when the caller names no event (owner
// decision on #2061, 19 Nov 2026, question 1 (a)): the caller's try-it
// workspace. The guests go on the workspace's newest try-it draft event that
// is still private and active (the one event.import-from-link made), or else
// on a private placeholder draft event made here through event setup, the
// path the Host app takes. Every such event is recorded on the workspace
// (tryItWorkspaces/{uid}.tryItEventIds), which is how the expiry sweep tells
// try-it drafts from events the host made.

export const PLACEHOLDER_EVENT_NAME = "Guest list";
const PLACEHOLDER_START_TIME = "19:00";
const PLACEHOLDER_DAYS_AHEAD = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface GuestListTargetDeps {
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
}

/** The event guests go on, and whether it is the try-it workspace's. */
export interface GuestListTarget {
  eventId: string;
  organizerId: string;
  /** "event": named by the caller; otherwise the workspace's draft. */
  source: "event" | "try_it_draft" | "try_it_placeholder";
}

/**
 * Resolves the event an import saves to. A named event is read as it is; the
 * caller's role on it is checked by the review session. With no event, the
 * caller's try-it workspace supplies one; a placeholder made here is recorded
 * on the workspace straight away, so the sweep sees it even if this import
 * goes no further.
 * @return {Promise<GuestListTarget>} The event to import into.
 */
export async function resolveGuestListTarget(
  db: FirebaseFirestore.Firestore,
  deps: GuestListTargetDeps,
  params: {uid: string; eventId: string | undefined; commandId: string;
    surface: CommandSurface}
): Promise<GuestListTarget> {
  if (params.eventId) {
    const eventSnap = await db.collection("events").doc(params.eventId).get();
    const organizerId = eventSnap.data()?.organizerId;
    if (!eventSnap.exists || typeof organizerId !== "string") {
      throw new HttpsError("not-found", "Event not found.");
    }
    return {eventId: params.eventId, organizerId, source: "event"};
  }

  const lookup = await db.runTransaction(
    (tx) => readTryItWorkspace(tx, db, params.uid), {readOnly: true});
  if (lookup.kind === "new") {
    throw new HttpsError("failed-precondition",
      "Set up your organizer profile first.", {reason: "no_workspace"});
  }
  const organizerId = lookup.kind === "existing" ?
    lookup.pointer.organizerId : lookup.organizerId;
  const draftId = await currentTryItDraft(db, lookup, organizerId);
  if (draftId) return {eventId: draftId, organizerId, source: "try_it_draft"};

  const market = marketForIdOrAlias(marketIdOf(lookup.organizer));
  if (!market || !market.eventCreatable) {
    throw new HttpsError("failed-precondition",
      "Your profile's city isn't open for events yet.",
      {reason: "city_unavailable"});
  }
  const now = deps.now();
  const day = localDateTime(
    new Date(now.getTime() + PLACEHOLDER_DAYS_AHEAD * DAY_MS).toISOString(),
    market.timeZone).date;
  // Event setup replays its own receipt per request id, so imports racing
  // each other on the same day share one placeholder.
  const setup = await createPrivateEventSetup({actorUid: params.uid,
    command: {organizerId, requestId: placeholderRequestId(params.uid,
      organizerId, now), basics: {name: PLACEHOLDER_EVENT_NAME,
      city: {mode: "set", value: {cityId: market.cityId,
        marketId: market.marketId}},
      localDate: day, localStartTime: PLACEHOLDER_START_TIME,
      timezone: {mode: "set", value: market.timeZone}}},
    deps: {db, timestampFromMillis: deps.timestampFromMillis,
      serverTimestamp: deps.serverTimestamp}});
  await recordTryItEvent(db, deps, {uid: params.uid,
    eventId: setup.eventId, commandId: params.commandId,
    surface: params.surface, organizerName: lookup.organizer.name});
  return {eventId: setup.eventId, organizerId,
    source: "try_it_placeholder"};
}

/**
 * Records [eventId] as a try-it draft on the caller's workspace and counts
 * the command on it, pushing an active workspace's expiry out.
 */
export async function recordTryItEvent(db: FirebaseFirestore.Firestore,
  deps: GuestListTargetDeps, params: {uid: string; eventId: string;
    commandId: string; surface: CommandSurface; organizerName: unknown},
  tx?: FirebaseFirestore.Transaction): Promise<void> {
  const stage = async (inTx: FirebaseFirestore.Transaction) => {
    const lookup = await readTryItWorkspace(inTx, db, params.uid);
    // A workspace that disappeared since the event was chosen is left alone.
    if (lookup.kind === "new") return;
    await stageTryItWorkspace(inTx, db, lookup, {uid: params.uid,
      now: deps.now(), commandId: params.commandId, surface: params.surface,
      organizerName: typeof params.organizerName === "string" ?
        params.organizerName : "Organizer", marketId: "",
      serverTimestamp: deps.serverTimestamp, draftEventId: params.eventId});
  };
  if (tx) {
    await stage(tx);
    return;
  }
  await db.runTransaction(stage);
}

/** The newest recorded try-it event that is still a private, active draft. */
async function currentTryItDraft(db: FirebaseFirestore.Firestore,
  lookup: Exclude<WorkspaceLookup, {kind: "new"}>,
  organizerId: string): Promise<string | null> {
  if (lookup.kind !== "existing") return null;
  const ids = [...(lookup.pointer.tryItEventIds ?? [])].reverse();
  for (const id of ids) {
    const event = (await db.collection("events").doc(id).get()).data();
    if (event && event.organizerId === organizerId &&
        event.publicationState === "private" && event.status === "active") {
      return id;
    }
  }
  return null;
}

/** One placeholder per workspace organizer and UTC day. */
function placeholderRequestId(uid: string, organizerId: string,
  now: Date): string {
  const digest = createHash("sha256").update(JSON.stringify(
    ["guest-list-placeholder", uid, organizerId,
      now.toISOString().slice(0, 10)])).digest("hex");
  return `tryitguests-${digest.slice(0, 40)}`;
}

function marketIdOf(organizer: Record<string, unknown>): string | null {
  for (const value of [organizer.locationMarketId, organizer.location]) {
    if (typeof value === "string" && value) return value;
  }
  return null;
}
