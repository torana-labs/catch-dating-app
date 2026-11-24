import {brand} from "../brand.ts";

/**
 * The "Get new plans in {city} on WhatsApp" capture on Explore, the city
 * pages and the discovery pages (the kit's KitFinal). It sends a
 * `city_alerts` website lead (contracts/http/join_waitlist_request.schema.json)
 * through the site's lead client: the number, the city and the formats the
 * page is about, under the cityNewPlans consent. Staff reply first; nothing
 * is sent automatically until the WhatsApp templates are approved, so the
 * confirmation says a person replies. The lead client words its failures
 * (content/websiteLead.ts).
 */
export const cityAlertsCopy = {
  kicker: "Hear about new plans first",
  title: "Get new plans in {city} on WhatsApp.",
  lead: "We’ll let you know when new plans open.",
  phone: "Your WhatsApp number",
  action: "Get plans",
  consent: `On WhatsApp, from ${brand.name}.`,
  /** Names this wording on every stored consent; change it whenever the consent wording changes. */
  consentVersion: "city-new-plans-whatsapp-v3",
  privacy: "Privacy",
  sent: "Done. We reply on WhatsApp, usually within an hour.",
  /** What the phone action bar's WhatsApp button types: any plan, one format's (`{plans}`, such as runs) or a newcomer's. */
  message: `Hi ${brand.name}, please send me new plans in {city}.`,
  formatMessage: `Hi ${brand.name}, please send me new {plans} in {city}.`,
  newcomerMessage: `Hi ${brand.name}, I’m new to {city}. Please send me plans that are good for coming on my own.`,
} as const;
