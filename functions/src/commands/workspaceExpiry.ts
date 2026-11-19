import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {organizerRouteReservationId} from
  "../admin/organizerPublishingGuards";
import {growthFactsCollection} from "../growth/organizerGrowthFacts";
import {organizerRelationshipId} from "../shared/relationshipDocuments";
import {
  TRY_IT_WORKSPACES,
  type StoredTryItWorkspace,
  type WorkspaceKeptReason,
} from "./workspace";
import {
  deleteOrganizerContacts,
  deleteTryItDrafts,
  deleteTryItForms,
  readWorkspaceEvents,
  readWorkspaceForms,
} from "./workspaceDisposal";

// An untouched try-it workspace is removed 30 days after its last command
// (owner decision, 18 Nov 2026). Each command pushes expiresAt out; this
// daily sweep reads only workspaces that are due, a bounded page per run,
// and decides each in a transaction:
//
// - kept: the organizer was published, has an event the host made (any
//   event that is not a private try-it draft the workspace recorded), has a
//   form the host made or published (has_forms), has a second team member,
//   or no longer belongs to the account. The workspace
//   stops expiring (expiresAt null) and its organizer is never touched.
// - otherwise: its try-it draft events go with their guests, and its
//   try-it draft forms (tryItFormIds) with their draft definitions, then its
//   contacts, then the private organizer with its owner membership and
//   growth facts, and its page address reservation is released
//   (workspaceDisposal.ts; owner decision on #2061, 19 Nov 2026). It was
//   never public, so no page or link goes away. The account and its host
//   profile stay. Guest data is deleted in bounded batches, over more than
//   one run when there is a lot of it ("disposing").
//
// Every step is idempotent: an expired or kept workspace is never read
// again, because its expiresAt is null.

export const WORKSPACE_EXPIRY_ACTOR = "try-it-workspace-expiry";
export const WORKSPACE_EXPIRY_BATCH = 25;

export interface WorkspaceExpiryDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}

const defaultDeps: WorkspaceExpiryDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
};

export type WorkspaceExpiryOutcome = "expired" | WorkspaceKeptReason |
  "not_due" | "skipped" | "disposing";

/** Decides due workspaces, oldest first, at most `limit` of them. */
export async function expireDueTryItWorkspaces(
  deps: WorkspaceExpiryDeps = defaultDeps,
  limit = WORKSPACE_EXPIRY_BATCH
): Promise<Partial<Record<WorkspaceExpiryOutcome, number>>> {
  const db = deps.firestore();
  const due = await db.collection(TRY_IT_WORKSPACES)
    .where("expiresAt", "<=", deps.now().toISOString())
    .orderBy("expiresAt", "asc")
    .limit(Math.max(1, Math.min(limit, WORKSPACE_EXPIRY_BATCH)))
    .get();
  const counts: Partial<Record<WorkspaceExpiryOutcome, number>> = {};
  for (const doc of due.docs) {
    const outcome = await expireTryItWorkspace(deps, doc.id);
    counts[outcome] = (counts[outcome] ?? 0) + 1;
  }
  return counts;
}

/**
 * Removes one due, untouched workspace, or marks it kept. Guest data in its
 * try-it drafts and contacts goes first, outside the final transaction,
 * because it can outgrow one; the final transaction checks everything again.
 */
export async function expireTryItWorkspace(deps: WorkspaceExpiryDeps,
  uid: string): Promise<WorkspaceExpiryOutcome> {
  const db = deps.firestore();
  const pointerRef = db.collection(TRY_IT_WORKSPACES).doc(uid);
  const disposal = await disposeGuestData(deps, db, pointerRef, uid);
  if (disposal === "disposing") return disposal;
  return db.runTransaction(async (tx) => {
    const pointerSnap = await tx.get(pointerRef);
    const pointer = pointerSnap.data() as StoredTryItWorkspace | undefined;
    if (!pointer || pointer.state !== "active") return "skipped" as const;
    const now = deps.now();
    const at = now.toISOString();
    if (typeof pointer.expiresAt !== "string" ||
        Date.parse(pointer.expiresAt) > now.getTime()) {
      return "not_due" as const;
    }
    const organizerRef = db.collection("organizers").doc(pointer.organizerId);
    const [organizerSnap, events, forms] = await Promise.all([
      tx.get(organizerRef),
      readWorkspaceEvents((query) => tx.get(query), db, pointer),
      readWorkspaceForms((query) => tx.get(query), db, pointer),
    ]);
    const organizer = organizerSnap.data();
    const keptReason = organizer ? reasonToKeep(organizer, uid,
      events.kind === "host_events") ??
      (forms.kind === "host_forms" ? "has_forms" as const : null) : null;
    if (keptReason) {
      tx.set(pointerRef, {...pointer, state: "kept", expiresAt: null,
        keptAt: at, keptReason});
      return keptReason;
    }
    // A try-it draft made since the guest data went waits for the next run.
    if (events.kind === "try_it_only" || forms.kind === "try_it_only") {
      return "disposing" as const;
    }

    const page = organizer?.publicPage as {canonicalPath?: unknown} |
      undefined;
    const canonicalPath = typeof page?.canonicalPath === "string" ?
      page.canonicalPath : null;
    const routeRef = canonicalPath ? db.collection("publicRouteReservations")
      .doc(organizerRouteReservationId(canonicalPath)) : null;
    const growthRef = db.collection(growthFactsCollection)
      .doc(pointer.organizerId);
    const teamRef = db.collection("organizerTeamMemberships")
      .doc(organizerRelationshipId(pointer.organizerId, uid));
    const [routeSnap, growthSnap, teamSnap] = await Promise.all([
      routeRef ? tx.get(routeRef) : Promise.resolve(null),
      tx.get(growthRef),
      tx.get(teamRef),
    ]);
    const route = routeSnap?.data();
    const releaseRoute = Boolean(routeRef && route?.status === "active" &&
      route.targetPath === organizerRef.path);
    const timestamp = deps.serverTimestamp();
    if (organizer) tx.delete(organizerRef);
    if (routeRef && releaseRoute) {
      tx.update(routeRef, {status: "released", updatedAt: timestamp,
        releasedAt: timestamp, releasedByUid: WORKSPACE_EXPIRY_ACTOR,
        replacementRoutePath: null});
    }
    if (growthSnap.exists) tx.delete(growthRef);
    if (teamSnap.exists) tx.delete(teamRef);
    tx.set(pointerRef, {...pointer, state: "expired", expiresAt: null,
      expiredAt: at});
    setAdminAuditLogInTransaction(tx, db,
      {uid: WORKSPACE_EXPIRY_ACTOR, roles: []}, {
        action: "expireTryItWorkspace", targetPath: organizerRef.path,
        before: {organizerId: pointer.organizerId, canonicalPath,
          lastCommandAt: pointer.lastCommandAt},
        after: {organizerDeleted: Boolean(organizer),
          routeReleased: releaseRoute, outcome: "expired"},
        note: "A try-it workspace nobody used for 30 days was removed and " +
          "its page address freed.",
        serverTimestamp: deps.serverTimestamp,
      });
    return "expired" as const;
  });
}

