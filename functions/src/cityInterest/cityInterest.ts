import {createHash} from "node:crypto";
import * as admin from "firebase-admin";

/**
 * Per-city waitlist interest (city_interest.schema.json). One counter
 * document per city, plus one marker per person and city so asking again
 * for the same city counts once. Both are server-only.
 */
export const CITY_INTEREST_COLLECTION = "cityInterest";
export const CITY_INTEREST_MARKERS_COLLECTION = "cityInterestMarkers";

/**
 * The counter document id: the catalog id, or "other-<country>" for a
 * city the catalog does not have ("other-xx" with no country).
 * @param {string|null} cityId The catalog id, or null.
 * @param {string|null} countryIsoCode The ISO country, if known.
 * @return {string} The cityInterest document id.
 */
export function cityInterestKey(
  cityId: string | null, countryIsoCode: string | null,
): string {
  return cityId ?? `other-${(countryIsoCode ?? "xx").toLowerCase()}`;
}

/**
 * The marker id: a hash, so the person's number or email never appears
 * in it. tool/data/backfill_city_interest.mjs computes the same id.
 * @param {string} personKey The E.164 number or lower-case email.
 * @param {string} key The cityInterest document id.
 * @return {string} The cityInterestMarkers document id.
 */
export function cityInterestMarkerId(personKey: string, key: string): string {
  return createHash("sha256").update(`${personKey}|${key}`).digest("hex");
}

/**
 * A UTC day key, such as 2026-11-12.
 * @param {Date} date The moment.
 * @return {string} The day key.
 */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface CityInterestInput {
  personKey: string;
  cityId: string | null;
  countryIsoCode: string | null;
  now: Date;
}

/**
 * Reads the person's marker inside a transaction, before its writes, and
 * returns the writes that count them once for the city.
 * @param {FirebaseFirestore.Transaction} transaction The transaction.
 * @param {FirebaseFirestore.Firestore} firestore Firestore.
 * @param {CityInterestInput} input Who asked for which city, and when.
 * @return {Promise<function(): boolean>} Applies the writes; true when
 *     this was the person's first request for the city.
 */
export async function prepareCityInterest(
  transaction: FirebaseFirestore.Transaction,
  firestore: FirebaseFirestore.Firestore,
  input: CityInterestInput,
): Promise<() => boolean> {
  const key = cityInterestKey(input.cityId, input.countryIsoCode);
  const markerRef = firestore.collection(CITY_INTEREST_MARKERS_COLLECTION)
    .doc(cityInterestMarkerId(input.personKey, key));
  const marker = await transaction.get(markerRef);
  return () => {
    if (marker.exists) return false;
    const now = admin.firestore.Timestamp.fromDate(input.now);
    transaction.create(markerRef, {schemaVersion: 1, cityKey: key,
      createdAt: now});
    transaction.set(firestore.collection(CITY_INTEREST_COLLECTION).doc(key), {
      schemaVersion: 1,
      cityKey: key,
      cityId: input.cityId,
      countryIsoCode: input.countryIsoCode,
      total: admin.firestore.FieldValue.increment(1),
      daily: {[utcDay(input.now)]: admin.firestore.FieldValue.increment(1)},
      updatedAt: now,
    }, {merge: true});
    return true;
  };
}
