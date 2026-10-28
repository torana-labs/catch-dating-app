import assert from "node:assert/strict";
import {Timestamp} from "firebase-admin/firestore";
import {createHash} from "node:crypto";

import {deriveEventSeatPolicy} from
  "../events/seatAuthority/firestoreAdapter";

import {seatIdentityAliasId, seatIdentityValueHash} from
  "../events/seatIdentityAuthority";
import {organizerContactOriginId} from
  "../shared/organizerContactOrigins";
import {eventOfferId} from
  "../organizerEventOffers/eventOfferDomain";
import {formConversionReceiptId} from
  "../organizers/organizerFormAdmissionIdentity";
import {genericFormApplicationId} from
  "../organizers/organizerApplicationAccess";

import {commitOrganizerFormAdmission} from "./admissionService";

export type Row = Record<string, unknown>;
export const org = "org1";
export const eventId = "event1";
export const responseId = "response1";
export const contactId = "contact1";
export const requestId = "request1";
export const actorUid = "manager1";
export const offerId = eventOfferId({organizerId: org, eventId, contactId});
export const ts = (millis: number) => Timestamp.fromMillis(millis);
export const hash = (...parts: string[]) => createHash("sha256")
  .update(parts.join("\u001f")).digest("hex");

export class Store {
  rows = new Map<string, Row>();
  failNextCommit = false;
  updateTimes = new Map<string, Timestamp>();
  timeline: string[] = [];
  writes: string[] = [];
  collection(name: string) {
    const query = (filters: Array<[string, string, unknown]>,
      order?: [string, string]) => ({
      collection: name, filters,
      where: (field: string, op: string, value: unknown) =>
        query([...filters, [field, op, value]], order),
      orderBy: (field: string, direction: string) => query(filters, [field,
        direction]),
      limit: (count: number) => ({collection: name, filters, count, order}),
    });
    return {doc: (id: string) => ({path: `${name}/${id}`,
      collection: (child: string) =>
        this.collection(`${name}/${id}/${child}`)}),
    where: (field: string, op: string, value: unknown) =>
      query([[field, op, value]])};
  }
  runTransaction<T>(callback: (tx: FirebaseFirestore.Transaction) =>
    Promise<T>): Promise<T> {
    const pending: Array<() => void> = [];
    let startedWrite = false;
    const stage = (kind: "create" | "set" | "update",
      ref: {path: string}, value: Row) => {
      startedWrite = true;
      this.timeline.push(`write:${ref.path}`);
      pending.push(() => {
        if (kind === "create") assert.equal(this.rows.has(ref.path), false);
        if (kind === "update") assert.equal(this.rows.has(ref.path), true);
        this.rows.set(ref.path, kind === "update" ?
          {...this.rows.get(ref.path), ...value} : value);
        this.writes.push(ref.path);
      });
    };
    const tx = {
      get: async (ref: {path?: string; collection?: string;
        filters?: Array<[string, string, unknown]>; count?: number;
          order?: [string, string]}) => {
        assert.equal(startedWrite, false, "no Firestore read after write");
        if (ref.collection && ref.filters) {
          this.timeline.push(`query:${ref.collection}`);
          const docs = [...this.rows].filter(([path, row]) =>
            path.startsWith(`${ref.collection}/`) &&
            ref.filters!.every(([field, op, value]) => op === "in" ?
              (value as unknown[]).includes(row[field]) : row[field] === value))
            .sort(([, a], [, b]) => {
              if (!ref.order) return 0;
              const [field, direction] = ref.order;
              const value = (row: Row) => row[field] instanceof Timestamp ?
                (row[field] as Timestamp).toMillis() : Number(row[field] ?? 0);
              return (value(a) - value(b)) * (direction === "desc" ? -1 : 1);
            })
            .slice(0, ref.count).map(([path, row]) => ({
              id: path.split("/").at(-1), data: () => row}));
          return {docs, size: docs.length, empty: docs.length === 0};
        }
        assert.ok(ref.path);
        this.timeline.push(`read:${ref.path}`);
        const value = this.rows.get(ref.path);
        return {exists: value !== undefined, data: () => value,
          updateTime: this.updateTimes.get(ref.path)};
      },
      create: (ref: {path: string}, value: Row) =>
        stage("create", ref, value),
      set: (ref: {path: string}, value: Row) => stage("set", ref, value),
      update: (ref: {path: string}, value: Row) =>
        stage("update", ref, value),
    } as unknown as FirebaseFirestore.Transaction;
    return callback(tx).then((result) => {
      if (this.failNextCommit) {
        this.failNextCommit = false;
        throw new Error("Interrupted commit");
      }
      pending.forEach((apply) => apply());
      return result;
    });
  }
  db() {
    return this as unknown as FirebaseFirestore.Firestore;
  }
  put(path: string, value: Row) {
    this.rows.set(path, value);
  }
  get(path: string): Row | undefined {
    return this.rows.get(path);
  }
  alias(kind: "uid" | "phone" | "attendee" | "external" |
    "contactOrigin" | "contact", value: string, canonicalKey: string) {
    this.put(`eventSeatIdentityAliases/${seatIdentityAliasId(
      eventId, kind, value)}`, {eventId, organizerId: org, kind,
      valueHash: seatIdentityValueHash(kind, value), canonicalKey,
      identityRevision: 1, migrationRevision: 1, state: "ready"});
  }
}

