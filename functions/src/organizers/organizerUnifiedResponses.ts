import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import type {ListOrganizerFormResponsesCallablePayload as Query} from
  "../shared/generated/listOrganizerFormResponsesCallablePayload";
import type {ListOrganizerFormResponsesCallableResponse as Result} from
  "../shared/generated/listOrganizerFormResponsesCallableResponse";
import type {
  OrganizerApplicationDocument, OrganizerContactDocument,
  OrganizerContactOriginDocument, OrganizerFormResponseDocument,
} from "../shared/generated/firestoreAdminTypes";
import {requireDoc} from "../shared/validation";
import {organizerContactOriginId} from "../shared/organizerContactOrigins";
import {genericFormApplicationId, organizerApplicationAccess,
  organizerApplicationContactId} from "./organizerApplicationAccess";
import {customerApplicationAccountUid, customerApplicationMatches} from
  "./organizerApplications";

type Entry = NonNullable<Result["entries"]>[number];
type Application = NonNullable<Entry["application"]>;
type Position = Pick<Entry, "entryId" | "submittedAtMillis">;
type AppRecord = {id: string; data: OrganizerApplicationDocument;
  summary: Application; sourceId: string | null};
const applicationLimit = 500;
const responseScanLimit = 500;
const scanPageSize = 100;

/** The caller owns manager authorization and answer-filter validation. */
export async function listUnifiedResponses(params: {
  db: FirebaseFirestore.Firestore;
  data: Query;
  filterHash: string;
  answerFilterOptions: Result["answerFilterOptions"];
  matches: (response: OrganizerFormResponseDocument) => Promise<boolean>;
  project: (docs: FirebaseFirestore.QueryDocumentSnapshot[]) =>
    Promise<Result["items"]>;
}): Promise<Result> {
  const {db, data} = params;
  const ascending = data.sortDirection === "asc";
  let accountUid: string | null = null;
  if (data.contactId) {
    const contact = (await db.collection("organizerContacts")
      .doc(data.contactId).get()).data() as
      OrganizerContactDocument | undefined;
    accountUid = customerApplicationAccountUid(contact, data.organizerId);
  }
  const applications = await loadApplications(db, data);
  const applicationBySource = new Map(applications.flatMap((row) =>
    row.sourceId ? [[row.sourceId, row] as const] : []));
  const fingerprint = hash([data.organizerId, params.filterHash,
    data.contactId ?? null,
    data.reviewStatus ?? null, applications.map((row) => [row.id,
      row.data.revision, row.summary.reviewStatus, row.summary.dataAccessState,
      row.summary.contactId,
      row.sourceId])]);
  const cursor = decodeCursor(data.cursor, fingerprint);
  const after = (entry: Position) => !cursor ||
    compareEntries(entry, cursor, ascending) > 0;
  const appMatches = (row: AppRecord) => !data.contactId ||
    customerApplicationMatches({...row.data,
      contactId: row.summary.contactId ?? null}, data.contactId, accountUid);
  const applicationEntries: Entry[] = applications.filter((row) =>
    !row.sourceId && appMatches(row) &&
    matchesApplication(row.summary, data)).map((row) => ({
    entryId: `application:${row.id}`,
    submittedAtMillis: row.summary.submittedAtMillis,
    response: null, application: row.summary,
  })).filter(after);
  const matches: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  let scanned = 0;
  let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let responseExhausted = false;
  // One extra matching response proves the merged page has a successor.
  while (matches.length <= data.limit && scanned < responseScanLimit) {
    let query: FirebaseFirestore.Query = db
      .collection("organizerFormResponses")
      .where("organizerId", "==", data.organizerId)
      .orderBy("submittedAt", ascending ? "asc" : "desc")
      .orderBy(admin.firestore.FieldPath.documentId(),
        ascending ? "asc" : "desc").limit(scanPageSize);
    if (data.formId) query = query.where("formId", "==", data.formId);
    if (last) query = query.startAfter(last);
    else if (cursor) {
      // A unified cursor can name an application. Include equal timestamps;
      // the global entry id breaks ties without fabricating a response id.
      const timestamp = admin.firestore.Timestamp
        .fromMillis(cursor.submittedAtMillis);
      query = cursor.entryId.startsWith("response:") ?
        query.startAfter(timestamp, cursor.entryId.slice("response:".length)) :
        ascending ? query.startAt(timestamp) : query.startAfter(timestamp, "");
    }
    const page = await query.get();
    if (page.empty) {
      responseExhausted = true; break;
    }
    for (const doc of page.docs) {
      scanned++;
      last = doc;
      const response = requireDoc<OrganizerFormResponseDocument>(doc,
        "OrganizerFormResponseDocument");
      if (!after(responsePosition(doc.id, response))) continue;
      const application = applicationBySource.get(doc.id);
      // The ordered scan can observe a withdrawal committed after hydration.
      // Its newer source state must win over the cached access summary.
      if (application && response.status === "withdrawn") {
        application.summary = {...application.summary,
          reviewStatus: "withdrawn",
          dataAccessState: "revokedParticipantGrant",
          sourceResponseId: null,
          applicantDisplayName: "Withdrawn applicant"};
      }
      if (data.reviewStatus &&
          application?.summary.reviewStatus !== data.reviewStatus) continue;
      if (data.contactId) {
        const origin = (await db.collection("organizerContactOrigins")
          .doc(organizerContactOriginId({organizerId: data.organizerId,
            sourceKind: "hostForm", sourceEntityKind: "hostFormResponse",
            sourceEntityId: doc.id})).get()).data() as
            OrganizerContactOriginDocument | undefined;
        const originMatches = origin?.organizerId === data.organizerId &&
          origin.currentContactId === data.contactId;
        if (!originMatches && !(application && appMatches(application))) {
          continue;
        }
      }
      if (await params.matches(response)) matches.push(doc);
      if (matches.length > data.limit || scanned === responseScanLimit) break;
    }
    if (matches.length > data.limit || scanned === responseScanLimit) break;
    if (page.size < scanPageSize) {
      responseExhausted = true; break;
    }
  }
  const cutoff = last ? responsePosition(last.id,
    last.data() as OrganizerFormResponseDocument) : null;
  // An application beyond a response scan boundary must wait: unseen responses
  // may sort before it. A short/empty page advances the scan cursor honestly.
  const safeApplications = responseExhausted ? applicationEntries :
    applicationEntries.filter((entry) => cutoff &&
      compareEntries(entry, cutoff, ascending) <= 0);
  const projected = await params.project(matches);
  const responseEntries: Entry[] = projected.map((response) => ({
    entryId: `response:${response.responseId}`,
    submittedAtMillis: response.submittedAtMillis,
    response,
    application: applicationBySource.get(response.responseId)?.summary ?? null,
  }));
  const entries = [...safeApplications, ...responseEntries]
    .sort((a, b) => compareEntries(a, b, ascending));
  const page = entries.slice(0, data.limit);
  const moreCandidates = entries.length > page.length;
  const nextPosition = moreCandidates ? page.at(-1) :
    !responseExhausted ? cutoff : null;
  return {
    organizerId: data.organizerId,
    items: page.flatMap((entry) => entry.response ? [entry.response] : []),
    entries: page,
    answerFilterOptions: params.answerFilterOptions,
    nextCursor: nextPosition ? encodeCursor(nextPosition, fingerprint) : null,
  };
}

