import {canonicalMarkets} from "../locations/marketConfig";

/** How the website reached the city (join_waitlist_request.schema.json). */
export type CitySource = "picked" | "network_guess" | "precise" | "typed";

const citySources = new Set<string>([
  "picked", "network_guess", "precise", "typed",
]);

/** The city a waitlist submission is for, as stored on launchWaitlist. */
export interface CityAttribution {
  /** A market catalog id, or null for a city the catalog does not have. */
  cityId: string | null;
  countryIsoCode: string | null;
  citySource: CitySource | null;
  /** The typed city when cityId is null. */
  cityOther: string | null;
}

export type CityAttributionResult =
  | {kind: "absent"}
  | {kind: "attributed"; value: CityAttribution}
  | {kind: "invalid"; error: string};

const unknownCity = "Please choose your city from the list.";

/**
 * Reads a submission's city attribution. Older clients send only `city`
 * (absent). A cityId must be a catalog market id, and the country is the
 * catalog's; a null cityId needs the typed city in cityOther.
 * @param {Record<string, unknown>} body The parsed request body.
 * @return {CityAttributionResult} The attribution, or why it is invalid.
 */
export function readCityAttribution(
  body: Record<string, unknown>,
): CityAttributionResult {
  if (!("cityId" in body)) return {kind: "absent"};
  const source = typeof body.citySource === "string" &&
    citySources.has(body.citySource) ?
    body.citySource as CitySource : null;
  const country = typeof body.countryIsoCode === "string" &&
    /^[A-Z]{2}$/.test(body.countryIsoCode) ? body.countryIsoCode : null;
  if (body.cityId === null) {
    const other = typeof body.cityOther === "string" ?
      body.cityOther.trim().replace(/\s+/g, " ") : "";
    if (other.length < 2 || other.length > 80) {
      return {kind: "invalid", error: "Please tell us your city."};
    }
    return {kind: "attributed", value: {
      cityId: null, countryIsoCode: country, citySource: source,
      cityOther: other,
    }};
  }
  const market = typeof body.cityId === "string" ?
    canonicalMarkets.find((entry) => entry.marketId === body.cityId) :
    undefined;
  if (!market || market.lifecycle === "hidden") {
    return {kind: "invalid", error: unknownCity};
  }
  if (country !== null && country !== market.countryIsoCode) {
    return {kind: "invalid", error: unknownCity};
  }
  return {kind: "attributed", value: {
    cityId: market.marketId, countryIsoCode: market.countryIsoCode,
    citySource: source, cityOther: null,
  }};
}
