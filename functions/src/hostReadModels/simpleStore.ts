import {validateHostGroupDetailDocument} from
  "../shared/generated/validators/hostGroupDetailDocument";
import {savedAudienceResponse} from "../organizers/organizerSavedAudiences";
import {isDeepStrictEqual} from "node:util";
import type {HostFormSummaryDocument, HostEventSummaryDocument,
  OrganizerFormDocument, OrganizerSavedAudienceDocument,
  HostGroupSummaryDocument} from "../shared/generated/firestoreAdminTypes";
import {projectSummary} from "../organizers/organizerForms";
import {projectPrivateEventSetupSummary} from
  "../events/progressiveSetup/setupSummaryProjection";
import {FieldPath} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {emptyDirectory} from "./contactStore";

export type SimpleModel = "forms" | "events" | "groups";
type View = HostFormSummaryDocument | HostEventSummaryDocument |
  HostGroupSummaryDocument;
const models = {
  groups: {source: "organizerSavedAudiences", view: "hostGroupSummaries",
    marker: "groupSummaryVersion"},
  forms: {source: "organizerForms", view: "hostFormSummaries",
    marker: "formSummaryVersion"},
  events: {source: "events", view: "hostEventSummaries",
    marker: "eventSummaryVersion"},
} as const;

/**
 * One source's summary row, or null when it has none. A source that fails its
 * read contract (a stored shape the current schema rejects, such as a legacy
 * field) is left out and logged: projection is pure, so the throw is about the
 * data, and one such source must never block its organizer's whole directory
 * or a trigger retry loop. The nightly data validation reports the document.
 * @param {SimpleModel} model The directory model.
 * @param {FirebaseFirestore.DocumentSnapshot} source The source document.
 * @return {View|null} The summary row, or null.
 */
