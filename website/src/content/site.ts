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
 * The one site footer on every public page (shared/site PublicSiteFooter):
 * Explore, Hosts and Help and legal on every page, with the city pages and
 * the homepage adding their Cities column. Help and legal ends with Privacy
 * choices, which reopens the consent banner.
 */
export const siteFooterCopy = {
  nav: "Footer",
  tagline: "Meet people in real life, through hosts who bring them together.",
  groups: {explore: "Explore", cities: "Cities", hosts: "Hosts", help: "Help and legal"},
  explore: [
    {href: "/explore/", label: "What’s on"},
    {href: "/explore/?show=organisers", label: "Organisers"},
    {href: "/#app", label: "Get the app"},
  ],
  hosts: [
    {href: "/host/", label: `${brand.name} for hosts`},
    {href: "/host/#pricing", label: "Pricing"},
    {href: "/weddings/", label: "Weddings"},
    {href: "/claim/", label: "Claim your page"},
  ],
  /** The legal links in reading order: help first, then the policies, then contact. */
  helpOrder: ["/help/", "/privacy/", "/terms/", "/refunds/", "/contact/"],
  /** A city not yet open: "Pune · soon". */
  soon: "soon",
  /** An open city's note: "Mumbai · 2 plans this week", or "new" before its first plan. */
  cityNotes: {plans: "{count} plans this week", plan: "1 plan this week", new: "new"},
  /** The Cities column's last link, to /cities/. */
  moreCities: "More cities →",
  /** A country with no city open, once in the Cities column. */
  countrySoon: "Launching soon in {country}",
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
