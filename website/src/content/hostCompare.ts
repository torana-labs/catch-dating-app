import {brand} from "./brand.ts";
import {interpolateContent as fill} from "./interpolate.ts";
import {inMarket as activeMarket} from "./markets/in.ts";
import {hostPricingFacts} from "./pricing.ts";

/**
 * How we compare with what hosts use today: the full table on the pricing
 * page (#compare), shown as our column beside one tool the reader picks. Every
 * cell comes from the named company's own pages; "Not published" means no
 * public statement was found, not that the feature is missing. Update
 * `checked` whenever a cell is re-checked.
 */

/** A comparison cell: its text, and whether it is a plain yes, a plain no or not published. */
export interface HostCompareCell {
  text: string;
  status?: "yes" | "no" | "unknown";
}

const facts = hostPricingFacts;
const liveCities = new Intl.ListFormat(activeMarket.locale, {style: "long", type: "conjunction"}).format(activeMarket.cities.filter((city) => city.status === "live").map((city) => city.label));
const yes: HostCompareCell = {text: "Yes", status: "yes"};
const no: HostCompareCell = {text: "No", status: "no"};
const notPublished: HostCompareCell = {text: "Not published", status: "unknown"};

export const hostCompareCopy = {
  kicker: "Compare",
  title: `How ${brand.name} compares with what hosts use today.`,
  body: "Most hosts start on WhatsApp, Google Forms and UPI screenshots. Others use Luma, District or Meetup. Here’s what each one does, taken from their own pages.",
  rowHeader: "What you need",
  columns: [brand.name, "WhatsApp, Forms and UPI", "Luma", "District", "Meetup"],
  rows: [
    {label: "Free events stay free", cells: [yes, yes, yes, notPublished, {text: "Organiser subscription", status: "no"}]},
    {label: "Fee on paid tickets", cells: [
      {text: fill("{rate}, never more than {cap} a month", {rate: facts.rate, cap: facts.cap})},
      {text: "None, but you chase every payment"},
      {text: "5% (0% on a US$59-a-month plan), plus card fees"},
      {text: "Negotiated per event; no public rate"},
      {text: "A service fee for attendees, plus your subscription"},
    ]},
    {label: "Paid in rupees, by UPI", cells: [yes, {text: "Screenshots to match"}, {text: "No: can’t pay hosts based in India", status: "no"}, yes, {text: "Not documented for India", status: "unknown"}]},
    {label: "Applications and waitlists", cells: [{text: "Yes, with waitlist backfill", status: "yes"}, {text: "By hand", status: "no"}, yes, notPublished, {text: "Waitlists on free events only"}]},
    {label: "Check-in at the door", cells: [{text: "QR or self check-in, phone or iPad", status: "yes"}, {text: "A printed list", status: "no"}, {text: "QR in the Luma app"}, notPublished, {text: "QR tickets"}]},
    {label: "Runs the night: pace groups, teams, seating, court rotations", cells: [{text: "Yes, for each format", status: "yes"}, no, no, no, no]},
    {label: "A first hello for every newcomer", cells: [yes, no, no, no, no]},
    {label: "Every guest remembered across events", cells: [yes, {text: "In your head", status: "no"}, {text: "Partly: calendar subscribers"}, {text: "The platform keeps them", status: "no"}, {text: "Group members"}]},
    {label: "Helps people find you", cells: [{text: fill("Growing: {cities}", {cities: liveCities}), status: "yes"}, no, {text: "Small audience in India"}, {text: "A large going-out marketplace"}, {text: "Interest groups"}]},
  ] satisfies readonly {label: string; cells: readonly HostCompareCell[]}[],
  checked: "Checked on 15 Nov 2026",
  source: "From each company’s own pages. Meetup cells and District’s payout cell come from search results. “Not published” means we found no public statement, not that the feature is missing.",
  /** The words before the chips that pick the tool shown beside ours. */
  compareWith: `Compare ${brand.name} with`,
} as const;
