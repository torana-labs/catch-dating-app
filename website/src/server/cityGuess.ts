import {websiteCities, websiteCountries} from "../content/markets";
import {approximatePoint, nearestCity} from "../content/markets/nearestCity";
import type {MarketCity} from "../content/markets/types";

/**
 * Network-location headers the site can read. Cloudflare, in front of
 * Firebase Hosting, always sends CF-IPCountry. The city, region and
 * coordinate headers come only from Cloudflare's "Add visitor location
 * headers" managed transform, which tool/cloudflare/edge_policy.json does not
 * enable, and Firebase Hosting adds no location headers of its own. The
 * Fastly hop between them is not measured to forward any of these, so every
 * one is optional. See docs/marketing_website_architecture.md (City guess).
 */
export const cityGuessHeaders = {
  country: "cf-ipcountry",
  latitude: "cf-iplatitude",
  longitude: "cf-iplongitude",
  city: "cf-ipcity",
  region: "cf-region-code",
} as const;

/** Header names worth reporting when measuring what reaches Cloud Run. */
const measuredHeaders = [...Object.values(cityGuessHeaders), "x-appengine-country", "x-appengine-city",
  "x-appengine-citylatlong", "x-client-geo-location", "x-client-region", "x-client-city"];

export interface CityGuess {
  /** The guessed catalog city, or null for "Other". */
  readonly cityId: string | null;
  readonly slug: string | null;
  /** The visitor's country, when the network says. */
  readonly countryIsoCode: string | null;
  /** What the guess rested on, for measurement only. */
  readonly basis: "coordinates" | "city_name" | "country_default" | "none";
}

// Cloudflare's codes for an unknown country and Tor.
const unknownCountries = new Set(["XX", "T1"]);

function countryFrom(headers: Headers): string | null {
  const value = headers.get(cityGuessHeaders.country)?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/u.test(value) && !unknownCountries.has(value) ? value : null;
}

function byName(cities: readonly MarketCity[], name: string, country: string | null) {
  const wanted = name.trim().toLocaleLowerCase("en");
  if (!wanted) return null;
  return cities.find((city) => (country === null || city.countryIsoCode === country) &&
    [city.label, ...city.aliases].some((alias) => alias.toLocaleLowerCase("en") === wanted)) ?? null;
}

const guessFor = (city: MarketCity | null, countryIsoCode: string | null, basis: CityGuess["basis"]): CityGuess =>
  ({cityId: city?.id ?? null, slug: city?.slug ?? null, countryIsoCode, basis});

/**
 * An approximate city from the request's network location: the nearest listed
 * city to the network's coordinates, then a listed city the network names,
 * then the country's default city if the website lists it. Anything else is
 * "Other" (null), and the page keeps its default city. Coordinates are read
 * and dropped here; only the city leaves.
 */
export function guessCity(headers: Headers, cities: readonly MarketCity[] = websiteCities): CityGuess {
  const country = countryFrom(headers);
  const point = approximatePoint(headers.get(cityGuessHeaders.latitude), headers.get(cityGuessHeaders.longitude));
  if (point) return guessFor(nearestCity(cities, point), country, "coordinates");
  const named = byName(cities, headers.get(cityGuessHeaders.city) ?? "", country);
  if (named) return guessFor(named, country, "city_name");
  const defaultId = websiteCountries.find((item) => item.isoCode === country)?.defaultMarketId;
  const fallback = cities.find((city) => city.id === defaultId) ?? null;
  return guessFor(fallback, country, fallback ? "country_default" : "none");
}

const reported = new Set<string>();

/**
 * Logs, once per server instance for each distinct set, which location header
 * names reached Cloud Run and what the guess rested on. Header values are
 * never logged.
 */
export function reportCityGuessHeaders(headers: Headers, guess: CityGuess, log: (line: string) => void = console.info) {
  const present = measuredHeaders.filter((name) => headers.has(name));
  const signature = `${present.join(",")}|${guess.basis}`;
  if (reported.has(signature)) return;
  reported.add(signature);
  log(JSON.stringify({event: "website_city_guess_headers", present, basis: guess.basis}));
}
