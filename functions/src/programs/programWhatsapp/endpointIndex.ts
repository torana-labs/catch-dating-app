import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import type {
  ProgramWhatsappEndpointIndexDocument,
} from "../../shared/generated/firestoreAdminTypes";
import {validateProgramWhatsappEndpointIndexDocument} from
  "../../shared/generated/validators/programWhatsappEndpointIndexDocument";
import {whatsappEndpointHash} from
  "../../eventSuccess/operations/whatsappReplyProtocol";
import {
  PROGRAM_WHATSAPP_ENDPOINT_INDEX,
  programWhatsappEndpointIndexId,
} from "./ids";

// The endpoint index maps {programId, sha256(E.164)} to the household a
// WhatsApp number reaches. A trigger on programHouseholds and programGuests
// keeps it current for every write path (RSVP, manifest import, upserts,
// merges, retention scrubs); the backfill script seeds existing records.

export type EndpointClaimant =
  ProgramWhatsappEndpointIndexDocument["claimants"][number];

/** One record's claim on one number, or null when it claims none. */
export interface EndpointClaim {
  programId: string;
  organizerId: string;
  endpointHash: string;
  claimant: EndpointClaimant;
}

type Data = Record<string, unknown> | undefined;

/** A household claims its primary phone for itself. */
export function householdEndpointClaim(householdId: string, data: Data):
  EndpointClaim | null {
  if (!data || typeof data.programId !== "string" ||
      typeof data.organizerId !== "string" || data.anonymizedAt) return null;
  const endpointHash = whatsappEndpointHash(data.primaryPhoneE164);
  return endpointHash ? {programId: data.programId,
    organizerId: data.organizerId, endpointHash,
    claimant: {kind: "household", id: householdId, householdId}} : null;
}

/** A guest's own phone reaches their household; no household, no claim. */
export function guestEndpointClaim(guestId: string, data: Data):
  EndpointClaim | null {
  if (!data || typeof data.programId !== "string" ||
      typeof data.organizerId !== "string" || data.anonymizedAt ||
      typeof data.householdId !== "string" || !data.householdId) return null;
  const endpointHash = whatsappEndpointHash(data.phoneE164);
  return endpointHash ? {programId: data.programId,
    organizerId: data.organizerId, endpointHash,
    claimant: {kind: "guest", id: guestId, householdId: data.householdId}} :
    null;
}

function sameClaim(left: EndpointClaim | null, right: EndpointClaim | null):
  boolean {
  return !!left && !!right && left.programId === right.programId &&
    left.endpointHash === right.endpointHash &&
    left.claimant.householdId === right.claimant.householdId;
}

/** Pure merge: the claimant list after one record claims or releases. */
export function mergeClaimants(existing: EndpointClaimant[],
  claimant: EndpointClaimant, op: "claim" | "release"): EndpointClaimant[] {
  const others = existing.filter((entry) =>
    !(entry.kind === claimant.kind && entry.id === claimant.id));
  const next = op === "claim" ? [...others, claimant] : others;
  // Households first, then guests; stable by id so replays agree.
  return next.sort((a, b) => a.kind === b.kind ?
    a.id.localeCompare(b.id) : a.kind === "household" ? -1 : 1)
    .slice(0, 20);
}

/** The routing fields an index document derives from its claimants. */
export function indexRouting(claimants: EndpointClaimant[]): Pick<
  ProgramWhatsappEndpointIndexDocument,
  "householdId" | "guestId" | "source" | "ambiguous"> | null {
  const primary = claimants[0];
  if (!primary) return null;
  return {
    householdId: primary.householdId,
    guestId: primary.kind === "guest" ? primary.id : null,
    source: primary.kind,
    ambiguous: new Set(claimants.map((entry) => entry.householdId)).size > 1,
  };
}

/** Applies one record's claim change to the index inside a transaction. */
export async function applyEndpointClaimChange(
  db: FirebaseFirestore.Firestore,
  change: {before: EndpointClaim | null; after: EndpointClaim | null},
  nowMillis: number,
): Promise<void> {
  if (sameClaim(change.before, change.after)) return;
  const steps: {claim: EndpointClaim; op: "claim" | "release"}[] = [];
  if (change.before) steps.push({claim: change.before, op: "release"});
  if (change.after) steps.push({claim: change.after, op: "claim"});
  await db.runTransaction(async (tx) => {
    const refs = steps.map((step) => db
      .collection(PROGRAM_WHATSAPP_ENDPOINT_INDEX)
      .doc(programWhatsappEndpointIndexId(step.claim.programId,
        step.claim.endpointHash)));
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    const pending = new Map<string, {ref: FirebaseFirestore.DocumentReference;
      current: ProgramWhatsappEndpointIndexDocument | undefined;
      claimants: EndpointClaimant[]; claim: EndpointClaim}>();
    steps.forEach((step, index) => {
      const ref = refs[index];
      const entry = pending.get(ref.path) ?? {ref,
        current: snaps[index].data() as
          ProgramWhatsappEndpointIndexDocument | undefined,
        claimants: (snaps[index].data() as
          ProgramWhatsappEndpointIndexDocument | undefined)?.claimants ?? [],
        claim: step.claim};
      entry.claimants = mergeClaimants(entry.claimants, step.claim.claimant,
        step.op);
      pending.set(ref.path, entry);
    });
    for (const entry of pending.values()) {
      const routing = indexRouting(entry.claimants);
      if (!routing) {
        // The index is derived data; the last claimant leaving removes it.
        if (entry.current) tx.delete(entry.ref);
        continue;
      }
      const next: ProgramWhatsappEndpointIndexDocument = {
        schemaVersion: 1,
        programId: entry.claim.programId,
        organizerId: entry.claim.organizerId,
        endpointHash: entry.claim.endpointHash,
        ...routing,
        claimants: entry.claimants,
        updatedAtMillis: nowMillis,
        revision: (entry.current?.revision ?? 0) + 1,
      };
      if (!validateProgramWhatsappEndpointIndexDocument(next)) {
        throw new Error("Invalid programme WhatsApp endpoint index");
      }
      tx.set(entry.ref, next);
    }
  });
}

/** Reads the index for one programme and number (the webhook's lookup). */
export async function readEndpointIndex(db: FirebaseFirestore.Firestore,
  programId: string, endpointHash: string):
  Promise<ProgramWhatsappEndpointIndexDocument | null> {
  const snap = await db.collection(PROGRAM_WHATSAPP_ENDPOINT_INDEX)
    .doc(programWhatsappEndpointIndexId(programId, endpointHash)).get();
  const data = snap.data();
  return validateProgramWhatsappEndpointIndexDocument(data) &&
    data.programId === programId ? data : null;
}

export const onProgramHouseholdWhatsappEndpointWritten = onDocumentWritten(
  "programHouseholds/{householdId}", async (event) => {
    await applyEndpointClaimChange(admin.firestore(), {
      before: householdEndpointClaim(event.params.householdId,
        event.data?.before.data()),
      after: householdEndpointClaim(event.params.householdId,
        event.data?.after.data()),
    }, Date.now());
  });

export const onProgramGuestWhatsappEndpointWritten = onDocumentWritten(
  "programGuests/{guestId}", async (event) => {
    await applyEndpointClaimChange(admin.firestore(), {
      before: guestEndpointClaim(event.params.guestId,
        event.data?.before.data()),
      after: guestEndpointClaim(event.params.guestId,
        event.data?.after.data()),
    }, Date.now());
  });
