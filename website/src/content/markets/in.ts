import {generatedWebsiteCities, generatedWebsiteCountries} from "./generated/catalog.ts";
import type {MarketPack} from "./types";

const india = generatedWebsiteCountries.find((country) => country.isoCode === "IN")!;

export const inMarket = {
  id: "in",
  countryCode: india.isoCode,
  dialCode: india.dialCode,
  appStoreCountryCodes: india.appStoreCountryCodes,
  locale: india.locale,
  currencyCode: india.currencyCode,
  currencySymbol: india.currencySymbol,
  // Cities and country facts come from contracts/catalogs/markets.json via
  // the generated catalog; edit the catalog, never this list.
  cities: generatedWebsiteCities.filter((city) => city.countryIsoCode === india.isoCode),
  featuredCityId: india.defaultMarketId,
  otherCityOptionLabel: "Other",
  heroEyebrowTemplate: "LIVE IN {cities}",
  heroTicketLabelTemplate: "THIS WEEK IN {city}",
  downloadBodyTemplate:
    "Download the app to see this week's events in {cities}. More cities soon.",
  comparisonColumns: [
    "Catch",
    "Luma",
    "Eventbrite",
    "District",
    "BookMyShow",
    "Instagram + WhatsApp",
    "Forms + sheets",
  ],
  exampleEvent: {
    name: "Sunday Table Club",
    venue: "Pali Village Cafe",
    cityId: india.defaultMarketId,
    timezone: "Asia/Kolkata",
    currencyCode: "INR",
  },
} satisfies MarketPack;
