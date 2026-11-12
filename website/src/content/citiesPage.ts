import {brand} from "./brand.ts";

// Copy for /cities/, every city the website lists by country and status.
// Meeting people in real life: no dating, singles, mixer or match wording.
export const citiesPageCopy = {
  eyebrow: "Cities",
  title: `Where ${brand.name} is on`,
  lead: "Open cities show what’s on this week. In the rest, tell us you’re interested and we’ll let you know when your city opens.",
  /** A country with no city open: shown once, above its cities. */
  countrySoon: "Launching soon in {country}",
  open: "Open",
  soon: "Launching soon",
  /** A launching city with a planned date: "Opens 15 January". */
  opens: "Opens {date}",
  seeWhatsOn: "See what’s on",
  getNotified: "Get notified",
  unavailable: "We can’t show cities right now. Please try again in a moment.",
} as const;
