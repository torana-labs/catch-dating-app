import {
  generatedLaunchMarkets,
  generatedMarketCities,
} from "./generated/marketCatalog";

/**
 * Live cities, generated from contracts/catalogs/markets.json. Edit the
 * catalog, then run node tool/contracts/generate_market_catalog.mjs.
 */
export const launchMarkets = generatedLaunchMarkets;

export type LaunchMarket = typeof launchMarkets[number];
export const launchMarketSlugs =
  launchMarkets.map((market) => market.publicPageCitySlug);

export const launchMarketSlugSet = new Set<string>(launchMarketSlugs);

export function isLaunchMarketSlug(value: string | null | undefined): boolean {
  return value != null && launchMarketSlugSet.has(value);
}

export function launchMarketForId(
  value: string | null | undefined
): LaunchMarket | null {
  return launchMarkets.find((market) => market.id === value) ?? null;
}

export type MarketCity = typeof generatedMarketCities[number];

function normalizeMarketKey(value: string): string {
  return value.trim().toLowerCase().replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const marketCityByKey = new Map<string, MarketCity>(
  generatedMarketCities.flatMap((city) => [
    city.marketId, city.cityId, city.slug, ...city.aliases, ...city.legacyIds,
  ].map((key) => [normalizeMarketKey(key), city] as const))
);

/** Resolves a market id, city id, slug, alias or legacy id to its city. */
export function marketCityFor(
  value: string | null | undefined
): MarketCity | null {
  if (value == null) return null;
  return marketCityByKey.get(normalizeMarketKey(value)) ?? null;
}

/** The catalog label for a market key, or the key in title case. */
export function marketLabel(value: string): string {
  return marketCityFor(value)?.label ??
    value.charAt(0).toUpperCase() + value.slice(1);
}
