import {brand} from "./brand.ts";
import {publishedLegalContent} from "./legal.ts";
import {marketingConsentPreferencesCopy} from "./marketingConsent.ts";
import type {StoreCtaCopy} from "./types";

/**
 * True once the guest app is on either store (packages/brand/brand.json).
 * Until then every "Get the app" button reads "Get notified" and leads to
 * the homepage's app band, so no primary button ends at "Coming soon".
 */
export const guestAppLive = Boolean(brand.stores.consumer.ios || brand.stores.consumer.android);
export const guestAppActionLabel = guestAppLive ? "Get the app" : "Get notified";

/** A WhatsApp chat on the support number in brand.json, with the message already typed. */
export function whatsappChatHref(message: string) {
  return `https://wa.me/${brand.support.whatsapp.replace(/\D/gu, "")}?text=${encodeURIComponent(message)}`;
}

/** The messages each WhatsApp button types for the person, and the buttons' words. */
export const whatsappChatCopy = {
  hostLinkMessage: `Hi ${brand.name}, please send me the ${brand.stores.hostAppName} link.`,
  hostQuestionMessage: `Hi ${brand.name}, I have a question about hosting on ${brand.name}.`,
  generalMessage: `Hi ${brand.name}, I have a question.`,
  chat: "Chat on WhatsApp",
} as const;

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
  /**
   * The main bar's links, the same on every page: each opens a page, never a
   * section of the current one (navigation proposal, 15 Nov). Explore holds
   * plans and organisers as tabs, so it is one link. A city's pages point
   * What's on at that city's Explore.
   */
  whatsOn: {href: "/explore/", label: "What’s on"},
  forHosts: {href: "/host/", label: "For hosts"},
  nav: [{href: "/explore/", label: "What’s on"}, {href: "/host/", label: "For hosts"}],
  /** The general pages' one primary action, the homepage's own. */
  getApp: {label: guestAppActionLabel, href: "/#app"},
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
    {href: "/#app", label: guestAppActionLabel},
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
  /** An open city's note: "Mumbai · 2 plans this week", or "New" before its first plan. */
  cityNotes: {plans: "{count} plans this week", plan: "1 plan this week", new: "New"},
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
  getApp: guestAppActionLabel,
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
