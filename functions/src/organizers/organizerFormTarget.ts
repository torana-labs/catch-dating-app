import {HttpsError} from "firebase-functions/v2/https";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";

/** Current authority for form mutations, inside the final write transaction. */
export async function authorizeFormMutation(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  actorUid: string;
  organizerId: string;
}): Promise<void> {
  await requireOrganizerManager({...params, transaction: params.tx});
  if ((await params.tx.get(params.db.collection("deletedUsers")
    .doc(params.actorUid))).exists) {
    throw new HttpsError("permission-denied",
      "Deleted accounts cannot change forms.");
  }
}

type FormTargetRead = {
  db: FirebaseFirestore.Firestore;
  tx?: FirebaseFirestore.Transaction;
  organizerId: string;
  kind: string;
  targetId: string | null;
  nowMillis: number;
};

/** Public callers receive availability, never private event details. */
export async function organizerFormEventTargetAvailable(
  params: FormTargetRead
): Promise<boolean> {
  return await formTargetFailure(params) === null;
}

/** Binding grants no booking, publication, payment or admission capability. */
export async function requireOrganizerFormEventTarget(
  params: FormTargetRead & {tx: FirebaseFirestore.Transaction}
): Promise<void> {
  const failure = await formTargetFailure(params);
  if (failure === null) return;
  throw new HttpsError(failure,
    "This form's event is unavailable. Choose an active upcoming event " +
    "or make this a reusable form.");
}

async function formTargetFailure(params: FormTargetRead):
  Promise<"invalid-argument" | "not-found" | "failed-precondition" | null> {
  if (params.kind !== "event") return null;
  if (!params.targetId) return "invalid-argument";
  const ref = params.db.collection("events").doc(params.targetId);
  const snap = params.tx ? await params.tx.get(ref) : await ref.get();
  const event = snap.data();
  if (!snap.exists || !event || event.organizerId !== params.organizerId ||
      event.organizerId !== undefined &&
        event.organizerId !== params.organizerId) return "not-found";
  const start = typeof event.startTime?.toMillis === "function" ?
    event.startTime.toMillis() : null;
  const publication = event.publicationState;
  const validPublication = publication === "published" ||
    publication === undefined && event.setupRevision === undefined ||
    publication === "private" && event.organizerId === params.organizerId &&
      Number.isSafeInteger(event.setupRevision) && event.setupRevision >= 1;
  return validateEventDocument(event) && validPublication &&
    event.status === "active" &&
    Number.isSafeInteger(start) && start !== null && start > params.nowMillis ?
    null : "failed-precondition";
}
