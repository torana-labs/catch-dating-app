// The flat market records tools and config/cities use, derived from
// contracts/catalogs/markets.json. Edit the catalog, never this file.
import {
  assertValidMarketCatalog,
  canonicalMarketsFromCatalog,
  countryRecordsFromCatalog,
  readMarketCatalog,
  slugifyLocationKey,
} from "./market_catalog.mjs";

export {slugifyLocationKey};

const catalog = assertValidMarketCatalog(readMarketCatalog());

export const canonicalMarketsVersion = catalog.configCitiesVersion;

export const canonicalMarkets = canonicalMarketsFromCatalog(catalog);

export const launchedMarketIds = canonicalMarkets
  .filter((entry) => entry.launchStatus === "launched")
  .map((entry) => entry.marketId);

export const marketById = new Map(
  canonicalMarkets.map((entry) => [entry.marketId, entry])
);

export const marketIdByAlias = new Map(
  canonicalMarkets.flatMap((entry) => [
    [entry.marketId, entry.marketId],
    [entry.cityId, entry.marketId],
    [entry.slug, entry.marketId],
    ...entry.aliases.map((alias) => [alias, entry.marketId]),
  ])
);

export function normalizeMarketId(value) {
  if (typeof value !== "string") return null;
  const normalized = slugifyLocationKey(value);
  if (normalized.length === 0) return null;
  return marketIdByAlias.get(normalized) ?? normalized;
}

export function marketForIdOrAlias(value) {
  const marketId = normalizeMarketId(value);
  return marketId ? marketById.get(marketId) ?? null : null;
}

export function configCitiesDocument() {
  const launchMarkets = canonicalMarkets.filter((entry) =>
    launchedMarketIds.includes(entry.marketId)
  );
  return {
    version: canonicalMarketsVersion,
    cityNames: launchedMarketIds,
    marketIds: canonicalMarkets.map((entry) => entry.marketId),
    launchMarketIds: launchedMarketIds,
    cities: launchMarkets.map(cityDataFromMarket),
    markets: canonicalMarkets.map((entry) => ({...entry})),
    countries: countryRecordsFromCatalog(catalog),
  };
}

function cityDataFromMarket(entry) {
  return {
    name: entry.marketId,
    cityId: entry.cityId,
    marketId: entry.marketId,
    slug: entry.slug,
    label: entry.label,
    latitude: entry.latitude,
    longitude: entry.longitude,
    countryIsoCode: entry.countryIsoCode,
    currencyCode: entry.currencyCode,
    dialCode: entry.dialCode,
    timeZone: entry.timeZone,
    launchStatus: entry.launchStatus,
    profileSelectable: entry.profileSelectable,
    hostCreatable: entry.hostCreatable,
    eventCreatable: entry.eventCreatable,
    exploreVisible: entry.exploreVisible,
    lifecycle: entry.lifecycle,
    websiteListed: entry.websiteListed,
    ...(entry.launchDate === undefined ? {} : {launchDate: entry.launchDate}),
  };
}
