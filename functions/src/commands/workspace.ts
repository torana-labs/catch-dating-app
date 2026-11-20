import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import {marketForIdOrAlias} from "../locations/marketConfig";
import {stageOwnedOrganizerCreate} from "../organizers/createOrganizer";
import type {CommandSurface} from "./envelope";

// The try-it workspace (owner decisions, 18 Nov 2026). A phone-verified
// visitor gets one private, unpublished organizer they own from the start:
// the same record createOrganizer makes, so Catch Host shows it on sign-in
// and every host command works on it unchanged. Every try-it tool writes
// into it, so browsing the website bootstraps the organizer's profile.
// tryItWorkspaces/{uid} only points at it and tracks expiry: an untouched
// workspace is removed 30 days after its last command unless it was kept
// (workspaceExpiry.ts).

export const TRY_IT_WORKSPACES = "tryItWorkspaces";
export const WORKSPACE_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const BASE62 =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export type WorkspaceState = "active" | "kept" | "expired";
export type WorkspaceKeptReason = "published" | "has_events" | "has_forms" |
  "team_member" | "owner_kept" | "not_owner" | "existing_organizer";

/** tryItWorkspaces/{uid}, as its Firestore contract stores it. */
export interface StoredTryItWorkspace {
  schemaVersion: 1;
  uid: string;
  organizerId: string;
  generation: number;
  state: WorkspaceState;
  createdVia: {commandId: string; surface: CommandSurface};
  createdAt: string;
  lastCommandAt: string;
  expiresAt: string | null;
  keptAt: string | null;
  keptReason: WorkspaceKeptReason | null;
  expiredAt: string | null;
  /**
   * Private draft events try-it commands made in this workspace (an imported
   * event, or the guest list's placeholder), newest last. Absent on records
   * written before 19 Nov 2026.
   */
  tryItEventIds?: string[];
  /**
   * Private draft forms try-it commands made in this workspace
   * (form.import-from-link), newest last. Absent on records written before
   * that command existed. Kept to MAX_TRY_IT_EVENTS like events.
   */
  tryItFormIds?: string[];
}

/** At most this many try-it draft events are tracked per workspace. */
export const MAX_TRY_IT_EVENTS = 20;

/**
 * The workspace organizer's id: a 20-character id derived from the account
 * and generation, so two first commands racing each other converge on one
 * organizer, and a workspace made again after expiry gets a new one.
 * @return {string} A Firestore-auto-id-shaped organizer id.
 */
export function tryItWorkspaceOrganizerId(uid: string,
  generation: number): string {
  const digest = createHash("sha256")
    .update(`try-it-workspace\u0000${uid}\u0000${generation}`).digest();
  let id = "";
  for (let index = 0; index < 20; index += 1) {
    id += BASE62[digest[index] % 62];
  }
  return id;
}

/** What a transaction found for the caller's workspace. */
export type WorkspaceLookup =
  | {kind: "existing"; pointer: StoredTryItWorkspace;
      organizer: Record<string, unknown>}
  | {kind: "adopt"; organizerId: string; organizer: Record<string, unknown>;
      generation: number}
  | {kind: "new"; organizerId: string; generation: number};

/**
 * Reads the caller's workspace inside [tx] (before any write):
 * - their tracked workspace, while they still own its organizer;
 * - otherwise the one organizer they already own, adopted and kept;
 * - otherwise a new one to create.
 * A caller who owns several organizers chooses one in Catch Host.
 * @return {Promise<WorkspaceLookup>} What to return or create.
 */
