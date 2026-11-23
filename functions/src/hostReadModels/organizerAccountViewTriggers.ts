import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  reconcileAllOrganizerBillingViews,
  reconcileOrganizerBillingView,
  reconcileOrganizerEntitlementView,
} from "./organizerAccountViews";
import {reconcileOrganizerOwnerView} from "./organizerOwnerViewStore";
import {organizerFollowerUpdateTemplateName} from
  "../organizers/organizerFollowerWhatsapp";

const options = {retry: true};

type Data = FirebaseFirestore.DocumentData | undefined;

const same = (before: Data, after: Data, fields: string[]) =>
  before !== undefined && after !== undefined &&
  fields.every((field) =>
    JSON.stringify(before[field] ?? null) ===
      JSON.stringify(after[field] ?? null));

/** The organizer ids a source document names, before and after. */
function organizerIds(before: Data, after: Data): string[] {
  const ids = new Set<string>();
  for (const data of [before, after]) {
    if (typeof data?.organizerId === "string" && data.organizerId) {
      ids.add(data.organizerId);
    }
  }
  return [...ids];
}

/**
 * An organizer appearing or vanishing: its billing view. Its owner, owner
 * links, about text or photos changing: its owner view.
 */
export const onHostOrganizerAccountViewOrganizerChanged = onDocumentWritten({
  ...options, document: "organizers/{organizerId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const db = admin.firestore();
  const id = event.params.organizerId;
  if (!before || !after) await reconcileOrganizerBillingView(db, id);
  if (same(before, after, ["ownerUserId", "hostUserId", "ownerLinks",
    "description", "organizerPhotos"])) return;
  await reconcileOrganizerOwnerView(db, id);
});

/**
 * Catch's commercial terms changing the trial length: the organizer's
 * billing view, or every organizer's when the platform terms changed.
 */
export const onHostOrganizerBillingViewTermsChanged = onDocumentWritten({
  ...options, timeoutSeconds: 540,
  document: "commercialTerms/{termsId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const trial = (data: Data) => JSON.stringify(data?.terms?.trial ?? null);
  if (before && after && trial(before) === trial(after) &&
      before.scope === after.scope &&
      before.organizerId === after.organizerId) return;
  const db = admin.firestore();
  const scopes = [before?.scope, after?.scope];
  if (scopes.includes("platform")) {
    await reconcileAllOrganizerBillingViews(db);
    return;
  }
  for (const organizerId of organizerIds(before, after)) {
    await reconcileOrganizerBillingView(db, organizerId);
  }
});

/** The first event or first paid booking, which start the trial. */
export const onHostOrganizerBillingViewGrowthChanged = onDocumentWritten({
  ...options, document: "organizerGrowthFacts/{organizerId}",
}, async (event) => {
  const anchors = (data: Data) => JSON.stringify([
    data?.milestones?.firstEventAt ?? null,
    data?.milestones?.firstPaidBookingAt ?? null]);
  if (anchors(event.data?.before.data()) ===
      anchors(event.data?.after.data())) return;
  await reconcileOrganizerBillingView(admin.firestore(),
    event.params.organizerId);
});

/** A plan bought, activated, cancelled or ended. */
export const onHostOrganizerBillingViewPlanChanged = onDocumentWritten({
  ...options, document: "organizerBillingPlans/{organizerId}",
}, async (event) => {
  await reconcileOrganizerBillingView(admin.firestore(),
    event.params.organizerId);
});

/** A grant issued, consumed or revoked, or a meter moving. */
export const onHostOrganizerEntitlementViewChanged = onDocumentWritten({
  ...options, document: "organizerEntitlements/{organizerId}",
}, async (event) => {
  await reconcileOrganizerEntitlementView(admin.firestore(),
    event.params.organizerId);
});

/** A day of page insights rolled up. */
export const onHostOrganizerOwnerViewInsightsChanged = onDocumentWritten({
  ...options, document: "organizerInsights/{insightsId}",
}, async (event) => {
  for (const organizerId of organizerIds(event.data?.before.data(),
    event.data?.after.data())) {
    await reconcileOrganizerOwnerView(admin.firestore(), organizerId);
  }
});

/** A follower message reserved or given back. */
export const onHostOrganizerOwnerViewQuotaChanged = onDocumentWritten({
  ...options, document: "organizerFollowerMessageQuotas/{quotaId}",
}, async (event) => {
  for (const organizerId of organizerIds(event.data?.before.data(),
    event.data?.after.data())) {
    await reconcileOrganizerOwnerView(admin.firestore(), organizerId);
  }
});

/**
 * A WhatsApp sender or the follower update template changing, which decides
 * whether follower messages can go on WhatsApp.
 */
export const onHostOrganizerOwnerViewSenderChanged = onDocumentWritten({
  ...options, document: "organizerSenderConnections/{connectionId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (same(before, after, ["organizerId", "channel", "status",
    "phoneNumberId", "secretVersionResource"])) return;
  for (const organizerId of organizerIds(before, after)) {
    await reconcileOrganizerOwnerView(admin.firestore(), organizerId);
  }
});

export const onHostOrganizerOwnerViewTemplateChanged = onDocumentWritten({
  ...options, document: "organizerMessageTemplates/{templateId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const follower = (data: Data) =>
    data?.name === organizerFollowerUpdateTemplateName;
  if (!follower(before) && !follower(after)) return;
  for (const organizerId of organizerIds(before, after)) {
    await reconcileOrganizerOwnerView(admin.firestore(), organizerId);
  }
});
