import {brand} from "../brand.ts";

/**
 * The closing "Get new plans in {city} on WhatsApp" band on Explore, the
 * city pages and the discovery pages (the kit's KitFinal). Website leads
 * need App Check and the site has no lead client yet, so, as on every
 * playbook page, the band opens a WhatsApp chat that names the city and what
 * the person wants to hear about, and a person replies. The city_alerts lead
 * form replaces the button once the lead client ships.
 */
export const cityAlertsCopy = {
  kicker: "Hear about new plans first",
  title: "Get new plans in {city} on WhatsApp.",
  lead: "Message us and we’ll send you new plans in {city} as hosts add them. Stop any time.",
  action: "Message us on WhatsApp",
  /** The messages the button types for the person: any plan, one format's (`{plans}`, such as runs) or a newcomer's. */
  message: `Hi ${brand.name}, please send me new plans in {city}.`,
  formatMessage: `Hi ${brand.name}, please send me new {plans} in {city}.`,
  newcomerMessage: `Hi ${brand.name}, I’m new to {city}. Please send me plans that are good for coming on my own.`,
} as const;
