import {brand} from "./brand.ts";
import {publishedLegalContent} from "./legal.ts";
import {marketingConsentPreferencesCopy} from "./marketingConsent.ts";
import type {StoreCtaCopy} from "./types";

export const ownerGatedSiteDestinations = {
  contactHref: `mailto:${brand.support.email}`,
} as const;

export const siteFooterLegalLinks = [
  {href: "/privacy/", label: "Privacy"},
  {href: "/terms/", label: "Terms"},
  {href: "/refunds/", label: "Refunds"},
  {href: "/help/", label: "Help"},
  {href: "/contact/", label: "Contact"},
] as const;

// One authored owner for the public header and footer on every route.
export const publicSiteCopy = {
  wordmark: brand.name,
  menu: {openLabel: "Menu", navLabel: "Primary"},
  /** The main site's links, the same on every general page as on the homepage. */
  nav: [{href: "/explore/", label: "Explore"}, {href: "/explore/?show=organisers", label: "Organisers"}, {href: "/host/", label: "For hosts"}],
  /** The general pages' one primary action, the homepage's own. */
  getApp: {label: "Get the app", href: "/#app"},
  footerOperator: publishedLegalContent.ui.footerBody,
  /** The footer control that reopens the consent banner. */
  privacyChoices: marketingConsentPreferencesCopy.preferences,
} as const;

/**
 * The site top bar and the short footer the rebuilt public pages share,
 * as the RbWebOrgV2 and RbWebEventV2 boards draw them (shared/site/PublicSiteChrome.tsx).
 */
export const publicPageChromeCopy = {
  getApp: "Get the app",
  getAppHref: "/#app",
  wordmark: brand.name,
  footerLabel: "Site links",
  footerLinks: [
    {label: "Privacy", href: "/privacy/"},
    {label: "Terms", href: "/terms/"},
    {label: "For organisers", href: "/host/"},
    {label: "Help", href: "/help/"},
  ],
} as const;