export function fixture() {
  const store = new Store();
  const event = {clubId: org, organizerId: org, status: "active",
    startTime: ts(5_000_000),
    capacityLimit: 2, bookedCount: 0,
    eventPolicy: {version: 2, admission: {capacityLimit: 2}}};
  const policy = deriveEventSeatPolicy(event);
  store.put(`organizers/${org}`, {ownerUserId: actorUid,
    hostUserId: actorUid, hostUserIds: [actorUid], hostProfiles: [],
    archived: false, status: "active"});
  store.put(`users/${actorUid}`, {deleted: false, deletedAt: null});
  store.put(`events/${eventId}`, event);
  store.updateTimes.set(`events/${eventId}`,
    new Timestamp(1_800_000_000, 123_456_000));
  store.put(`eventSeatMigrationFences/${eventId}`,
    {eventId, state: "ready", migrationRevision: 1});
  store.put(`eventSeatLedgers/${eventId}`, {eventId, capacity: 2,
    occupied: 0, revision: 3, capacityRevision: 1,
    policyVersion: policy.policyVersion, policyHash: policy.policyHash,
    migrationRevision: 1, state: "ready"});
  store.put(`organizerFormResponses/${responseId}`, {
    organizerId: org, formId: "form1", versionId: "version1",
    publicFormId: "publicformabcdefghijklmnop", draftId: "draft1",
    status: "submitted", withdrawnAt: null, identityKind: "anonymous",
    respondentUid: null, withdrawalTokenHash: null, answers: {},
    answerSnapshots: [], consentVersion: "v1", sourceLinkId: null,
    completionMillis: 1000, submittedAt: ts(1100),
    identity: {displayName: "Ada Guest", email: null, phoneE164: null,
      searchName: "ada guest", origin: "anonymous"}});
  store.put("organizerForms/form1", {organizerId: org,
    purpose: "registration", status: "published"});
  store.put("organizerFormVersions/version1", {organizerId: org,
    formId: "form1", version: 1, sourceDraftRevision: 1,
    createdByUid: actorUid, createdAt: ts(1000), publishedAt: ts(1050),
    definition: {title: "Registration", description: null,
      purpose: "registration", defaultTargetKind: "event",
      defaultTargetId: eventId, identityPolicy: "anonymous",
      sections: [{sectionId: "section1", title: "Details",
        description: null, pageBreak: false, questions: []}],
      logicRules: [],
      appearance: {preset: "minimal", logoAssetId: null,
        coverAssetId: null, activityKind: null},
      availability: {opensAt: null, closesAt: null,
        responseLimit: null, closedMessage: null},
      consent: {consentCopy: "I consent to sharing my answers.",
        consentVersion: "v1", retentionCopy: "Response retained."},
      completion: {title: "Thanks", message: null, actionKind: "none",
        actionLabel: null, actionUrl: null}}});
  store.put(`organizerFormConversionReceipts/${formConversionReceiptId(
    responseId, "crmContact")}`, {organizerId: org, formId: "form1",
    responseId, kind: "crmContact", status: "completed",
    resultId: contactId});
  const originId = organizerContactOriginId({organizerId: org,
    sourceKind: "hostForm", sourceEntityKind: "hostFormResponse",
    sourceEntityId: responseId});
  store.put(`organizerContactOrigins/${originId}`, {
    organizerId: org, currentContactId: contactId,
    originContactId: contactId, sourceKind: "hostForm",
    sourceEntityKind: "hostFormResponse", sourceEntityId: responseId,
    eventId: null, formId: "form1", responseId});
  store.put(`organizerContacts/${contactId}`, {organizerId: org,
    displayName: "Ada Guest", searchName: "ada guest",
    linkedUid: null, phoneE164: null, email: null,
    identityState: "unlinked", ambiguousCandidateContactIds: [],
    deletedAt: null, hiddenAt: null, mergedIntoContactId: null});
  store.put(`organizerEventOffers/${offerId}`, {offerId, organizerId: org,
    eventId, contactId, applicationId: responseId,
    sourceKind: "formResponse", status: "offered", generation: 1,
    revision: 2, expiresAtMillis: 4_000_000, organizerPaymentLink: null,
    paymentSnapshot: {eventPaymentRevision: 1,
      eventPaymentHash: "a".repeat(64), expectedAmountMinor: 0,
      currency: "INR", collectionMode: null,
      reusablePaymentPageUrl: null, personalPaymentLink: null,
      paymentInstructions: null, messageTemplate: null,
      expiresAtMillis: 4_000_000},
    manualPayment: {status: "none", evidenceReference: null,
      evidenceRecordedAtMillis: null, reviewedByUid: null,
      reviewedAtMillis: null, reviewNote: null,
      bankReceiptChecked: false, attestedAmountMinor: null,
      attestedCurrency: null, attestedEventPaymentRevision: null,
      attestedEventPaymentHash: null},
    offeredAtMillis: 1500, createdAtMillis: 1000,
    updatedAtMillis: 1500});
  const payload = {organizerId: org, eventId, responseId, contactId,
    offerId, expectedOfferRevision: 2, expectedOfferGeneration: 1,
    expectedLedgerRevision: 3, requestId};
  const commit = (overrides: Partial<typeof payload> = {}) =>
    commitOrganizerFormAdmission({db: store.db(), actorUid,
      payload: {...payload, ...overrides}, nowMillis: () => 2000,
      loadCurrentAuthUser: async (uid) => ({uid,
        phoneNumber: "+919999999999"})});
  return {store, payload, commit, originId};
}

