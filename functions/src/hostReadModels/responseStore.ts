import {FieldPath} from "firebase-admin/firestore";
import {isDeepStrictEqual} from "node:util";
import {genericFormApplicationId, organizerApplicationAccess,
  organizerApplicationContactId} from
  "../organizers/organizerApplicationAccess";
import type {HostResponseSummaryDocument, OrganizerApplicationDocument,
  OrganizerFormResponseDocument, OrganizerFormDocument,
  OrganizerFormVersionDocument} from "../shared/generated/firestoreAdminTypes";
import {responseSummaryId} from "./responseIds";
import {emptyDirectory} from "./contactStore";

type Kind = "response" | "application";
type Entry = HostResponseSummaryDocument["row"];
type Offer = NonNullable<HostResponseSummaryDocument["offer"]>;

/**
 * The latest non-draft event offer made from [applicationId] by this
 * organizer. Offers are one aggregate per organizer/event/contact that
 * remembers the application it came from; a draft is not yet an offer.
 */
async function offerFor(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, organizerId: string,
  applicationId: string): Promise<Offer | null> {
  // applicationId equality alone uses the automatic single-field index.
  const offers = await tx.get(db.collection("organizerEventOffers")
    .where("applicationId", "==", applicationId).limit(20));
  let latest: {offer: Offer; at: number} | null = null;
  for (const doc of offers.docs) {
    const data = doc.data();
    if (data.organizerId !== organizerId || typeof data.eventId !== "string" ||
        !["offered", "withdrawn", "expired"].includes(data.status)) continue;
    const at = Number(data.updatedAtMillis ?? 0);
    if (latest && latest.at >= at) continue;
    latest = {at, offer: {status: data.status, eventId: data.eventId,
      offeredAtMillis: Number.isSafeInteger(data.offeredAtMillis) &&
        data.offeredAtMillis > 0 ? data.offeredAtMillis : null}};
  }
  return latest?.offer ?? null;
}

async function applicationRow(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, id: string,
  application: OrganizerApplicationDocument): Promise<Entry["application"]> {
  const access = await organizerApplicationAccess({db, transaction: tx,
    applicationId: id, application});
  const revoked = access.accessState === "revokedParticipantGrant";
  return {applicationId: id,
    contactId: revoked ? null : await organizerApplicationContactId({db,
      applicationId: id, application,
      read: (collection, key) => tx.get(db.collection(collection).doc(key))}),
    sourceResponseId: access.sourceResponseId,
    formId: application.formId, formVersionId: application.formVersionId,
    targetKind: application.targetKind, targetId: application.targetId,
    applicantDisplayName: revoked ? "Withdrawn applicant" :
      application.applicantDisplayName,
    reviewStatus: revoked ? "withdrawn" : application.reviewStatus,
    dataAccessState: access.accessState, sourceKind: application.source.kind,
    providerId: application.source.providerId,
    submittedAtMillis: application.submittedAt.toMillis(),
    revision: application.revision};
}

