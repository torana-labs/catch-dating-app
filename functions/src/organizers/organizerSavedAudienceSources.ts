import {HttpsError} from "firebase-functions/v2/https";
import type {
  EventDocument, OrganizerApplicationDocument,
  OrganizerContactEventEdgeDocument, OrganizerContactOriginDocument,
  OrganizerContactTagVocabularyDocument, OrganizerFormDocument,
  OrganizerFormResponseDocument, OrganizerFormVersionDocument,
  OrganizerSavedAudienceDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListOrganizerSavedAudiencesCallableResponse} from
  "../shared/generated/listOrganizerSavedAudiencesCallableResponse";
import {savedAudienceSpendMatches, staticAudienceMembers} from
  "./organizerSavedAudienceMembership";
import {organizerApplicationAccess} from "./organizerApplicationAccess";

type Definition = OrganizerSavedAudienceDocument["definition"];
type Predicate = Definition["predicates"][number];
type Sections = OrganizerFormVersionDocument["definition"]["sections"];
type Question = Sections[number]["questions"][number];
type Options = NonNullable<
  ListOrganizerSavedAudiencesCallableResponse["filterOptions"]>;
const sourceLimit = 5000;

async function bounded(query: FirebaseFirestore.Query, cap = sourceLimit,
  tx?: FirebaseFirestore.Transaction) {
  const limited = query.limit(cap + 1);
  const snap = tx ? await tx.get(limited) : await limited.get();
  if (snap.size > cap) {
    throw new HttpsError("resource-exhausted",
      `Audience source exceeds ${cap} records. Narrow the source first.`);
  }
  return snap.docs;
}

export function filterableAudienceQuestion(question: Question): boolean {
  return question.hostPresentation === "filterable" &&
    question.privacyClass !== "sensitive" &&
    ["singleChoice", "multiChoice", "boolean"].includes(question.kind);
}

async function requireFilterQuestion(db: FirebaseFirestore.Firestore,
  organizerId: string, predicate: Extract<Predicate, {kind: "formAnswer"}>) {
  const version = (await db.collection("organizerFormVersions")
    .doc(predicate.versionId).get()).data() as
    OrganizerFormVersionDocument | undefined;
  const question = version?.definition.sections.flatMap((s) => s.questions)
    .find((q) => q.questionId === predicate.questionId);
  if (!version || version.organizerId !== organizerId ||
      version.formId !== predicate.formId || !question ||
      !filterableAudienceQuestion(question) ||
      (question.kind === "boolean" ? typeof predicate.value !== "boolean" :
        !question.options.some((o) => o.value === predicate.value))) {
    throw new HttpsError("failed-precondition",
      "Choose an available filterable question and value from its " +
        "published version.");
  }
  return question;
}

/**
 * Validate typed references on save and again whenever membership is
 * resolved.
 */
export async function assertSavedAudienceSources(
  db: FirebaseFirestore.Firestore,
  organizerId: string, definition: Definition, validateMembers = true
): Promise<void> {
  for (const predicate of definition.predicates) {
    if (predicate.kind === "staticMembers" && validateMembers) {
      await staticAudienceMembers(db, organizerId,
        predicate.contactIds, true);
    } else if (predicate.kind === "formAnswer") {
      await requireFilterQuestion(db, organizerId, predicate);
    } else if (predicate.kind === "applicationStatus") {
      const snapshots = await Promise.all([
        db.collection("organizerForms").doc(predicate.formId).get(),
        db.collection("organizerApplicationForms").doc(predicate.formId).get(),
      ]);
      if (!snapshots.some((s) => s.data()?.organizerId === organizerId)) {
        throw new HttpsError("not-found", "Application form is unavailable.");
      }
    } else if (predicate.kind === "attendedEvent") {
      const event = (await db.collection("events").doc(predicate.eventId)
        .get()).data() as EventDocument | undefined;
      if (!event || event.organizerId !== organizerId) {
        throw new HttpsError("not-found", "Audience event is unavailable.");
      }
    }
  }
}

/**
 * Membership keys are evaluated from current scoped facts, including
 * withdrawal.
 */
