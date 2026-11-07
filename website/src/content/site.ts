import {brand} from "./brand.ts";
import {publishedLegalContent} from "./legal.ts";
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
  nav: [{href: "/explore/", label: "Find events"}, {href: "/organizers/", label: "Organisers"}, {href: "/host/", label: "For organisers"}],
  footerOperator: publishedLegalContent.ui.footerBody,
} as const;

/**
 * The site top bar and the short footer the rebuilt public pages share,
 * as the RbWebOrgV2 and RbWebEventV2 boards draw them (shared/site/PublicSiteChrome.tsx).
 */
export const publicPageChromeCopy = {
  links: [{label: "Explore", href: "/explore/"}, {label: "For organisers", href: "/host/"}],
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
