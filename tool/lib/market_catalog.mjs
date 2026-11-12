// Reads contracts/catalogs/markets.json, the one source of truth for the
// countries and cities Catch serves, and derives the shapes its consumers use.
// It needs no installed packages: website scripts and demo tools import it.
// tool/contracts/generate_market_catalog.mjs adds JSON Schema validation and
// writes the generated copies for runtimes that cannot read this file.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const libDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(libDir, "../..");
export const marketCatalogPath = "contracts/catalogs/markets.json";
export const marketCatalogSchemaPath =
  "contracts/shared/market_catalog.schema.json";

export const cityLifecycles = Object.freeze([
  "hidden",
  "waitlist",
  "launching",
  "live",
  "paused",
]);

export const appSurfaceFlags = Object.freeze([
  "profileSelectable",
  "hostCreatable",
  "eventCreatable",
  "exploreVisible",
]);

export function readMarketCatalog(root = repoRoot) {
  return JSON.parse(
    fs.readFileSync(path.join(root, marketCatalogPath), "utf8")
  );
}

export function slugifyLocationKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The value apps and config/cities have always carried. Only a live city is
 * launched, so the app surfaces behave exactly as they did before lifecycles.
 */
export function launchStatusForLifecycle(lifecycle) {
  if (lifecycle === "live") return "launched";
  if (lifecycle === "paused") return "paused";
  return "planned";
}

/** Cross-record rules a JSON Schema cannot express. Returns error strings. */
export function marketCatalogErrors(catalog) {
  const errors = [];
  const countries = new Map();
  for (const country of catalog.countries ?? []) {
    if (countries.has(country.isoCode)) {
      errors.push(`Duplicate country ${country.isoCode}.`);
    }
    countries.set(country.isoCode, country);
    if (!isTimeZone(country.timeZone)) {
      errors.push(`${country.isoCode}: unknown time zone ${country.timeZone}.`);
    }
  }
  if (!countries.has(catalog.defaultCountryIsoCode)) {
    errors.push(
      `defaultCountryIsoCode ${catalog.defaultCountryIsoCode} is not a country.`
    );
  }

  const owners = new Map();
  const claim = (key, marketId, what) => {
    const owner = owners.get(key);
    if (owner && owner !== marketId) {
      errors.push(`${what} "${key}" of ${marketId} already names ${owner}.`);
    }
    owners.set(key, marketId);
  };
  const marketIds = new Set();
  for (const city of catalog.cities ?? []) {
    const id = city.marketId;
    if (marketIds.has(id)) errors.push(`Duplicate marketId ${id}.`);
    marketIds.add(id);
    claim(id, id, "marketId");
    claim(city.cityId, id, "cityId");
    claim(city.slug, id, "slug");
    for (const alias of city.aliases ?? []) claim(alias, id, "alias");
    for (const legacyId of city.legacyIds ?? []) claim(legacyId, id, "legacyId");

    const country = countries.get(city.countryIsoCode);
    if (!country) {
      errors.push(`${id}: unknown country ${city.countryIsoCode}.`);
    }
    const prefix = `${String(city.countryIsoCode).toLowerCase()}-`;
    if (!id.startsWith(prefix) || !city.cityId.startsWith(prefix)) {
      errors.push(`${id}: marketId and cityId must start with ${prefix}.`);
    }
    if (!isTimeZone(city.timeZone)) {
      errors.push(`${id}: unknown time zone ${city.timeZone}.`);
    }
    if (!cityLifecycles.includes(city.lifecycle)) {
      errors.push(`${id}: unknown lifecycle ${city.lifecycle}.`);
    }
    const surfaces = city.surfaces ?? {};
    if (city.lifecycle !== "live") {
      for (const flag of appSurfaceFlags) {
        if (surfaces[flag]) {
          errors.push(`${id}: ${flag} needs lifecycle live, not ${city.lifecycle}.`);
        }
      }
    }
    if (city.lifecycle === "hidden" && surfaces.websiteListed) {
      errors.push(`${id}: a hidden city cannot be websiteListed.`);
    }
    if (city.launchDate !== undefined && city.lifecycle !== "launching") {
      errors.push(`${id}: launchDate is only for a launching city.`);
    }
    if (city.launchDate !== undefined && !isCalendarDate(city.launchDate)) {
      errors.push(`${id}: launchDate ${city.launchDate} is not a real date.`);
    }
  }

  for (const country of countries.values()) {
    const city = (catalog.cities ?? []).find(
      (entry) => entry.marketId === country.defaultMarketId
    );
    if (!city) {
      errors.push(
        `${country.isoCode}: defaultMarketId ${country.defaultMarketId} ` +
        "is not a city."
      );
    } else if (city.countryIsoCode !== country.isoCode) {
      errors.push(
        `${country.isoCode}: defaultMarketId ${country.defaultMarketId} ` +
        "is in another country."
      );
    }
  }
  return errors;
}

export function assertValidMarketCatalog(catalog) {
  const errors = marketCatalogErrors(catalog);
  if (errors.length > 0) {
    throw new Error(`Invalid ${marketCatalogPath}:\n${errors.join("\n")}`);
  }
  return catalog;
}

/**
 * The flat market record Functions, demo tools and config/cities use. The
 * first twenty fields are the ones every reader has always had; lifecycle,
 * websiteListed and launchDate follow, so older readers can ignore them.
 */
export function canonicalMarketsFromCatalog(catalog) {
  const countries = new Map(
    catalog.countries.map((country) => [country.isoCode, country])
  );
  return catalog.cities.map((city) => {
    const country = countries.get(city.countryIsoCode);
    return {
      marketId: city.marketId,
      cityId: city.cityId,
      slug: city.slug,
      label: city.label,
      cityLabel: city.cityLabel,
      regionCode: city.regionCode,
      regionName: city.regionName,
      countryIsoCode: city.countryIsoCode,
      countryName: country.name,
      currencyCode: country.currencyCode,
      dialCode: country.dialCode,
      timeZone: city.timeZone,
      latitude: city.latitude,
      longitude: city.longitude,
      aliases: Array.from(new Set(city.aliases.map(slugifyLocationKey))),
      launchStatus: launchStatusForLifecycle(city.lifecycle),
      profileSelectable: city.surfaces.profileSelectable,
      hostCreatable: city.surfaces.hostCreatable,
      eventCreatable: city.surfaces.eventCreatable,
      exploreVisible: city.surfaces.exploreVisible,
      lifecycle: city.lifecycle,
      websiteListed: city.surfaces.websiteListed,
      ...(city.launchDate === undefined ? {} : {launchDate: city.launchDate}),
    };
  });
}

/** Country records as config/cities and the generated copies carry them. */
export function countryRecordsFromCatalog(catalog) {
  return catalog.countries.map((country) => ({
    isoCode: country.isoCode,
    name: country.name,
    currencyCode: country.currencyCode,
    currencySymbol: country.currencySymbol,
    dialCode: country.dialCode,
    locale: country.locale,
    timeZone: country.timeZone,
    appStoreCountryCodes: [...country.appStoreCountryCodes],
    defaultMarketId: country.defaultMarketId,
  }));
}

function isTimeZone(value) {
  if (typeof value !== "string") return false;
  try {
    new Intl.DateTimeFormat("en", {timeZone: value});
    return true;
  } catch {
    return false;
  }
}

function isCalendarDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}
