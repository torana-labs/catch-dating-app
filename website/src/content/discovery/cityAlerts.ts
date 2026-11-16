/**
 * The "Get new plans in {city} on WhatsApp" capture on Explore, the city
 * pages and the discovery pages. It sends a `city_alerts` website lead
 * (contracts/http/join_waitlist_request.schema.json): the number, the city
 * and the formats the page is about, under the cityNewPlans consent. Staff
 * reply first; nothing is sent automatically until the WhatsApp templates
 * are approved, so the confirmation says a person replies.
 */
export const cityAlertsCopy = {
  kicker: "Hear about new plans first",
  title: "Get new plans in {city} on WhatsApp.",
  lead: "About once a week. Stop any time.",
  phone: "Your WhatsApp number",
  action: "Notify me",
  consent: "Tapping Notify me means you agree to get new plans in {city} on WhatsApp, about once a week. You can stop any time.",
  /** Names this wording on every stored consent; change it whenever the consent wording changes. */
  consentVersion: "city-new-plans-whatsapp-v1",
  privacy: "Privacy policy",
  invalidPhone: "Enter your 10-digit mobile number.",
  failed: "That didn’t go through. Please try again in a moment.",
  sent: "Done. We reply on WhatsApp, usually within an hour.",
} as const;