async function project(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, kind: Kind, id: string)
  : Promise<HostResponseSummaryDocument | null> {
  const source = await tx.get(db.collection(kind === "response" ?
    "organizerFormResponses" : "organizerApplications").doc(id));
  if (!source.exists) return null;
  const organizerId = source.get("organizerId");
  if (typeof organizerId !== "string" ||
      !(await tx.get(db.collection("organizers").doc(organizerId))).exists) {
    return null;
  }
  let row: Entry;
  if (kind === "application") {
    const app = source.data() as OrganizerApplicationDocument;
    // Converted generic submissions own their response entry, including after
    // withdrawal. They must never appear a second time as an application.
    if (app.source.kind === "native" &&
        id === genericFormApplicationId(app.latestResponseId)) return null;
    row = {entryId: `application:${id}`,
      submittedAtMillis: app.submittedAt.toMillis(), response: null,
      application: await applicationRow(db, tx, id, app)};
  } else {
    const response = source.data() as OrganizerFormResponseDocument;
    const [formSnap, versionSnap, appSnap] = await tx.getAll(
      db.collection("organizerForms").doc(response.formId),
      db.collection("organizerFormVersions").doc(response.versionId),
      db.collection("organizerApplications")
        .doc(genericFormApplicationId(id)));
    const form = formSnap.data() as OrganizerFormDocument | undefined;
    const version = versionSnap.data() as
      OrganizerFormVersionDocument | undefined;
    if (!form || !version || form.organizerId !== organizerId ||
        version.organizerId !== organizerId ||
        version.formId !== response.formId) return null;
    const withdrawn = response.status === "withdrawn";
    const link = response.sourceLinkId ? await tx.get(db
      .collection("organizerFormShareLinks").doc(response.sourceLinkId)) : null;
    const conversionKinds: NonNullable<Entry["response"]>["conversionKinds"] =
      [];
    for (const conversion of ["crmContact", "application",
      "eventAttendeeProposal", "followUp"] as const) {
      const receipt = await tx.get(db
        .collection("organizerFormConversionReceipts")
        .where("organizerId", "==", organizerId)
        .where("responseId", "==", id).where("kind", "==", conversion)
        .where("status", "==", "completed").limit(1));
      if (!receipt.empty) conversionKinds.push(conversion);
    }
    const app = appSnap.data() as OrganizerApplicationDocument | undefined;
    const application = app?.organizerId === organizerId &&
      app.formId === response.formId &&
      app.formVersionId === response.versionId && app.latestResponseId === id ?
      await applicationRow(db, tx, appSnap.id, app) : null;
    row = {entryId: `response:${id}`,
      submittedAtMillis: response.submittedAt.toMillis(), application,
      response: {responseId: id, formId: response.formId,
        formTitle: form.title, versionId: response.versionId,
        version: version.version, status: response.status,
        identityKind: response.identityKind,
        identity: withdrawn ? {displayName: null, email: null, phoneE164: null,
          searchName: null, origin: "anonymous"} : {
          displayName: response.identity.displayName,
          email: response.identity.email,
          phoneE164: response.identity.phoneE164,
          searchName: response.identity.searchName,
          origin: response.identity.origin},
        sourceLinkId: withdrawn ? null : response.sourceLinkId,
        sourceLabel: !withdrawn && link?.get("organizerId") === organizerId &&
          link.get("formId") === response.formId ? link.get("label") : null,
        submittedAtMillis: response.submittedAt.toMillis(),
        withdrawnAtMillis: response.withdrawnAt?.toMillis() ?? null,
        // Raw answers, including list-presentation answers, remain lazy detail.
        highlights: [], conversionKinds}};
  }
  // Query copies for the Responses filters and counts; present only when
  // there is something to filter on, so older views read as none.
  const application = row.application;
  const offer = application ?
    await offerFor(db, tx, organizerId, application.applicationId) : null;
  return {organizerId, summaryId: responseSummaryId(kind, id), kind,
    formId: row.response?.formId ?? row.application!.formId,
    submittedAtMillis: row.submittedAtMillis, row, version: 1,
    ...(application ? {reviewStatus: application.reviewStatus} : {}),
    ...(offer ? {offer} : {})};
}

/** All privacy authority is reread inside the view transaction. */
export async function reconcileResponseSummary(db: FirebaseFirestore.Firestore,
  kind: Kind, id: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection("hostResponseSummaries")
      .doc(responseSummaryId(kind, id));
    const [old, view] = await Promise.all([tx.get(ref),
      project(db, tx, kind, id)]);
    if (isDeepStrictEqual(old.data() ?? null, view)) return;
    if (view) tx.set(ref, view);
    else if (old.exists) tx.delete(ref);
  });
}

export async function reconcileApplicationSummary(
  db: FirebaseFirestore.Firestore, id: string): Promise<void> {
  const snap = await db.collection("organizerApplications").doc(id).get();
  const app = snap.data() as OrganizerApplicationDocument | undefined;
  await reconcileResponseSummary(db, "application", id);
  if (app?.source.kind === "native" &&
      id === genericFormApplicationId(app.latestResponseId)) {
    await reconcileResponseSummary(db, "response", app.latestResponseId);
  }
}

