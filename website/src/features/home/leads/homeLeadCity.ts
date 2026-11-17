import {websiteCities} from "@content/markets";
import type {CitySource} from "../cityChoice";

/** The city a homepage lead is for: the page's city, and how the site reached it. */
export interface HomeLeadCity {
  readonly label: string;
  readonly slug: string;
  readonly source?: CitySource;
}

/**
 * The lead's city fields: the label as shown, and for a catalog city its id
 * and country and how the site reached it, so the intake counts the city.
 */
export function homeLeadCityFields(city: HomeLeadCity) {
  const listed = websiteCities.find((item) => item.slug === city.slug);
  return {
    city: city.label,
    ...(listed ? {cityId: listed.id, countryIsoCode: listed.countryIsoCode, ...(city.source ? {citySource: city.source} : {})} : {}),
  };
}