export function approvedApplicationFixture() {
  const current = fixture();
  const {store} = current;
  const applicationId = genericFormApplicationId(responseId);
  store.rows.delete(`organizerFormConversionReceipts/${
    formConversionReceiptId(responseId, "crmContact")}`);
  store.get("organizerForms/form1")!.purpose = "application";
  (store.get("organizerFormVersions/version1")!.definition as Row)
    .purpose = "application";
  Object.assign(store.get(`organizerEventOffers/${offerId}`)!,
    {sourceKind: "application", applicationId});
  const source = {kind: "native", providerId: null, externalFormId: null,
    externalResponseId: responseId, importReceiptId: null};
  store.put(`organizerApplications/${applicationId}`, {organizerId: org,
    formId: "form1", formVersionId: "version1", targetKind: "event",
    targetId: eventId, linkedUid: null, contactId,
    applicantDisplayName: "Ada Guest",
    applicantDisplayNameNormalized: "ada guest",
    reviewStatus: "approved", latestResponseId: responseId, source,
    assignedReviewerUid: actorUid, reviewNote: "Accepted", revision: 2,
    submittedAt: ts(1100), updatedAt: ts(1500), reviewedAt: ts(1500)});
  store.put(`organizerApplicationResponses/${responseId}`, {organizerId: org,
    applicationId, formId: "form1", formVersionId: "version1",
    linkedUid: null, answers: [], source, consentVersion: "v1",
    grantId: null, submittedAt: ts(1100)});
  return {...current, applicationId};
}