async function loadApplications(db: FirebaseFirestore.Firestore,
  data: Query): Promise<AppRecord[]> {
  const organizerId = data.organizerId;
  let query: FirebaseFirestore.Query = db.collection("organizerApplications")
    .where("organizerId", "==", organizerId);
  if (data.formId) query = query.where("formId", "==", data.formId);
  if (data.versionId) {
    query = query.where("formVersionId", "==", data.versionId);
  }
  const snapshot = await query.orderBy(admin.firestore.FieldPath.documentId())
    .limit(applicationLimit + 1).get();
  if (snapshot.size > applicationLimit) {
    throw new HttpsError("resource-exhausted",
      "This selected application scope is too large to summarize safely. " +
      "Narrow the form or version filters.");
  }
  // Bound before hydration; share immutable versions and read each source,
  // grant and canonical origin once per request. No cross-request cache.
  const refs = new Map<string, FirebaseFirestore.DocumentReference>();
  const add = (collection: string, id: string) => {
    const ref = db.collection(collection).doc(id);
    refs.set(ref.path, ref);
  };
  for (const doc of snapshot.docs) {
    const app = requireDoc<OrganizerApplicationDocument>(doc,
      "OrganizerApplicationDocument");
    const generic = app.source.kind === "native" &&
      doc.id === genericFormApplicationId(app.latestResponseId);
    if (generic) {
      add("organizerFormResponses", app.latestResponseId);
      add("organizerFormVersions", app.formVersionId);
    } else if (app.source.kind !== "native") {
      add("organizerApplicationResponses", app.latestResponseId);
    }
    add("organizerContactOrigins", organizerContactOriginId({organizerId,
      sourceKind: "hostForm", sourceEntityKind: generic ?
        "hostFormResponse" : "hostApplicationResponse",
      sourceEntityId: app.latestResponseId}));
  }
  const snapshots = new Map<string, FirebaseFirestore.DocumentSnapshot>();
  const pending = [...refs.values()];
  for (let offset = 0; offset < pending.length; offset += scanPageSize) {
    const docs = await db.getAll(
      ...pending.slice(offset, offset + scanPageSize));
    for (const doc of docs) snapshots.set(doc.ref.path, doc);
  }
  const read = async (collection: string, id: string) => {
    const snapshot = snapshots.get(`${collection}/${id}`);
    if (!snapshot) throw new Error("Application hydration is incomplete.");
    return snapshot;
  };
  return Promise.all(snapshot.docs.map(async (doc) => {
    const application = requireDoc<OrganizerApplicationDocument>(doc,
      "OrganizerApplicationDocument");
    const access = await organizerApplicationAccess({db,
      applicationId: doc.id, application, read});
    // A withdrawn generic response still owns its single row even though its
    // application access projection intentionally no longer exposes the link.
    let sourceId = access.sourceResponseId;
    let reviewStatus = application.reviewStatus;
    if (!sourceId && application.source.kind === "native" &&
        doc.id === genericFormApplicationId(application.latestResponseId)) {
      const source = (await read("organizerFormResponses",
        application.latestResponseId)).data() as
          OrganizerFormResponseDocument | undefined;
      if (source?.organizerId === organizerId &&
          source.formId === application.formId &&
          source.versionId === application.formVersionId) {
        sourceId = application.latestResponseId;
        if (source.status === "withdrawn") reviewStatus = "withdrawn";
      }
    }
    return {id: doc.id, data: application, sourceId, summary: {
      applicationId: doc.id,
      contactId: await organizerApplicationContactId({db,
        applicationId: doc.id, application, read}),
      sourceResponseId: access.sourceResponseId,
      formId: application.formId,
      formVersionId: application.formVersionId,
      targetKind: application.targetKind,
      targetId: application.targetId,
      applicantDisplayName: access.accessState === "revokedParticipantGrant" ?
        "Withdrawn applicant" : application.applicantDisplayName,
      reviewStatus,
      dataAccessState: access.accessState,
      sourceKind: application.source.kind,
      providerId: application.source.providerId,
      submittedAtMillis: application.submittedAt.toMillis(),
      revision: application.revision,
    }};
  }));
}

