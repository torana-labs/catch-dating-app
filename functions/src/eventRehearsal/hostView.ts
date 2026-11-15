import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventRehearsalDocument, EventRehearsalHostViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {EventRehearsalBootstrapCallableResponse} from
  "../shared/generated/eventRehearsalBootstrapCallableResponse";
import {requireDoc} from "../shared/validation";

type Firestore = FirebaseFirestore.Firestore;
type Bootstrap = EventRehearsalBootstrapCallableResponse;

/** The rehearsal screen's listener document, one per session. */
export const rehearsalHostViews = "eventRehearsalHostViews";

/** Who the published view is computed for: the host who owns the session. */
export interface RehearsalViewer {
  uid: string;
  canUseInternalFaults: boolean;
}

export type RehearsalProjector = (
  session: EventRehearsalDocument,
  viewer: RehearsalViewer,
) => Promise<Bootstrap>;

const maxAttempts = 4;

/**
 * Rewrites `eventRehearsalHostViews/{sessionId}` from the current session.
 *
 * Every command and guest action that changes a rehearsal writes its session
 * document, then calls this before it returns, so the owner's listener holds
 * the committed state by the time the command's caller hears back. The view
 * is computed for the session owner. Every session write moves its
 * (setupRevision, runtimeRevision, updatedAt) forward, and the write is
 * fenced on that version in the view document alone, so a slower concurrent
 * publish never replaces a newer view and never contends with commands.
 *
 * @param {Firestore} db Firestore.
 * @param {string} sessionId Rehearsal session.
 * @param {RehearsalProjector} project Builds the owner's projection.
 * @param {boolean} ownerCanUseInternalFaults The owner's QA capability, when
 *   the caller is the owner; otherwise the published value is kept.
 * @return {Promise<Bootstrap | null>} The owner's projection, or null when
 *   the session is gone, expired or its owner no longer manages it.
 */
export async function publishRehearsalHostView(
  db: Firestore,
  sessionId: string,
  project: RehearsalProjector,
  ownerCanUseInternalFaults?: boolean,
): Promise<Bootstrap | null> {
  const sessionRef = db.collection("eventRehearsals").doc(sessionId);
  const viewRef = db.collection(rehearsalHostViews).doc(sessionId);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const [sessionSnap, viewSnap] = await Promise.all([
      sessionRef.get(), viewRef.get(),
    ]);
    if (!sessionSnap.exists) {
      await removeHostView(db, viewRef);
      return null;
    }
    const session = requireDoc<EventRehearsalDocument>(sessionSnap,
      "EventRehearsalDocument");
    if (session.expiresAt.toMillis() <= Date.now()) {
      await removeHostView(db, viewRef);
      return null;
    }
    const previous = viewSnap.exists ?
      viewSnap.data() as EventRehearsalHostViewDocument : undefined;
    const viewer = {
      uid: session.ownerUid,
      canUseInternalFaults: ownerCanUseInternalFaults ??
        previous?.view.canUseInternalFaults ?? false,
    };
    let view: Bootstrap;
    try {
      view = await project(session, viewer);
    } catch (error) {
      if (error instanceof HttpsError && error.code === "permission-denied") {
        // The owner lost Host authority; rules would deny the read anyway.
        await removeHostView(db, viewRef);
        return null;
      }
      // The session moved while it was being read; read it again.
      if (error instanceof HttpsError && error.code === "aborted") continue;
      throw error;
    }
    const next = hostViewDocument(sessionId, session, view);
    await db.runTransaction(async (tx) => {
      const current = await tx.get(viewRef);
      if (current.exists && compareSourceVersion(
        current.data() as EventRehearsalHostViewDocument, next) > 0) return;
      tx.set(viewRef, next);
    });
    return view;
  }
  throw new HttpsError("aborted",
    "The rehearsal kept changing. Try again.");
}

/**
 * Orders two views by the session version they were computed from.
 * @param {EventRehearsalHostViewDocument} a One view.
 * @param {EventRehearsalHostViewDocument} b The other view.
 * @return {number} Positive when a is newer, negative when b is.
 */
export function compareSourceVersion(
  a: Pick<EventRehearsalHostViewDocument,
    "setupRevision" | "runtimeRevision" | "sourceUpdatedAt">,
  b: Pick<EventRehearsalHostViewDocument,
    "setupRevision" | "runtimeRevision" | "sourceUpdatedAt">,
): number {
  return (a.setupRevision - b.setupRevision) ||
    (a.runtimeRevision - b.runtimeRevision) ||
    (a.sourceUpdatedAt.toMillis() - b.sourceUpdatedAt.toMillis());
}

async function removeHostView(db: Firestore,
  viewRef: FirebaseFirestore.DocumentReference): Promise<void> {
  await db.runTransaction(async (tx) => {
    tx.delete(viewRef);
  });
}

/**
 * The stored document: the owner's projection plus the fields rules check.
 * @param {string} sessionId Rehearsal session.
 * @param {EventRehearsalDocument} session The version the view came from.
 * @param {Bootstrap} view The owner's projection.
 * @return {EventRehearsalHostViewDocument} The document to write.
 */
export function hostViewDocument(
  sessionId: string,
  session: EventRehearsalDocument,
  view: Bootstrap,
): EventRehearsalHostViewDocument {
  return {
    sessionId,
    organizerId: session.organizerId,
    ownerUid: session.ownerUid,
    setupRevision: session.setupRevision,
    runtimeRevision: session.runtimeRevision,
    sourceUpdatedAt: session.updatedAt,
    // Firestore rejects undefined; the projection omits absent fields.
    view: JSON.parse(JSON.stringify(view)) as Bootstrap,
    expiresAt: session.expiresAt,
    updatedAt: admin.firestore.Timestamp.now(),
  };
}
