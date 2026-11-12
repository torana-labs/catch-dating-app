import {generatedWebsiteCities, generatedWebsiteCountries} from "./generated/catalog";
import {inMarket} from "./in";
import type {MarketCity} from "./types";
import {interpolateContent} from "../interpolate";

export const activeMarket = inMarket;

/** Every city the website lists, in every country, in catalog order. */
export const websiteCities: readonly MarketCity[] = generatedWebsiteCities;

/** The countries in the market catalog, in catalog order. */
export const websiteCountries = generatedWebsiteCountries;

/** A country's name from its ISO code, or the code itself. */
export function countryName(isoCode: string): string {
  return websiteCountries.find((country) => country.isoCode === isoCode)?.name ?? isoCode;
}

export const activeEventLiveCities = activeMarket.cities.filter(
  (city) => city.status === "live"
);

export const activeHostApplicationCityOptions = [
  ...activeMarket.cities.map((city) => city.label),
  activeMarket.otherCityOptionLabel,
];

export const activeFeaturedCity = activeMarket.cities.find(
  (city) => city.id === activeMarket.featuredCityId
)!;

const liveCityList = activeEventLiveCities.map((city) => city.label);

export const activeMarketCopy = {
  heroEyebrow: interpolateContent(activeMarket.heroEyebrowTemplate, {
    cities: liveCityList.join(" · ").toLocaleUpperCase(activeMarket.locale),
  }),
  heroTicketLabel: interpolateContent(activeMarket.heroTicketLabelTemplate, {
    city: activeFeaturedCity.label.toLocaleUpperCase(activeMarket.locale),
  }),
  downloadBody: interpolateContent(activeMarket.downloadBodyTemplate, {
    cities: new Intl.ListFormat(activeMarket.locale, {
      style: "long",
      type: "conjunction",
    }).format(liveCityList),
  }),
} as const;
