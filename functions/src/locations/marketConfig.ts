import {canonicalMarketRecords} from "../shared/generated/marketCatalog";

export type LaunchMarketStatus = "launched" | "planned" | "paused" |
  "retired";

export interface CanonicalMarket {
  marketId: string;
  cityId: string;
  slug: string;
  label: string;
  cityLabel: string;
  regionCode: string;
  regionName: string;
  countryIsoCode: string;
  countryName: string;
  currencyCode: string;
  dialCode: string;
  timeZone: string;
  latitude: number;
  longitude: number;
  aliases: string[];
  launchStatus: LaunchMarketStatus;
  profileSelectable: boolean;
  hostCreatable: boolean;
  eventCreatable: boolean;
  exploreVisible: boolean;
}

// Generated from contracts/catalogs/markets.json. Edit the catalog, then run
// node tool/contracts/generate_market_catalog.mjs.
const marketEntries: CanonicalMarket[] = canonicalMarketRecords.map(
  (entry) => ({...entry, aliases: [...entry.aliases]})
);

export const canonicalMarkets = Object.freeze(marketEntries);
export const launchedMarketIds = Object.freeze(
  marketEntries
    .filter((entry) => entry.launchStatus === "launched")
    .map((entry) => entry.marketId)
);

const marketById = new Map(
  marketEntries.map((entry) => [entry.marketId, entry])
);
const marketIdByAlias = new Map<string, string>();
for (const entry of marketEntries) {
  for (const alias of [
    entry.marketId,
    entry.cityId,
    entry.slug,
    ...entry.aliases,
  ]) {
    marketIdByAlias.set(slugifyLocationKey(alias), entry.marketId);
  }
}

export function normalizeMarketId(value: string | null | undefined):
  string | null {
  const normalized = slugifyLocationKey(value ?? "");
  if (normalized.length === 0) return null;
  return marketIdByAlias.get(normalized) ?? normalized;
}

export function marketForIdOrAlias(value: string | null | undefined):
  CanonicalMarket | null {
  const marketId = normalizeMarketId(value);
  return marketId == null ? null : marketById.get(marketId) ?? null;
}

export function requireKnownMarket(value: string | null | undefined):
  CanonicalMarket | null {
  const market = marketForIdOrAlias(value);
  return market ?? null;
}

function slugifyLocationKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