export async function readTryItWorkspace(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<WorkspaceLookup> {
  const pointerSnap = await tx.get(db.collection(TRY_IT_WORKSPACES).doc(uid));
  const pointer = pointerSnap.exists ?
    pointerSnap.data() as StoredTryItWorkspace : null;
  if (pointer && pointer.state !== "expired") {
    const organizerSnap = await tx.get(
      db.collection("organizers").doc(pointer.organizerId));
    const organizer = organizerSnap.data();
    if (organizer && organizer.ownerUserId === uid) {
      return {kind: "existing", pointer, organizer};
    }
  }
  const owned = await tx.get(db.collection("organizers")
    .where("ownerUserId", "==", uid).limit(2));
  const generation = (pointer?.generation ?? 0) + 1;
  if (owned.size > 1) {
    throw new HttpsError("failed-precondition",
      "You run more than one organizer. Choose one in Catch Host.",
      {reason: "multiple_organizers"});
  }
  if (owned.size === 1) {
    const doc = owned.docs[0];
    return {kind: "adopt", organizerId: doc.id, organizer: doc.data(),
      generation};
  }
  return {kind: "new", organizerId: tryItWorkspaceOrganizerId(uid, generation),
    generation};
}

/** The open market an organizer may be created in, or a typed refusal. */
export function requireOpenMarket(marketId: string):
  NonNullable<ReturnType<typeof marketForIdOrAlias>> {
  const market = marketForIdOrAlias(marketId);
  if (!market || !market.hostCreatable) {
    throw new HttpsError("failed-precondition",
      "Catch isn't open for organizers in this city yet.",
      {reason: "market_not_open"});
  }
  return market;
}

/**
 * Makes the looked-up workspace current inside [tx]: creates its organizer
 * (which reads first, so call this before the command's own writes), adopts
 * the caller's existing organizer, or records this command on the existing
 * workspace, pushing its expiry 30 days out while it is active.
 * @return {Promise<StoredTryItWorkspace>} The workspace record as written.
 */
export async function stageTryItWorkspace(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  lookup: WorkspaceLookup,
  params: {uid: string; now: Date; commandId: string; surface: CommandSurface;
    organizerName: string; marketId: string;
    serverTimestamp: () => FirebaseFirestore.FieldValue;
    /** A private draft event this command made, recorded as try-it. */
    draftEventId?: string;
    /** A private draft form this command made, recorded as try-it. */
    draftFormId?: string}
): Promise<StoredTryItWorkspace> {
  const at = params.now.toISOString();
  const pointerRef = db.collection(TRY_IT_WORKSPACES).doc(params.uid);
  const withEvent = (record: StoredTryItWorkspace): StoredTryItWorkspace => {
    let next = record;
    if (params.draftEventId) {
      next = {...next, tryItEventIds: withTryItEvent(
        next.tryItEventIds, params.draftEventId)};
    }
    if (params.draftFormId) {
      next = {...next, tryItFormIds: withTryItEvent(
        next.tryItFormIds, params.draftFormId)};
    }
    return next;
  };
  if (lookup.kind === "existing") {
    const touched: StoredTryItWorkspace = withEvent({...lookup.pointer,
      lastCommandAt: at,
      expiresAt: lookup.pointer.state === "active" ?
        expiryFrom(params.now) : lookup.pointer.expiresAt});
    tx.set(pointerRef, touched);
    return touched;
  }
  const base = {schemaVersion: 1 as const, uid: params.uid,
    organizerId: lookup.organizerId, generation: lookup.generation,
    createdVia: {commandId: params.commandId, surface: params.surface},
    createdAt: at, lastCommandAt: at, expiredAt: null};
  if (lookup.kind === "adopt") {
    const adopted: StoredTryItWorkspace = withEvent({...base, state: "kept",
      expiresAt: null, keptAt: at, keptReason: "existing_organizer"});
    tx.set(pointerRef, adopted);
    return adopted;
  }
  const market = requireOpenMarket(params.marketId);
  await stageOwnedOrganizerCreate(tx, db, {
    ownerUid: params.uid,
    organizerRef: db.collection("organizers").doc(lookup.organizerId),
    data: {name: params.organizerName, description: "",
      location: market.marketId, area: ""},
    market,
    serverTimestamp: params.serverTimestamp,
  });
  const created: StoredTryItWorkspace = withEvent({...base, state: "active",
    expiresAt: expiryFrom(params.now), keptAt: null, keptReason: null});
  tx.set(pointerRef, created);
  return created;
}

export function expiryFrom(now: Date): string {
  return new Date(now.getTime() + WORKSPACE_TTL_DAYS * DAY_MS).toISOString();
}

/**
 * The workspace's try-it event ids with [eventId] added last, once, keeping
 * the newest MAX_TRY_IT_EVENTS.
 * @return {string[]} The ids to store.
 */
export function withTryItEvent(current: string[] | undefined,
  eventId: string): string[] {
  return [...(current ?? []).filter((id) => id !== eventId), eventId]
    .slice(-MAX_TRY_IT_EVENTS);
}
