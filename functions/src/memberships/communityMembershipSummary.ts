import {logger} from "firebase-functions/v2";
import {HttpsError} from "firebase-functions/v2/https";
import type {OrganizerApplicationDocument} from
  "../shared/generated/firestoreAdminTypes";
import {readCommunityMembership} from "./communityMembershipAuthority";

/** Where one applicant stands as a community member of one organizer. */
export interface ApplicantCommunityMembership {
  /** The applicant account a decision names. */
  uid: string;
  state: "none" | "active" | "revoked";
  /** The revision a decision must expect; 0 before any decision. */
  revision: number;
}

/**
 * Reads the membership a manager can decide from this application: only a
 * native, organizer-wide application from a signed-in applicant can carry
 * one. Null otherwise, and when the stored membership fails its authority
 * checks, so a broken edge hides the decision instead of breaking review.
 */
export async function readApplicantCommunityMembership(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  application: Pick<
    OrganizerApplicationDocument,
    "targetKind" | "targetId" | "linkedUid" | "source"
  >;
  nowMillis?: number;
}): Promise<ApplicantCommunityMembership | null> {
  const {db, organizerId, application} = params;
  const uid = application.linkedUid;
  if (
    application.targetKind !== "organizer" ||
    application.targetId !== null ||
    application.source.kind !== "native" ||
    !uid
  ) {
    return null;
  }
  try {
    // The edge and its decision are read together, as deciding reads them.
    const current = await db.runTransaction(
      (tx) => readCommunityMembership({
        db,
        tx,
        organizerId,
        uid,
        nowMillis: params.nowMillis,
      }),
      {readOnly: true}
    );
    return {
      uid,
      state: current?.state ?? "none",
      revision: current?.revision ?? 0,
    };
  } catch (error) {
    if (error instanceof HttpsError && error.code === "failed-precondition") {
      logger.warn("community membership authority unavailable", {
        organizerId,
      });
      return null;
    }
    throw error;
  }
}
