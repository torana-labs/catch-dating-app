import {brand} from "./brand.ts";

export const marketingConsentPreferencesCopy = {
  body: `Choose essential only, site analytics, or analytics and marketing measurement for ${brand.name}. Site analytics can share page visits and application events with Google Analytics using a random identifier and secure cookies on a separate ${brand.name} measurement site for up to 30 days. With your permission, campaign and ad-click attribution can be retained for up to 30 days. Marketing measurement can also share ad-click identifiers and accepted organiser enquiries with Google Ads and Meta. Names, contact details and application answers are excluded. Advertising integrations are currently disabled. You can change or withdraw your choice at any time.`,
  allowAnalytics: "Allow analytics",
  allowMarketing: "Allow analytics and marketing",
  preferences: "Privacy choices",
} as const;
