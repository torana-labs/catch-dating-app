/* eslint-disable max-len */
import {
  INBOX_ITEMS_COLLECTION,
  INBOX_JOURNEY_COLLECTION,
  InboxContext,
  InboxItemDocument,
  InboxJourneyStepDocument,
  InboxSourceKind,
  JourneyStep,
  inboxItemId,
  journeyStepDocId,
  nextInboxItem,
  projectInboxSource,
  removedInboxItem,
  sameInboxItem,
} from "./model";

type Data = Record<string, unknown>;

export type InboxContextLoader = (db: FirebaseFirestore.Firestore, kind: InboxSourceKind,
  data: Data) => Promise<InboxContext>;

export interface InboxSyncResult {
  itemId: string;
  outcome: "written" | "unchanged" | "skipped";
  addedSteps: number;
}

/**
 * Brings one inbox item in step with its source document, and records every
 * journey step the source shows that the item has not recorded yet. A step is
 * written once, so its time is when Catch first saw it. Safe to repeat.
 */
export async function syncInboxSource(db: FirebaseFirestore.Firestore, kind: InboxSourceKind,
  sourceId: string, data: Data | undefined, now: Date,
  loadContext: InboxContextLoader = contextLoaderFor(sourceId)): Promise<InboxSyncResult> {
  const itemId = inboxItemId(kind, sourceId);
  const context = data ? await loadContext(db, kind, data) : {};
  const projection = data ? projectInboxSource(kind, sourceId, data, context) : null;
  const itemRef = db.collection(INBOX_ITEMS_COLLECTION).doc(itemId);
  const steps = projection?.journey ?? [];
  const stepRefs = steps.map((step) =>
    db.collection(INBOX_JOURNEY_COLLECTION).doc(journeyStepDocId(itemId, step.stepId)));
  return db.runTransaction(async (tx) => {
    const [itemSnap, ...stepSnaps] = await tx.getAll(itemRef, ...stepRefs);
    const existing = itemSnap.exists ? itemSnap.data() as InboxItemDocument : null;
    if (!projection) {
      if (!existing || (!data && existing.status === "done")) {
        return {itemId, outcome: "skipped", addedSteps: 0};
      }
      tx.set(itemRef, removedInboxItem(existing, now));
      return {itemId, outcome: "written", addedSteps: 0};
    }
    const next = nextInboxItem(projection, existing, now);
    let addedSteps = 0;
    steps.forEach((step, index) => {
      if (stepSnaps[index].exists) return;
      tx.create(stepRefs[index], journeyStepDocument(itemId, step));
      addedSteps += 1;
    });
    if (existing && sameInboxItem(existing, next)) {
      return {itemId, outcome: addedSteps ? "written" : "unchanged", addedSteps};
    }
    tx.set(itemRef, next);
    return {itemId, outcome: "written", addedSteps};
  });
}

export function journeyStepDocument(itemId: string, step: JourneyStep): InboxJourneyStepDocument {
  return {schemaVersion: 1, itemId, ...step,
    title: step.title.slice(0, 200), detail: step.detail?.slice(0, 500) ?? null};
}

/** The organizer or person a projection names, read from their documents. */
export async function loadInboxContext(db: FirebaseFirestore.Firestore, kind: InboxSourceKind,
  data: Data): Promise<InboxContext> {
  const organizerId = kind === "organizerClaimRequest" ? data.organizerId :
    kind === "externalEvent" ? data.canonicalHostId : null;
  if (typeof organizerId === "string" && organizerId) {
    const organizer = (await db.collection("organizers").doc(organizerId).get()).data();
    return {
      organizerName: typeof organizer?.name === "string" ? organizer.name : null,
      organizerCity: typeof organizer?.locationMarketId === "string" ? organizer.locationMarketId :
        typeof organizer?.cityName === "string" ? organizer.cityName : null,
    };
  }
  return {};
}

/** Access applications are keyed by uid; the person's name is on their profile. */
export async function loadAccessContext(db: FirebaseFirestore.Firestore, uid: string): Promise<InboxContext> {
  const user = (await db.collection("users").doc(uid).get()).data();
  const name = [user?.displayName, user?.name, user?.firstName]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return {personName: name?.trim() ?? null};
}

/** The loader the triggers use: organizer context, or the applicant's name. */
export function contextLoaderFor(sourceId: string): InboxContextLoader {
  return async (db, kind, data) => kind === "accessApplication" ?
    loadAccessContext(db, sourceId) : loadInboxContext(db, kind, data);
}