/** Source fan-out runs on metadata changes, never on list reads. */
export async function refreshFormResponseSummaries(
  db: FirebaseFirestore.Firestore, field: "formId" | "sourceLinkId",
  id: string): Promise<void> {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  do {
    let query = db.collection("organizerFormResponses").where(field, "==", id)
      .orderBy(FieldPath.documentId()).limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      await reconcileResponseSummary(db, "response", doc.id);
    }
    cursor = page.size === 100 ? page.docs.at(-1) : undefined;
  } while (cursor);
}

export async function backfillResponseSummaries(db: FirebaseFirestore.Firestore,
  organizerId: string, apply: boolean): Promise<number> {
  let count = 0;
  for (const kind of ["response", "application"] as const) {
    const collection = kind === "response" ? "organizerFormResponses" :
      "organizerApplications";
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    do {
      let query = db.collection(collection)
        .where("organizerId", "==", organizerId)
        .orderBy(FieldPath.documentId()).limit(100);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      count += page.size;
      for (const doc of page.docs) {
        if (apply) await reconcileResponseSummary(db, kind, doc.id);
      }
      cursor = page.size === 100 ? page.docs.at(-1) : undefined;
    } while (cursor);
  }
  if (apply) {
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    do {
      let query = db.collection("hostResponseSummaries")
        .where("organizerId", "==", organizerId)
        .orderBy(FieldPath.documentId()).limit(100);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      for (const doc of page.docs) {
        const view = doc.data() as HostResponseSummaryDocument;
        await reconcileResponseSummary(db, view.kind,
          view.row.entryId.slice(view.kind.length + 1));
      }
      cursor = page.size === 100 ? page.docs.at(-1) : undefined;
    } while (cursor);
  }
  return count;
}

/**
 * Recomputes the summaries whose application an organizer's event offers
 * point at: the backfill for the derived `offer` on existing views.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} organizerId Organizer to backfill.
 * @param {boolean} apply Write views; otherwise only count.
 * @return {Promise<object>} Offers scanned and applications reconciled.
 */
export async function backfillResponseOfferSummaries(
  db: FirebaseFirestore.Firestore, organizerId: string, apply: boolean,
): Promise<{scanned: number; applications: number}> {
  const applications = new Set<string>();
  let scanned = 0;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  do {
    let query = db.collection("organizerEventOffers")
      .where("organizerId", "==", organizerId)
      .orderBy(FieldPath.documentId()).limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    scanned += page.size;
    for (const doc of page.docs) {
      const applicationId = doc.get("applicationId");
      if (typeof applicationId === "string") applications.add(applicationId);
    }
    cursor = page.size === 100 ? page.docs.at(-1) : undefined;
  } while (cursor);
  if (apply) {
    for (const id of applications) await reconcileApplicationSummary(db, id);
  }
  return {scanned, applications: applications.size};
}

export async function activateResponseSummaries(db: FirebaseFirestore.Firestore,
  organizerId: string): Promise<number> {
  return db.runTransaction(async (tx) => {
    const query = (collection: string) => db.collection(collection)
      .where("organizerId", "==", organizerId);
    const [responses, applications, views, directory] = await Promise.all([
      tx.get(query("organizerFormResponses")),
      tx.get(query("organizerApplications")),
      tx.get(query("hostResponseSummaries")),
      tx.get(db.collection("hostDirectorySummaries").doc(organizerId)),
    ]);
    if (!(await tx.get(db.collection("organizers").doc(organizerId))).exists) {
      throw new Error("Organizer does not exist.");
    }
    const expected = new Map<string, HostResponseSummaryDocument>();
    for (const [kind, sources] of [["response", responses],
      ["application", applications]] as const) {
      for (const doc of sources.docs) {
        const view = await project(db, tx, kind, doc.id);
        if (view) expected.set(view.summaryId, view);
      }
    }
    if (views.size !== expected.size || views.docs.some((doc) =>
      !isDeepStrictEqual(doc.data(), expected.get(doc.id)))) {
      throw new Error("Response summary parity failed; rerun backfill.");
    }
    tx.set(db.collection("hostDirectorySummaries").doc(organizerId),
      {...(directory.data() ?? emptyDirectory(organizerId)),
        responseSummaryVersion: 1});
    return expected.size;
  });
}
