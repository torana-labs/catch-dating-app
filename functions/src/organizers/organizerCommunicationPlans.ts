import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {organizerCommunicationPlanCapabilityVersion,
  resolveIndividualCommunicationPlan} from
  "../communications/organizerCommunicationPlan";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import type {ResolveOrganizerCommunicationPlanCallablePayload} from
  "../shared/generated/resolveOrganizerCommunicationPlanCallablePayload";
import type {ResolveOrganizerCommunicationPlanCallableResponse} from
  "../shared/generated/resolveOrganizerCommunicationPlanCallableResponse";
import type {
  OrganizerContactChannelStateDocument,
  OrganizerContactDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  validateResolveOrganizerCommunicationPlanCallablePayload,
} from
  "../shared/generated/validators/resolveOrganizerCommunicationPlanInput";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {organizerContactChannelStateId} from "./organizerCampaignModel";

interface OrganizerCommunicationPlanDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  requireManager: typeof requireOrganizerManager;
  nowMillis: () => number;
}

const defaultDeps: OrganizerCommunicationPlanDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  requireManager: requireOrganizerManager,
  nowMillis: () => Date.now(),
};

/** Resolves one manager-visible communication plan without mutating state. */
export async function resolveOrganizerCommunicationPlanHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerCommunicationPlanDeps = defaultDeps
): Promise<ResolveOrganizerCommunicationPlanCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ResolveOrganizerCommunicationPlanCallablePayload
  >(
    request,
    validateResolveOrganizerCommunicationPlanCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    actorUid,
    "resolveOrganizerCommunicationPlan",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  await deps.requireManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });

  const contactId = data.target.contactId;
  const [contactSnapshot, channelSnapshot] = await Promise.all([
    db.collection("organizerContacts").doc(contactId).get(),
    db.collection("organizerContactChannelStates")
      .doc(organizerContactChannelStateId(data.organizerId, contactId)).get(),
  ]);
  const contact = contactSnapshot.data() as
    OrganizerContactDocument | undefined;
  if (!contact || contact.organizerId !== data.organizerId ||
      contact.deletedAt !== null || contact.hiddenAt != null ||
      contact.identityState === "merged") {
    throw new HttpsError("not-found", "Customer not found.");
  }
  const channelState = channelSnapshot.data() as
    OrganizerContactChannelStateDocument | undefined;
  const recipient = resolveIndividualCommunicationPlan({
    contactId,
    displayName: contact.displayNameOverride?.trim() || contact.displayName,
    linkedUid: contact.linkedUid,
    identityState: contact.identityState,
    ambiguousCandidateCount: contact.ambiguousCandidateContactIds.length,
    phoneE164: contact.phoneE164,
    email: contact.email ?? null,
    whatsappStatus: contact.whatsappStatus,
    whatsappAdminSuppressed: channelState?.adminSuppressed === true,
  });
  return {
    organizerId: data.organizerId,
    intent: data.intent,
    capabilityVersion: organizerCommunicationPlanCapabilityVersion,
    resolvedAtMillis: deps.nowMillis(),
    recipients: [recipient],
  };
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  const target = input.target;
  return {
    ...input,
    organizerId: normalizeString(input.organizerId),
    intent: normalizeString(input.intent),
    target: target && typeof target === "object" && !Array.isArray(target) ? {
      ...(target as Record<string, unknown>),
      kind: normalizeString((target as Record<string, unknown>).kind),
      contactId: normalizeString(
        (target as Record<string, unknown>).contactId
      ),
    } : target,
  };
}

function normalizeString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export const resolveOrganizerCommunicationPlan = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => resolveOrganizerCommunicationPlanHandler(request)
);
