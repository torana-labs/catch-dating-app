import legalDocument from "./legal.json" with {type: "json"};
import type {StoreCtaCopy} from "./types";

export const ownerGatedSiteDestinations = {
  contactHref: `mailto:${legalDocument.operator.supportEmail}`,
} as const;

export const siteFooterLegalLinks = [
  {href: "/privacy/", label: "Privacy"},
  {href: "/terms/", label: "Terms"},
  {href: "/help/", label: "Help"},
] as const;

// One authored owner for the public header and footer on every route.
export const publicSiteCopy = {
  menu: {dialogLabel: "Site menu", openLabel: "Menu", closeLabel: "Close", kicker: "Catch", hint: "Find something worth showing up for.", navLabel: "Mobile"},
  nav: [{href: "/explore/", label: "Find events"}, {href: "/organizers/", label: "Organisers"}, {href: "/host/", label: "For organisers"}],
  footerOperator: legalDocument.ui.footerBody,
} as const;
