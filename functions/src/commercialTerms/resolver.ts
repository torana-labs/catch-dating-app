import {HttpsError} from "firebase-functions/v2/https";
import type {CommercialTermsDocument} from
  "../shared/generated/commercialTermsDocument";
import {validateCommercialTermsDocument} from
  "../shared/generated/validators/commercialTermsDocument";
import {
  commercialTermsCollection,
  mergeCommercialTerms,
  organizerCommercialTermsId,
  platformCommercialTermsId,
  snapshotCommercialTerms,
  type CommercialTerms,
  type CommercialTermsOverride,
  type CommercialTermsPurpose,
  type CommercialTermsSnapshot,
  type MoneyFlow,
} from "./terms";

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

/** Thrown when effective terms cannot be resolved; never a provider error. */
export class CommercialTermsUnavailableError extends HttpsError {
  constructor(readonly reason: "platformUnconfigured" | "invalidRecord") {
    super("failed-precondition",
      "Catch's commercial terms are not configured for this organizer yet.");
    this.name = "CommercialTermsUnavailableError";
  }
}

export interface StoredCommercialTerms {
  platform: CommercialTermsDocument | null;
  organizer: CommercialTermsDocument | null;
}

/** Reads both layers, in the caller's transaction when one is given. */
export async function readCommercialTerms(params: {
  db: Db; tx?: Tx; organizerId: string | null;
}): Promise<StoredCommercialTerms> {
  const {db, tx, organizerId} = params;
  const refs = [
    db.collection(commercialTermsCollection).doc(platformCommercialTermsId),
    organizerId === null ? null : db.collection(commercialTermsCollection)
      .doc(organizerCommercialTermsId(organizerId)),
  ];
  const [platform, organizer] = await Promise.all(refs.map(async (ref) => {
    if (!ref) return null;
    const snap = tx ? await tx.get(ref) : await ref.get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (!validateCommercialTermsDocument(data)) {
      throw new CommercialTermsUnavailableError("invalidRecord");
    }
    return data;
  }));
  if (platform && (platform.scope !== "platform" ||
      platform.organizerId !== null) ||
      organizer && (organizer.scope !== "organizer" ||
        organizer.organizerId !== organizerId)) {
    throw new CommercialTermsUnavailableError("invalidRecord");
  }
  return {platform, organizer};
}

/** Merged terms for one organizer, or null while the platform is unset. */
export function effectiveCommercialTerms(stored: StoredCommercialTerms):
  CommercialTerms | null {
  if (!stored.platform) return null;
  const merged = mergeCommercialTerms(
    stored.platform.terms as CommercialTerms,
    (stored.organizer?.terms ?? null) as CommercialTermsOverride | null);
  if (!merged) throw new CommercialTermsUnavailableError("invalidRecord");
  return merged;
}

/**
 * The single resolver every payment path uses. It returns the effective
 * terms for one purpose, frozen with the money flow the payment route chose,
 * ready to be stored on the new payment or charge.
 */
export async function resolveCommercialTerms(params: {
  db: Db; tx?: Tx; organizerId: string; purpose: CommercialTermsPurpose;
  moneyFlow: MoneyFlow; nowMillis: number;
}): Promise<CommercialTermsSnapshot> {
  const stored = await readCommercialTerms(params);
  const terms = effectiveCommercialTerms(stored);
  if (!terms || !stored.platform) {
    throw new CommercialTermsUnavailableError("platformUnconfigured");
  }
  return snapshotCommercialTerms({terms, purpose: params.purpose,
    organizerId: params.organizerId, moneyFlow: params.moneyFlow,
    platformRevision: stored.platform.revision,
    organizerRevision: stored.organizer?.revision ?? 0,
    nowMillis: params.nowMillis});
}

/**
 * For a hostCollected ticket or form payment, Catch's terms only feed the
 * later commission statement, so missing platform defaults must not stop a
 * guest paying the organizer. The payment then carries no snapshot, like a
 * payment taken before terms existed, and the statement reviews it.
 */
export async function resolveCommercialTermsIfConfigured(
  params: Parameters<typeof resolveCommercialTerms>[0]):
  Promise<CommercialTermsSnapshot | null> {
  try {
    return await resolveCommercialTerms(params);
  } catch (error) {
    if (error instanceof CommercialTermsUnavailableError) return null;
    throw error;
  }
}
