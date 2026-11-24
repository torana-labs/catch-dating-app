import type {CreateProgramAssetUploadCallablePayload} from "../../../../functions/src/shared/generated/createProgramAssetUploadCallablePayload";
import type {GetProgramDriverTripCallablePayload} from "../../../../functions/src/shared/generated/getProgramDriverTripCallablePayload";
import type {GetProgramFamilyViewCallablePayload} from "../../../../functions/src/shared/generated/getProgramFamilyViewCallablePayload";
import type {GetProgramGuestIdStatusCallablePayload} from "../../../../functions/src/shared/generated/getProgramGuestIdStatusCallablePayload";
import type {GetProgramHamperWebViewCallablePayload} from "../../../../functions/src/shared/generated/getProgramHamperWebViewCallablePayload";
import type {GetProgramHotelHandoverCallablePayload} from "../../../../functions/src/shared/generated/getProgramHotelHandoverCallablePayload";
import type {GetProgramHouseholdRsvpViewCallablePayload} from "../../../../functions/src/shared/generated/getProgramHouseholdRsvpViewCallablePayload";
import type {GetProgramVendorRunSheetCallablePayload} from "../../../../functions/src/shared/generated/getProgramVendorRunSheetCallablePayload";
import type {ProgramAssetUploadCallableResponse} from "../../../../functions/src/shared/generated/programAssetUploadCallableResponse";
import type {ProgramDriverTripCallableResponse} from "../../../../functions/src/shared/generated/programDriverTripCallableResponse";
import type {ProgramFamilyViewCallableResponse} from "../../../../functions/src/shared/generated/programFamilyViewCallableResponse";
import type {ProgramGuestIdCallableResponse} from "../../../../functions/src/shared/generated/programGuestIdCallableResponse";
import type {ProgramGuestIdStatusCallableResponse} from "../../../../functions/src/shared/generated/programGuestIdStatusCallableResponse";
import type {ProgramHamperCallableResponse} from "../../../../functions/src/shared/generated/programHamperCallableResponse";
import type {ProgramHamperWebViewCallableResponse} from "../../../../functions/src/shared/generated/programHamperWebViewCallableResponse";
import type {ProgramHotelHandoverCallableResponse} from "../../../../functions/src/shared/generated/programHotelHandoverCallableResponse";
import type {ProgramHouseholdRsvpViewCallableResponse} from "../../../../functions/src/shared/generated/programHouseholdRsvpViewCallableResponse";
import type {ProgramVendorRunSheetCallableResponse} from "../../../../functions/src/shared/generated/programVendorRunSheetCallableResponse";
import type {SubmitProgramGuestIdCallablePayload} from "../../../../functions/src/shared/generated/submitProgramGuestIdCallablePayload";
import type {SubmitProgramHouseholdRsvpCallablePayload} from "../../../../functions/src/shared/generated/submitProgramHouseholdRsvpCallablePayload";
import type {SubmitProgramHouseholdRsvpCallableResponse} from "../../../../functions/src/shared/generated/submitProgramHouseholdRsvpCallableResponse";
import type {UpsertProgramHamperCallablePayload} from "../../../../functions/src/shared/generated/upsertProgramHamperCallablePayload";
import {eventRuntimeFirebaseConfigured, firebaseConfig as config} from "../../firebaseConfig";
import {invokeWebsiteCallable} from "./runtime";

/**
 * Programme guest links: household RSVPs, guest IDs, hotel, driver, vendor, family and hamper views.
 */
export async function getProgramHouseholdRsvpView(
  payload: GetProgramHouseholdRsvpViewCallablePayload
): Promise<ProgramHouseholdRsvpViewCallableResponse> {
  return invokeWebsiteCallable("getProgramHouseholdRsvpView", payload,
    eventRuntimeFirebaseConfigured, "Household RSVP");
}

export async function submitProgramHouseholdRsvp(
  payload: SubmitProgramHouseholdRsvpCallablePayload
): Promise<SubmitProgramHouseholdRsvpCallableResponse> {
  return invokeWebsiteCallable("submitProgramHouseholdRsvp", payload,
    eventRuntimeFirebaseConfigured, "Household RSVP");
}