export async function savedAudienceSourceMatches(
  db: FirebaseFirestore.Firestore,
  organizerId: string, definition: Definition, nowMillis = Date.now()):
  Promise<Map<string, Set<string>>> {
  await assertSavedAudienceSources(db, organizerId, definition, false);
  const sources = definition.predicates.filter((p) =>
    ["applicationStatus", "formAnswer", "attendedEvent"].includes(p.kind));
  const matches = await savedAudienceSpendMatches({db, organizerId, nowMillis,
    predicates: definition.predicates.filter((p): p is Extract<Predicate,
      {kind: "spend"}> => p.kind === "spend")});
  for (const predicate of definition.predicates) {
    if (predicate.kind === "staticMembers") {
      matches.set(JSON.stringify(predicate), await staticAudienceMembers(
        db, organizerId, predicate.contactIds, false));
    }
  }
  if (sources.length === 0) return matches;
  const origins = sources.some((p) => p.kind !== "attendedEvent") ?
    await bounded(db.collection("organizerContactOrigins")
      .where("organizerId", "==", organizerId)
      .where("sourceKind", "==", "hostForm")) : [];
  const contactsByResponse = new Map<string, string>();
  for (const doc of origins) {
    const origin = doc.data() as OrganizerContactOriginDocument;
    if (origin.sourceEntityKind === "hostFormResponse" ||
        origin.sourceEntityKind === "hostApplicationResponse") {
      contactsByResponse.set(origin.sourceEntityKind + ":" +
        origin.sourceEntityId, origin.currentContactId);
    }
  }
  // Reuse only bounded source snapshots within this evaluation. Permission
  // checks below still run for each matching application; a later request
  // reads all sources again, including withdrawals and changed review state.
  const formSources = new Map<string,
    FirebaseFirestore.QueryDocumentSnapshot[]>();
  const formDocuments = async (collection: "organizerApplications" |
    "organizerFormResponses", formId: string) => {
    const key = JSON.stringify([collection, formId]);
    const existing = formSources.get(key);
    if (existing) return existing;
    const docs = await bounded(db.collection(collection)
      .where("organizerId", "==", organizerId)
      .where("formId", "==", formId));
    formSources.set(key, docs);
    return docs;
  };
  for (const predicate of sources) {
    const ids = new Set<string>();
    if (predicate.kind === "applicationStatus") {
      const apps = await formDocuments("organizerApplications",
        predicate.formId);
      for (const doc of apps) {
        const application = doc.data() as OrganizerApplicationDocument;
        if (application.reviewStatus !== predicate.reviewStatus) continue;
        const access = await organizerApplicationAccess({db,
          applicationId: doc.id, application});
        if (access.accessState === "revokedParticipantGrant") continue;
        const key = (access.sourceResponseId ? "hostFormResponse:" :
          "hostApplicationResponse:") + application.latestResponseId;
        const contactId = contactsByResponse.get(key) ?? application.contactId;
        if (contactId) ids.add(contactId);
      }
    } else if (predicate.kind === "formAnswer") {
      const responses = await formDocuments("organizerFormResponses",
        predicate.formId);
      for (const doc of responses) {
        const response = doc.data() as OrganizerFormResponseDocument;
        if (response.status !== "submitted" ||
            response.versionId !== predicate.versionId) continue;
        const value = response.answers[predicate.questionId];
        const matchesValue = Array.isArray(value) ?
          typeof predicate.value === "string" && value.includes(
            predicate.value) :
          value === predicate.value;
        const contactId = contactsByResponse.get("hostFormResponse:" + doc.id);
        if (matchesValue && contactId) ids.add(contactId);
      }
    } else if (predicate.kind === "attendedEvent") {
      const edges = await bounded(db.collection("organizerContactEventEdges")
        .where("organizerId", "==", organizerId)
        .where("eventId", "==", predicate.eventId));
      for (const doc of edges) {
        const edge = doc.data() as OrganizerContactEventEdgeDocument;
        if (edge.checkedIn && !edge.cancelled) ids.add(edge.contactId);
      }
    }
    matches.set(JSON.stringify(predicate), ids);
  }
  return matches;
}

/**
 * Authoring labels come from immutable versions, never a mutable form draft.
 */
/**
 * The forms, filterable questions, events and manual tags an organizer's
 * audiences and automations can name. Shared by listOrganizerSavedAudiences
 * and the hostAudienceSourceViews trigger, which reads in [tx].
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} organizerId The organizer.
 * @param {FirebaseFirestore.Transaction} tx The transaction to read in.
 * @return {Promise<Options>} The options.
 */
export async function savedAudienceFilterOptions(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  tx?: FirebaseFirestore.Transaction): Promise<Options> {
  const scoped = (collection: string) => db.collection(collection)
    .where("organizerId", "==", organizerId);
  const tagRef = db.collection("organizerContactTagVocabularies")
    .doc(organizerId);
  const [forms, legacyForms, versions, events, tagSnap] = await Promise.all([
    bounded(scoped("organizerForms"), 200, tx),
    bounded(scoped("organizerApplicationForms"), 200, tx),
    bounded(scoped("organizerFormVersions"), 200, tx),
    bounded(scoped("events"), 200, tx),
    tx ? tx.get(tagRef) : tagRef.get(),
  ]);
  const formRows = new Map<string, {formId: string; title: string}>();
  for (const doc of [...forms, ...legacyForms]) {
    const form = doc.data() as OrganizerFormDocument;
    formRows.set(doc.id, {formId: doc.id, title: form.title});
  }
  const activeVersions = new Map(forms.map((doc) => [doc.id,
    (doc.data() as OrganizerFormDocument).activeVersionId]));
  const questions: Options["questions"] = [];
  for (const doc of versions) {
    const version = doc.data() as OrganizerFormVersionDocument;
    if (!formRows.has(version.formId)) continue;
    for (const question of version.definition.sections.flatMap((s) =>
      s.questions)) {
      if (!filterableAudienceQuestion(question)) continue;
      questions.push({formId: version.formId, versionId: doc.id,
        activeVersion: activeVersions.get(version.formId) === doc.id,
        version: version.version, formTitle: version.definition.title,
        questionId: question.questionId, label: question.label,
        kind: question.kind as "singleChoice" | "multiChoice" | "boolean",
        options: question.kind === "boolean" ?
          [{label: "Yes", value: true}, {label: "No", value: false}] :
          question.options.map((o) => ({label: o.label, value: o.value})),
      });
    }
  }
  if (questions.length > 100) {
    throw new HttpsError("resource-exhausted",
      "Audience authoring exceeds 100 filterable versioned questions.");
  }
  const tags = tagSnap.data() as
    OrganizerContactTagVocabularyDocument | undefined;
  return {
    forms: [...formRows.values()].sort((a, b) => a.title.localeCompare(
      b.title)),
    questions: questions.sort((a, b) => a.formTitle.localeCompare(
      b.formTitle) ||
      b.version - a.version || a.label.localeCompare(b.label)),
    events: events.map((doc) => ({eventId: doc.id,
      title: (doc.data() as EventDocument).name ?? "Untitled event"})),
    tags: tags?.organizerId === organizerId ? tags.tags : [],
  };
}
