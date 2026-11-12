import {generatedLaunchMarkets} from "./generated/marketCatalog";

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
