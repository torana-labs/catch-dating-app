import * as admin from "firebase-admin";
import type {FakeData} from "../../shared/testing/programFirestore";
import {baseSeed, now} from "../../shared/testing/programFixtures";
import {hashEndpoint} from "../../organizers/organizerCampaignModel";
import type {OrganizerMessagingWebhookEventDocument} from
  "../../shared/generated/firestoreAdminTypes";

// Shared seeds for the programme WhatsApp tests.

export const guestPhone = "+919876501234";
export const guestHash = hashEndpoint(guestPhone);
export const strangerPhone = "+447700900123";

export function whatsappSeed(overrides: Record<string, FakeData> = {}):
  Record<string, FakeData> {
  const base = baseSeed();
  return {
    ...base,
    "organizerPrograms/program-1": {...base["organizerPrograms/program-1"]!,
      whatsappSenderConnectionId: "conn-1"},
    "organizerSenderConnections/conn-1": {organizerId: "org-1",
      channel: "whatsapp", provider: "metaCloudApi", status: "active",
      wabaId: "1111", phoneNumberId: "2222", revision: 4,
      secretVersionResource: "projects/p/secrets/s/versions/1",
      displayPhoneNumber: "+91 98765 00000", verifiedName: "Aditi & Kabir"},
    "programHouseholds/household-1": {programId: "program-1",
      organizerId: "org-1", label: "The Mehra family",
      primaryContactName: "Neha Mehra", primaryPhoneE164: guestPhone,
      memberGuestIds: ["guest-1"], revision: 2,
      messagingConsent: {granted: true, grantedAt: now,
        source: "householdRsvpLink"}},
    [`programWhatsappEndpointIndex/program-1_${guestHash}`]: {
      schemaVersion: 1, programId: "program-1", organizerId: "org-1",
      endpointHash: guestHash, householdId: "household-1", guestId: null,
      source: "household", ambiguous: false,
      claimants: [{kind: "household", id: "household-1",
        householdId: "household-1"}], updatedAtMillis: 1, revision: 1},
    ...overrides,
  };
}

export function inboundEvent(params: {from?: string; body?: string | null;
  id?: string; stop?: boolean; atMillis?: number}):
  OrganizerMessagingWebhookEventDocument {
  const from = params.from ?? guestPhone;
  const at = admin.firestore.Timestamp.fromMillis(
    params.atMillis ?? now.toMillis());
  return {
    provider: "metaCloudApi", providerEventId: `inbound:${params.id ?? "m1"}`,
    organizerId: "org-1", connectionId: "conn-1", eventKind: "inbound",
    providerMessageId: params.id ?? "wamid.m1",
    contextProviderMessageId: null, providerAccountId: "1111",
    providerPhoneNumberId: "2222", callbackData: null,
    inboundReply: null, deliveryStatus: null,
    endpointHash: hashEndpoint(from), isStop: params.stop ?? false,
    hasReply: true, inboundBody: params.body === undefined ?
      "Kya Sangeet ke liye bus hai?" : params.body,
    providerErrorCode: null, providerErrorEvidence: {kind: "none"},
    providerOccurredAt: at, processingStatus: "pending", attemptCount: 0,
    createdAt: at, processedAt: null,
    expiresAt: admin.firestore.Timestamp.fromMillis(at.toMillis() + 1e9),
  } as OrganizerMessagingWebhookEventDocument;
}

