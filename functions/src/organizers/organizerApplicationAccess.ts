import {createHash} from "crypto";
import type {
  OrganizerApplicationDocument,
  OrganizerApplicationResponseDocument,
  OrganizerContactOriginDocument,
  OrganizerFormResponseDocument,
  OrganizerFormVersionDocument,
} from "../shared/generated/firestoreAdminTypes";
import {genericApplicationAnswers} from "./genericApplicationAnswers";
import {organizerContactOriginId} from "../shared/organizerContactOrigins";

export type ApplicationRead = (collection: string, id: string) =>
  Promise<FirebaseFirestore.DocumentSnapshot>;

export function genericFormApplicationId(responseId: string): string {
  return "formapplication_" + createHash("sha256")
    .update(responseId).digest("hex").slice(0, 32);
}

/** Source origins follow merges without rewriting submitted evidence. */
export async function organizerApplicationContactId(params: {
  db: FirebaseFirestore.Firestore;
  applicationId: string;
  application: OrganizerApplicationDocument;
  read?: ApplicationRead;
}): Promise<string | null> {
  const {application} = params;
  const generic = application.source.kind === "native" &&
    params.applicationId === genericFormApplicationId(
      application.latestResponseId);
  const originId = organizerContactOriginId({
    organizerId: application.organizerId,
    sourceKind: "hostForm", sourceEntityKind: generic ?
      "hostFormResponse" : "hostApplicationResponse",
    sourceEntityId: application.latestResponseId,
  });
  const origin = (await (params.read ?
    params.read("organizerContactOrigins", originId) :
    params.db.collection("organizerContactOrigins").doc(originId).get()))
    .data() as OrganizerContactOriginDocument | undefined;
  return origin?.organizerId === application.organizerId ?
    origin.currentContactId : application.contactId;
}

export interface OrganizerApplicationAccess {
  answers: OrganizerApplicationResponseDocument["answers"];
  accessState: "organizerImported" | "activeParticipantGrant" |
    "submittedFormResponse" | "revokedParticipantGrant";
  sourceResponseId: string | null;
  identity?: {phoneE164: string | null; email: string | null};
}

/**
 * Generic forms retain their own submission authority; no grant is invented.
 * A generic-form application reads its answers straight from the submitted
 * organizerFormResponses document and its version. An imported application
 * reads the immutable organizerApplicationResponses snapshot its import wrote.
 * Any other application (the retired participant application flow) is denied.
 */
export async function organizerApplicationAccess(params: {
  db: FirebaseFirestore.Firestore;
  applicationId: string;
  application: OrganizerApplicationDocument;
  transaction?: FirebaseFirestore.Transaction;
  read?: ApplicationRead;
}): Promise<OrganizerApplicationAccess> {
  const {db, applicationId, application, transaction} = params;
  const read = (collection: string, id: string) => transaction ?
    transaction.get(db.collection(collection).doc(id)) :
    params.read ? params.read(collection, id) :
      db.collection(collection).doc(id).get();
  const denied: OrganizerApplicationAccess = {
    answers: [], accessState: "revokedParticipantGrant", sourceResponseId: null,
  };
  if (application.source.kind === "native") {
    if (applicationId !== genericFormApplicationId(
      application.latestResponseId) ||
        application.source.externalResponseId !==
          application.latestResponseId) {
      return denied;
    }
    const [submittedSnap, versionSnap] = await Promise.all([
      read("organizerFormResponses", application.latestResponseId),
      read("organizerFormVersions", application.formVersionId),
    ]);
    const submitted = submittedSnap.data() as
      OrganizerFormResponseDocument | undefined;
    const version = versionSnap.data() as
      OrganizerFormVersionDocument | undefined;
    if (!submitted || !version || submitted.status !== "submitted" ||
        submitted.organizerId !== application.organizerId ||
        submitted.formId !== application.formId ||
        submitted.versionId !== application.formVersionId ||
        submitted.respondentUid !== application.linkedUid ||
        version.organizerId !== application.organizerId ||
        version.formId !== application.formId) {
      return denied;
    }
    return {
      answers: genericApplicationAnswers(submitted, version),
      accessState: "submittedFormResponse",
      sourceResponseId: application.latestResponseId,
      identity: submitted.identity,
    };
  }
  const response = (await read("organizerApplicationResponses",
    application.latestResponseId)).data() as
    OrganizerApplicationResponseDocument | undefined;
  if (!response || response.applicationId !== applicationId ||
      response.organizerId !== application.organizerId ||
      response.formId !== application.formId ||
      response.formVersionId !== application.formVersionId ||
      response.linkedUid !== application.linkedUid ||
      response.source.kind !== application.source.kind) return denied;
  return {answers: response.answers, accessState: "organizerImported",
    sourceResponseId: null};
}