function matchesApplication(application: Application, query: Query): boolean {
  if (query.formId && application.formId !== query.formId) return false;
  if (query.versionId && application.formVersionId !== query.versionId) {
    return false;
  }
  if (query.reviewStatus && application.reviewStatus !== query.reviewStatus) {
    return false;
  }
  // These filters describe generic form evidence; imported/legacy rows do not
  // manufacture answers, a respondent identity kind, or a share-link source.
  if (query.identityKinds.length || query.sourceLinkId ||
      query.answerFilters?.length) return false;
  const status = application.reviewStatus === "withdrawn" ?
    "withdrawn" : "submitted";
  if (query.statuses.length && !query.statuses.includes(status)) return false;
  if (query.fromMillis !== null &&
      application.submittedAtMillis < query.fromMillis) return false;
  if (query.toMillis !== null &&
      application.submittedAtMillis > query.toMillis) return false;
  const search = query.query?.trim().toLowerCase();
  return !search || application.applicantDisplayName.toLowerCase()
    .includes(search);
}

function responsePosition(id: string,
  response: OrganizerFormResponseDocument): Position {
  return {entryId: `response:${id}`,
    submittedAtMillis: response.submittedAt.toMillis()};
}
function compareEntries(a: Position, b: Position, ascending: boolean): number {
  const result = a.submittedAtMillis - b.submittedAtMillis ||
    (a.entryId < b.entryId ? -1 : a.entryId > b.entryId ? 1 : 0);
  return ascending ? result : -result;
}
function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function encodeCursor(position: Position, fingerprint: string): string {
  return Buffer.from(JSON.stringify({version: 2, fingerprint, ...position}))
    .toString("base64url");
}
function decodeCursor(value: string | null,
  fingerprint: string): Position | null {
  if (!value) return null;
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString());
    if (cursor.version !== 2 || cursor.fingerprint !== fingerprint ||
        !Number.isSafeInteger(cursor.submittedAtMillis) ||
        cursor.submittedAtMillis < 0 || typeof cursor.entryId !== "string" ||
        !/^(application|response):.+/.test(cursor.entryId)) throw Error();
    return cursor;
  } catch {
    throw new HttpsError("invalid-argument",
      "The response inbox changed. Refresh to continue.");
  }
}
