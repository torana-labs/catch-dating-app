import type {CreatePublicOrganizerReviewCallablePayload} from "../../../../functions/src/shared/generated/createPublicOrganizerReviewCallablePayload";
import type {CreatePublicOrganizerReviewCallableResponse} from "../../../../functions/src/shared/generated/createPublicOrganizerReviewCallableResponse";
import type {ManageOrganizerOwnerPageCallablePayload} from "../../../../functions/src/shared/generated/manageOrganizerOwnerPageCallablePayload";
import type {ManageOrganizerOwnerPageCallableResponse} from "../../../../functions/src/shared/generated/manageOrganizerOwnerPageCallableResponse";
import type {OrganizerTrackingSettingsCallableResponse} from "../../../../functions/src/shared/generated/organizerTrackingSettingsCallableResponse";
import type {RecordOrganizerAnalyticsEventCallablePayload} from "../../../../functions/src/shared/generated/recordOrganizerAnalyticsEventCallablePayload";
import type {RecordOrganizerAnalyticsEventCallableResponse} from "../../../../functions/src/shared/generated/recordOrganizerAnalyticsEventCallableResponse";
import type {SetOrganizerTrackingSettingsCallablePayload} from "../../../../functions/src/shared/generated/setOrganizerTrackingSettingsCallablePayload";
import type {SetReviewResponseCallablePayload} from "../../../../functions/src/shared/generated/setReviewResponseCallablePayload";
import type {UpdateOrganizerCallablePayload} from "../../../../functions/src/shared/generated/updateOrganizerCallablePayload";
import {claimFirebaseConfigured, publicAnalyticsFirebaseConfigured, publicReviewsFirebaseConfigured} from "../../firebaseConfig";
import {getFirebaseRuntime, invokeWebsiteCallable} from "./runtime";

/**
 * Public organiser pages: reviews, analytics events, the founding-host offer, and the owner's tools and billing.
 */
export type PublicOrganizerReview =
  CreatePublicOrganizerReviewCallableResponse["review"];

export type CreatePublicOrganizerReviewPayload =
  CreatePublicOrganizerReviewCallablePayload;
export type CreatePublicOrganizerReviewResponse =
  CreatePublicOrganizerReviewCallableResponse;

export type RecordOrganizerAnalyticsEventPayload =
  RecordOrganizerAnalyticsEventCallablePayload;
export type RecordOrganizerAnalyticsEventResponse =
  RecordOrganizerAnalyticsEventCallableResponse;

/**
 * A market's public founding-host counter (publicFoundingHostOffers, public
 * read), or null when the build has no Firebase config or the market has
 * none. The callback gets the raw document; the caller decides what it shows.
 */
export async function watchPublicFoundingHostOffer(
  marketId: string,
  onValue: (value: unknown) => void,
  onError: (error: Error) => void,
): Promise<() => void> {
  const runtime = await getFirebaseRuntime();
  if (!runtime) {
    onValue(null);
    return () => undefined;
  }
  const {doc, onSnapshot} = await import("firebase/firestore");
  return onSnapshot(
    doc(runtime.firestore, "publicFoundingHostOffers", marketId),
    (snapshot) => onValue(snapshot.exists() ? snapshot.data() : null),
    onError,
  );
}

export async function createPublicOrganizerReview(
  payload: CreatePublicOrganizerReviewPayload
): Promise<CreatePublicOrganizerReviewResponse> {
  return invokeWebsiteCallable<CreatePublicOrganizerReviewPayload, CreatePublicOrganizerReviewResponse>(
    "createPublicOrganizerReview", payload, publicReviewsFirebaseConfigured, "Public review writes");
}

export async function recordOrganizerAnalyticsEvent(
  payload: RecordOrganizerAnalyticsEventPayload
): Promise<RecordOrganizerAnalyticsEventResponse> {
  if (!publicAnalyticsFirebaseConfigured) return {accepted: false};
  return invokeWebsiteCallable<RecordOrganizerAnalyticsEventPayload, RecordOrganizerAnalyticsEventResponse>(
    "recordOrganizerAnalyticsEvent", payload, publicAnalyticsFirebaseConfigured, "Organiser analytics events");
}
/** The host billing portal's owner callables; the feature parses the replies. */
export type HostBillingCallable = "manageOrganizerBillingPlan";
export function invokeHostBillingCallable(name: HostBillingCallable,
  payload: Record<string, unknown>): Promise<unknown> {
  return invokeWebsiteCallable(name, payload, claimFirebaseConfigured, "Host billing");
}
export function manageOrganizerOwnerPage(
  payload: ManageOrganizerOwnerPageCallablePayload
): Promise<ManageOrganizerOwnerPageCallableResponse> {
  return invokeWebsiteCallable("manageOrganizerOwnerPage", payload, claimFirebaseConfigured, "Organizer owner tools");
}
/** Saves the organiser's about text through the organiser command the Host app uses. */
export async function updateOrganizerDescription(organizerId: string, description: string): Promise<void> {
  await invokeWebsiteCallable<UpdateOrganizerCallablePayload, unknown>("updateOrganizer",
    {organizerId, fields: {description}}, claimFirebaseConfigured, "Organizer owner tools");
}
export async function setReviewResponse(payload: SetReviewResponseCallablePayload): Promise<void> {
  await invokeWebsiteCallable<SetReviewResponseCallablePayload, unknown>("setReviewResponse", payload,
    claimFirebaseConfigured, "Organizer owner tools");
}
export function setOrganizerTrackingSettings(
  payload: SetOrganizerTrackingSettingsCallablePayload
): Promise<OrganizerTrackingSettingsCallableResponse> {
  return invokeWebsiteCallable("setOrganizerTrackingSettings", payload, claimFirebaseConfigured, "Organizer owner tools");
}
