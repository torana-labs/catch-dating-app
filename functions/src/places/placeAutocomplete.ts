import {onCall} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {requireAuth} from "../shared/auth";
import {normalizePayloadStrings} from "../shared/callablePayloadNormalization";
import type {PlaceDetailsCallablePayload} from
  "../shared/generated/placeDetailsCallablePayload";
import type {PlacesAutocompleteCallablePayload} from
  "../shared/generated/placesAutocompleteCallablePayload";
import {
  validatePlaceDetailsCallablePayload,
} from "../shared/generated/validators/placeDetailsInput";
import {
  validatePlacesAutocompleteCallablePayload,
} from "../shared/generated/validators/placesAutocompleteInput";
import {validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit} from "../shared/rateLimit";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {
  autocompletePlaces,
  getPlaceDetails,
  googleMapsPlacesApiKey,
} from "./googlePlaces";

export const placesAutocomplete = onCall(
  appCheckCallableOptionsWithSecrets([googleMapsPlacesApiKey]),
  async (request) => {
    const userId = requireAuth(request);
    const payload = validateCallableWithAjv<
      PlacesAutocompleteCallablePayload
    >(
      request,
      validatePlacesAutocompleteCallablePayload,
      normalizePlacesAutocompletePayload
    );
    await checkRateLimit(admin.firestore(), userId, "placesAutocomplete", {
      maxRequests: 60, windowMs: 60 * 1000,
    });

    return {
      predictions: await autocompletePlaces(payload),
    };
  }
);

export const placeDetails = onCall(
  appCheckCallableOptionsWithSecrets([googleMapsPlacesApiKey]),
  async (request) => {
    const userId = requireAuth(request);
    const payload = validateCallableWithAjv<PlaceDetailsCallablePayload>(
      request,
      validatePlaceDetailsCallablePayload,
      normalizePlaceDetailsPayload
    );
    await checkRateLimit(admin.firestore(), userId, "placeDetails", {
      maxRequests: 30, windowMs: 60 * 1000,
    });

    return {
      place: await getPlaceDetails(payload),
    };
  }
);

/**
 * Trims Places autocomplete payload text before schema validation.
 * @param {unknown} data Raw callable payload.
 * @return {unknown} Normalized payload.
 */
function normalizePlacesAutocompletePayload(data: unknown): unknown {
  return normalizePayloadStrings(data, {
    stringFields: ["input", "sessionToken", "countryIsoCode"],
  });
}

/**
 * Trims Places details payload text before schema validation.
 * @param {unknown} data Raw callable payload.
 * @return {unknown} Normalized payload.
 */
function normalizePlaceDetailsPayload(data: unknown): unknown {
  return normalizePayloadStrings(data, {
    stringFields: ["placeId", "sessionToken"],
  });
}
