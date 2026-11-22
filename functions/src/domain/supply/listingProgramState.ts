/* eslint-disable max-len */
import {HttpsError} from "firebase-functions/v2/https";
import type {ListingProgramSettingsDocument} from "../../shared/generated/firestoreAdminTypes";
import {validateListingProgramSettingsDocument} from "../../shared/generated/validators/listingProgramSettingsDocument";

// The programmatic listings pause switch (owner decision 8, 19 Nov 2026: any
// legal notice, any impersonation claim, or too many removals pauses the
// programme). One server-only document; absent means not paused. While it is
// paused, adminNominateOrganizer refuses every nomination and listing
// approval refuses any listing Catch sourced itself. An organizer's own
// submission is unaffected.

export const listingProgramSettingsCollection = "listingProgramSettings";
export const listingProgramSettingsId = "platform";
/** The cohort Admin's approval sheet suggests: the Indore pilot (plan phase 1). */
export const defaultListingCohortId = "pilot-indore-1";

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

export interface ListingProgramState {
  paused: boolean;
  reason: string | null;
  stored: ListingProgramSettingsDocument | null;
}

/**
 * The stored pause switch, or not paused when none is stored. A stored
 * document that fails its contract reads as paused: a broken kill switch
 * fails closed.
 */
export async function readListingProgramState(db: Db, tx?: Tx): Promise<ListingProgramState> {
  const ref = db.collection(listingProgramSettingsCollection).doc(listingProgramSettingsId);
  const snap = tx ? await tx.get(ref) : await ref.get();
  if (!snap.exists) return {paused: false, reason: null, stored: null};
  const data = snap.data();
  if (!validateListingProgramSettingsDocument(data)) {
    return {paused: true, reason: "The pause switch is not valid. Save it again in Settings → Intake.", stored: null};
  }
  return {paused: data.paused, reason: data.reason, stored: data};
}

/**
 * Refuses while programmatic listings are paused.
 * @param {string} refused What was refused, for the message ("Nothing was queued.").
 */
export async function assertListingProgramOpen(db: Db, refused: string, tx?: Tx): Promise<void> {
  const state = await readListingProgramState(db, tx);
  if (!state.paused) return;
  throw new HttpsError("failed-precondition",
    `Programmatic listings are paused (Settings → Intake)${state.reason ? `: ${state.reason}` : "."} ${refused}`,
    {reason: "listing_program_paused"});
}
