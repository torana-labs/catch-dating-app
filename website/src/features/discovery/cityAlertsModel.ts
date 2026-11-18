import {cityAlertsCopy as copy} from "@content/discovery/cityAlerts";
import {websiteCities} from "@content/markets";
import type {WebsiteLeadAnswers, WebsiteLeadForm} from "../../shared/api/websiteLead";
import type {HomeFormat} from "../home/homeTypes";
import type {DiscoveryFormatKey} from "./discoveryTypes";

/** A format chip of the city_alerts lead: what kinds of plan the person wants to hear about. */
export type CityAlertInterest = WebsiteLeadAnswers["city_alerts"]["interests"][number];

/**
 * The lead's interest for each city-by-format page. Racket sports share one
 * chip; outdoors has none in the contract, so its page sends no interest
 * (an empty list is valid) rather than a wrong one.
 */
const interestByDiscoveryFormat: Readonly<Record<DiscoveryFormatKey, CityAlertInterest | null>> = {
  runClubs: "runs", racketSports: "courts", pickleball: "courts", padel: "courts", tennis: "courts", badminton: "courts",
  supper: "dinners", quizNights: "quizzes", nightlife: "nights_out", studios: "fitness", workshops: "workshops", books: "books",
  outdoors: null,
};

/** Explore's format filter as an interest; every format (or other) sends none. */
const interestByHomeFormat: Readonly<Record<HomeFormat, CityAlertInterest | null>> = {
  run: "runs", dinner: "dinners", games: "quizzes", courts: "courts", nightsOut: "nights_out", other: null,
};

const order: readonly CityAlertInterest[] = ["runs", "courts", "dinners", "quizzes", "nights_out", "fitness", "workshops", "books"];

/** The interests for a set of city-by-format formats, each once, in the contract's order. */
export function cityAlertInterests(formats: readonly DiscoveryFormatKey[]): CityAlertInterest[] {
  const chosen = new Set(formats.map((format) => interestByDiscoveryFormat[format]));
  return order.filter((interest) => chosen.has(interest));
}

/** Explore's interest for its format filter. */
export function exploreAlertInterests(format: HomeFormat | "all"): CityAlertInterest[] {
  const interest = format === "all" ? null : interestByHomeFormat[format];
  return interest ? [interest] : [];
}

/** Where the form sits: the city, the page path and which form on it (the board's form id). */
export interface CityAlertPlace {
  readonly citySlug: string;
  readonly cityLabel: string;
  readonly sourcePage: string;
  readonly entry: string;
}

/**
 * The lead client's city_alerts form: the number as typed, the cityNewPlans
 * consent wording's version, the page and form, and the interests. A listed
 * city also sends its catalog id and country so the lead counts by city.
 */
export function cityAlertForm(place: CityAlertPlace, phone: string, interests: readonly CityAlertInterest[]): WebsiteLeadForm<"city_alerts"> {
  const listed = websiteCities.find((item) => item.slug === place.citySlug);
  return {
    kind: "city_alerts",
    phone,
    consentVersion: copy.consentVersion,
    sourcePage: place.sourcePage,
    entry: place.entry,
    answers: {interests: [...interests]},
    city: place.cityLabel,
    ...(listed ? {cityId: listed.id, countryIsoCode: listed.countryIsoCode} : {}),
  };
}
