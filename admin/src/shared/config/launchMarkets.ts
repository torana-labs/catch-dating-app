export const launchMarkets = [
  {
    id: "in-mh-mumbai",
    label: "Mumbai · Maharashtra",
    cityName: "Mumbai",
    regionName: "Maharashtra",
    countryCode: "IN",
    countryName: "India",
    publicPageCitySlug: "mumbai",
  },
  {
    id: "in-mp-indore",
    label: "Indore · Madhya Pradesh",
    cityName: "Indore",
    regionName: "Madhya Pradesh",
    countryCode: "IN",
    countryName: "India",
    publicPageCitySlug: "indore",
  },
] as const;

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
