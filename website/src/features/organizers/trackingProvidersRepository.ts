import type {ReadPublicOrganizerTrackingSettingsCallablePayload, PublicOrganizerTrackingSettingsCallableResponse} from "../../firebase";

export async function readOrganizerProviderSettings(
  payload: ReadPublicOrganizerTrackingSettingsCallablePayload
): Promise<PublicOrganizerTrackingSettingsCallableResponse> {
  const {readPublicOrganizerTrackingSettings} = await import("../../firebase");
  const response = await readPublicOrganizerTrackingSettings(payload);
  // This publication schema intentionally denies live advertising pending policy
  // review. Expand it only together with the reviewed generated backend contract.
  if (response.organizerId !== payload.organizerId || response.eventId !== payload.eventId ||
      response.enabled !== false || response.metaPixelId !== null || response.googleMeasurementId !== null ||
      typeof response.profileTagsEligible !== "boolean" || (payload.eventId !== null && response.profileTagsEligible) ||
      !["policyReviewRequired", "sensitiveEvent", "eventClassificationUnavailable"].includes(response.policyReason)) {
    throw new Error("Invalid public tracking policy response");
  }
  return response;
}