function project(model: SimpleModel,
  source: FirebaseFirestore.DocumentSnapshot): View | null {
  try {
    return projectStrict(model, source);
  } catch (error) {
    logger.warn("Host directory left out a source that fails its contract.", {
      model, sourceId: source.id,
      organizerId: source.data()?.organizerId ?? null,
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function projectStrict(model: SimpleModel,
  source: FirebaseFirestore.DocumentSnapshot): View | null {
  if (!source.exists) return null;
  const data = source.data()!;
  if (typeof data.organizerId !== "string") return null;
  if (model === "groups") {
    const group = data as OrganizerSavedAudienceDocument;
    if (group.audienceId !== source.id || group.scope !== "organizerCrm") {
      throw new Error("Group summary owner or identity is inconsistent.");
    }
    // A group whose definition cannot be shown safely gets neither row.
    if (!validateHostGroupDetailDocument({organizerId: group.organizerId,
      audienceId: source.id, version: 1, row: savedAudienceResponse(group)})) {
      throw new Error("Group definition violates its safe read contract.");
    }
    const isStatic = group.definition.predicates.length === 1 &&
      group.definition.predicates[0].kind === "staticMembers";
    return {organizerId: group.organizerId, audienceId: source.id,
      status: group.status, updatedAtMillis: group.updatedAt.toMillis(),
      searchName: group.name.toLowerCase(), isStatic,
      lastPreviewAtMillis: group.lastPreviewAt?.toMillis() ?? 0,
      version: 1, row: {organizerId: group.organizerId, audienceId: source.id,
        name: group.name, status: group.status,
        isStatic,
        revision: group.revision,
        lastPreviewMatchCount: group.lastPreviewMatchCount,
        lastPreviewAtMillis: group.lastPreviewAt?.toMillis() ?? null,
        updatedAtMillis: group.updatedAt.toMillis()}};
  }
  if (model === "forms") {
    const form = data as OrganizerFormDocument;
    return {organizerId: form.organizerId, formId: source.id,
      updatedAtMillis: form.updatedAt.toMillis(), status: form.status,
      purpose: form.purpose, row: projectSummary(source.id, form), version: 1};
  }
  // Published events already use the SDK. Only the unpublished inventory needs
  // a restricted projection; raw Event fields never become a Host list DTO.
  if (data.publicationState !== "private") return null;
  const row = projectPrivateEventSetupSummary(
    source as FirebaseFirestore.QueryDocumentSnapshot, data.organizerId,
    -62135596800000, data.status === "cancelled" ? "cancelled" : "upcoming");
  return {organizerId: data.organizerId, eventId: source.id,
    startTimeMillis: row.startTimeMillis, status: row.status, row, version: 1};
}

/** Current transactional sources defeat out-of-order trigger delivery. */
export async function reconcileSimpleSummary(db: FirebaseFirestore.Firestore,
  model: SimpleModel, id: string): Promise<void> {
  const spec = models[model];
  await db.runTransaction(async (tx) => {
    const ref = db.collection(spec.view).doc(id);
    const [source, old] = await tx.getAll(
      db.collection(spec.source).doc(id), ref);
    const next = project(model, source);
    const owner = next ? await tx.get(db.collection("organizers")
      .doc(next.organizerId)) : null;
    const view = owner?.exists ? next : null;
    const detailRef = db.collection("hostGroupDetails").doc(id);
    const oldDetail = model === "groups" ? await tx.get(detailRef) : null;
    const detail = model === "groups" && view ? {
      organizerId: view.organizerId, audienceId: id, version: 1,
      row: savedAudienceResponse(source.data() as
        OrganizerSavedAudienceDocument),
    } : null;
    if (detail && !validateHostGroupDetailDocument(detail)) {
      throw new Error("Group definition violates its safe read contract.");
    }
    if (isDeepStrictEqual(old.data() ?? null, view) &&
        (model !== "groups" ||
          isDeepStrictEqual(oldDetail?.data() ?? null, detail))) return;
    if (model === "groups") {
      if (detail) tx.set(detailRef, detail);
      else if (oldDetail?.exists) tx.delete(detailRef);
    }
    if (view) tx.set(ref, view);
    else if (old.exists) tx.delete(ref);
  });
}

export async function backfillSimpleSummaries(db: FirebaseFirestore.Firestore,
  model: SimpleModel, organizerId: string, apply: boolean): Promise<number> {
  const spec = models[model];
  let count = 0;
  const collections = apply ? [spec.source, spec.view,
    ...(model === "groups" ? ["hostGroupDetails"] : [])] : [spec.source];
  for (const collection of collections) {
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    do {
      let query = db.collection(collection)
        .where("organizerId", "==", organizerId)
        .orderBy(FieldPath.documentId()).limit(100);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      for (const doc of page.docs) {
        if (collection === spec.source) count++;
        if (apply) await reconcileSimpleSummary(db, model, doc.id);
      }
      cursor = page.size === 100 ? page.docs.at(-1) : undefined;
    } while (cursor);
  }
  return count;
}

export async function activateSimpleSummaries(db: FirebaseFirestore.Firestore,
  model: SimpleModel, organizerId: string): Promise<number> {
  const spec = models[model];
  return db.runTransaction(async (tx) => {
    const query = (collection: string) => db.collection(collection)
      .where("organizerId", "==", organizerId);
    const directoryRef = db.collection("hostDirectorySummaries")
      .doc(organizerId);
    const [sources, views, directory, owner, details] = await Promise.all([
      tx.get(query(spec.source)), tx.get(query(spec.view)),
      tx.get(directoryRef),
      tx.get(db.collection("organizers").doc(organizerId)),
      model === "groups" ? tx.get(query("hostGroupDetails")) : null,
    ]);
    if (!owner.exists) throw new Error("Organizer does not exist.");
    const expected = new Map(sources.docs.flatMap((source) => {
      const view = project(model, source);
      return view ? [[source.id, view] as const] : [];
    }));
    if (expected.size !== views.size || views.docs.some((doc) =>
      !isDeepStrictEqual(doc.data(), expected.get(doc.id)))) {
      throw new Error(`${model} summary parity failed; rerun backfill.`);
    }
    if (model === "groups" && details &&
        (details.size !== expected.size || details.docs.some((doc) => {
          const source = sources.docs.find((item) => item.id === doc.id);
          return !validateHostGroupDetailDocument(doc.data()) ||
            !source || !isDeepStrictEqual(doc.data(), {
            organizerId, audienceId: doc.id, version: 1,
            row: savedAudienceResponse(source.data() as
              OrganizerSavedAudienceDocument),
          });
        }))) throw new Error("Group definition parity failed; rerun backfill.");
    tx.set(directoryRef, {...(directory.data() ?? emptyDirectory(organizerId)),
      [spec.marker]: 1});
    return expected.size;
  });
}
