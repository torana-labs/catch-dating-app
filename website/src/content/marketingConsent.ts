import {brand} from "./brand.ts";

export const marketingConsentPreferencesCopy = {
  /**
   * The banner's one line, taken from the statement itself so it claims
   * nothing new; the full statement stays one tap away under Details.
   */
  summary: `Choose which cookies ${brand.name} can use. You can change this any time.`,
  details: "Details",
  body: `Choose essential only, site analytics, or analytics and marketing measurement for ${brand.name}. Site analytics can share page visits and booking steps with Google Analytics using a random identifier and secure cookies for up to 30 days. Marketing measurement also lets Google Ads and Meta tags record the ad that brought you, the pages and booking steps you reach, and accepted bookings and organiser enquiries, and keeps campaign and ad-click details for up to 30 days (Meta's own cookies can last up to 90 days). These tags never receive application answers. Organiser pages may run the organiser's own Meta and Google tags if you accept marketing cookies. Separately, bookings, sign-ups and host setups can be shared with Google and Meta in hashed form whatever you choose here; our privacy policy explains this and how to opt out. You can change or withdraw your choice at any time.`,
  allowAnalytics: "Allow analytics",
  allowMarketing: "Allow analytics and marketing",
  preferences: "Privacy choices",
} as const;