/**
 * Deletes a due, disposable workspace's guest data: its try-it drafts with
 * their guests, then (on a later run when guests were deleted, so the
 * audience projection has settled) its organizer-scoped contacts.
 * @return {Promise<string>} "disposing" while data remains for a later run;
 *   otherwise "ready", and the final transaction decides.
 */
async function disposeGuestData(deps: WorkspaceExpiryDeps,
  db: FirebaseFirestore.Firestore,
  pointerRef: FirebaseFirestore.DocumentReference,
  uid: string): Promise<"ready" | "disposing"> {
  const disposable = async () => {
    const pointer = (await pointerRef.get()).data() as
      StoredTryItWorkspace | undefined;
    if (!pointer || pointer.state !== "active" ||
        typeof pointer.expiresAt !== "string" ||
        Date.parse(pointer.expiresAt) > deps.now().getTime()) return null;
    const organizer = (await db.collection("organizers")
      .doc(pointer.organizerId).get()).data();
    if (organizer && reasonToKeep(organizer, uid, false)) return null;
    return pointer;
  };
  const pointer = await disposable();
  if (!pointer) return "ready";
  const events = await readWorkspaceEvents((query) => query.get(), db,
    pointer);
  if (events.kind === "host_events") return "ready";
  const forms = await readWorkspaceForms((query) => query.get(), db,
    pointer);
  // A form the host made or published keeps the workspace (has_forms).
  if (forms.kind === "host_forms") return "ready";
  if (forms.kind === "try_it_only") {
    const deleted = await deleteTryItForms(db, pointer.organizerId,
      forms.formIds);
    logger.info("Try-it draft forms removed.",
      {organizerId: pointer.organizerId, deleted});
  }
  if (events.kind === "try_it_only") {
    const pass = await deleteTryItDrafts(db, events.eventIds);
    logger.info("Try-it drafts removed with their guests.",
      {organizerId: pointer.organizerId, deleted: pass.deleted,
        incomplete: pass.incomplete});
    if (pass.incomplete || pass.guestsDeleted) return "disposing";
  }
  // Checked again: the account may have come back while drafts went.
  if (!(await disposable())) return "ready";
  const pass = await deleteOrganizerContacts(db, pointer.organizerId);
  if (pass.deleted > 0) {
    logger.info("Try-it workspace contacts removed.",
      {organizerId: pointer.organizerId, deleted: pass.deleted,
        incomplete: pass.incomplete});
  }
  return pass.incomplete ? "disposing" : "ready";
}

/**
 * Why a due workspace's organizer must stay, or null when it is still the
 * untouched private profile the try-it tools made.
 * @return {WorkspaceKeptReason|null} The reason, or null.
 */
export function reasonToKeep(organizer: Record<string, unknown>, uid: string,
  hasEvents: boolean): WorkspaceKeptReason | null {
  if (organizer.ownerUserId !== uid) return "not_owner";
  const page = organizer.publicPage as {publishStatus?: unknown} | undefined;
  if (page?.publishStatus !== "draft") return "published";
  if (Array.isArray(organizer.hostUserIds) &&
      organizer.hostUserIds.some((host) => host !== uid)) {
    return "team_member";
  }
  if (hasEvents) return "has_events";
  return null;
}

export const expireTryItWorkspaces = onSchedule({
  schedule: "41 4 * * *", timeZone: "Asia/Kolkata", timeoutSeconds: 300,
  maxInstances: 1,
}, async () => {
  const counts = await expireDueTryItWorkspaces();
  logger.info("Untouched try-it workspaces checked.", counts);
});