/**
 * Absolute URL for the server-generated household itinerary feed. The token
 * rides in the query string of a plain navigation/download, matching how
 * calendar clients fetch webcal URLs; it is never embedded in page state or
 * analytics.
 */
export function programHouseholdItineraryIcsUrl(token: string): string | null {
  const projectId = config?.projectId;
  if (!projectId) return null;
  return `https://asia-south1-${projectId}.cloudfunctions.net/` +
    `programHouseholdItineraryIcs?token=${encodeURIComponent(token)}`;
}

/** The programme's token links (P4.10): each read takes the link's own signed token. */
export type {
  ProgramAssetUploadCallableResponse,
  ProgramDriverTripCallableResponse,
  ProgramFamilyViewCallableResponse,
  ProgramGuestIdStatusCallableResponse,
  ProgramHamperWebViewCallableResponse,
  ProgramHotelHandoverCallableResponse,
  ProgramHouseholdRsvpViewCallableResponse,
  ProgramVendorRunSheetCallableResponse,
  SubmitProgramGuestIdCallablePayload,
  UpsertProgramHamperCallablePayload,
};

export async function getProgramGuestIdStatus(
  payload: GetProgramGuestIdStatusCallablePayload
): Promise<ProgramGuestIdStatusCallableResponse> {
  return invokeWebsiteCallable("getProgramGuestIdStatus", payload,
    eventRuntimeFirebaseConfigured, "Programme links");
}

export async function createProgramAssetUpload(
  payload: CreateProgramAssetUploadCallablePayload
): Promise<ProgramAssetUploadCallableResponse> {
  return invokeWebsiteCallable("createProgramAssetUpload", payload,
    eventRuntimeFirebaseConfigured, "Programme links");
}

/** POSTs one file to the signed policy createProgramAssetUpload returned. */
export async function uploadProgramAsset(
  intent: ProgramAssetUploadCallableResponse,
  file: Blob
): Promise<void> {
  const body = new FormData();
  for (const [key, value] of Object.entries(intent.uploadFields)) {
    body.append(key, value);
  }
  body.append("file", file);
  const response = await fetch(intent.uploadUrl, {method: "POST", body});
  if (!response.ok) {
    throw new Error("The secure file upload failed. Please try again.");
  }
}

export async function submitProgramGuestId(
  payload: SubmitProgramGuestIdCallablePayload
): Promise<ProgramGuestIdCallableResponse> {
  return invokeWebsiteCallable("submitProgramGuestId", payload,
    eventRuntimeFirebaseConfigured, "Programme links");
}

export async function getProgramHotelHandover(
  payload: GetProgramHotelHandoverCallablePayload
): Promise<ProgramHotelHandoverCallableResponse> {
  return invokeWebsiteCallable("getProgramHotelHandover", payload,
    eventRuntimeFirebaseConfigured, "Programme links");
}

export async function getProgramDriverTrip(
  payload: GetProgramDriverTripCallablePayload
): Promise<ProgramDriverTripCallableResponse> {
  return invokeWebsiteCallable("getProgramDriverTrip", payload,
    eventRuntimeFirebaseConfigured, "Programme links");
}

export async function getProgramVendorRunSheet(
  payload: GetProgramVendorRunSheetCallablePayload
): Promise<ProgramVendorRunSheetCallableResponse> {
  return invokeWebsiteCallable("getProgramVendorRunSheet", payload,
    eventRuntimeFirebaseConfigured, "Programme links");
}

export async function getProgramFamilyView(
  payload: GetProgramFamilyViewCallablePayload
): Promise<ProgramFamilyViewCallableResponse> {
  return invokeWebsiteCallable("getProgramFamilyView", payload,
    eventRuntimeFirebaseConfigured, "Programme links");
}

export async function getProgramHamperWebView(
  payload: GetProgramHamperWebViewCallablePayload
): Promise<ProgramHamperWebViewCallableResponse> {
  return invokeWebsiteCallable("getProgramHamperWebView", payload,
    eventRuntimeFirebaseConfigured, "Programme links");
}

export async function upsertProgramHamper(
  payload: UpsertProgramHamperCallablePayload
): Promise<ProgramHamperCallableResponse> {
  return invokeWebsiteCallable("upsertProgramHamper", payload,
    eventRuntimeFirebaseConfigured, "Programme links");
}
