import {generatedWebsiteCities as websiteCities} from "./markets/generated/catalog.ts";
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
  walkthroughMessage: `Hi ${brand.name}, I'd like a walkthrough of ${brand.name}.`,
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

/** A page link: where it goes and what it says. */
export interface SiteLinkCopy {
  readonly href: string;
  readonly label: string;
}

/**
 * A header group: a dropdown of pages on a wide page (CatchNavMenu). A group
 * with one page draws that page as a plain link, and an empty group is left
 * out, so a group never opens onto nothing.
 */
export interface SiteNavGroupCopy {
  readonly label: string;
  readonly links: readonly SiteLinkCopy[];
}

const whatsOnLink = {href: "/explore/", label: "What’s on"} as const;
const forHostsLink = {href: "/host/", label: "For hosts"} as const;
const hostLandingLink = {href: "/host/", label: `${brand.name} for hosts`} as const;
const hostPricingLink = {href: "/pricing/", label: "Pricing"} as const;
const hostStartLink = {href: "/host/#start", label: "Start free trial"} as const;
const weddingsLink = {href: "/weddings/", label: "Weddings"} as const;
const claimLink = {href: "/claim/", label: "Claim your page"} as const;
const helpLink = {href: "/help/", label: "Help"} as const;
/** The walkthrough request page (/host/walkthrough/): a lead form staff answer on WhatsApp. */
export const hostWalkthroughHref = "/host/walkthrough/";

// One authored owner for the public header and footer on every route.
export const publicSiteCopy = {
  wordmark: brand.name,
  menu: {openLabel: "Menu", navLabel: "Primary"},
  /**
   * The main bar's links: each opens a page, never a section of the current
   * one (navigation proposal, 15 Nov). Explore holds plans and organisers as
   * tabs, so it is one link. A city's pages point What's on at that city's
   * Explore.
   */
  whatsOn: whatsOnLink,
  forHosts: forHostsLink,
  nav: [whatsOnLink, forHostsLink],
  /** The general pages' one primary action, the homepage's own. */
  getApp: {label: guestAppActionLabel, href: "/#app"},
  footerOperator: publishedLegalContent.ui.footerBody,
  /** The footer control that reopens the consent banner. */
  privacyChoices: marketingConsentPreferencesCopy.preferences,
} as const;

/**
 * The header variants (the playbook kit's KitHeader). Every variant starts
 * with the wordmark; What's on leads guest and host pages unless the page
 * hides it. Link only pages that exist in design/website/routes.json:
 * Resources gains host stories, the no-show calculator and refer a host, and
 * For hosts the demo night, nightlife and colleges, once those pages ship.
 */
export const siteHeaderCopy = {
  /** The breadcrumb row's accessible name. */
  breadcrumbLabel: "Breadcrumb",
  /** Guest pages: What's on and For hosts, then the guest app. */
  guest: {
    nav: [forHostsLink] as readonly (SiteLinkCopy | SiteNavGroupCopy)[],
    action: {href: "/#app", label: guestAppActionLabel},
  },
  /**
   * Host pages: What's on, the For hosts pages, Pricing (/pricing/) and
   * Resources, then WhatsApp and the free trial.
   */
  host: {
    nav: [
      {label: "For hosts", links: [hostLandingLink, weddingsLink, claimLink]},
      hostPricingLink,
      {label: "Resources", links: [helpLink]},
    ] as readonly (SiteLinkCopy | SiteNavGroupCopy)[],
    action: hostStartLink,
    /** The bar shows the short label beside the WhatsApp mark; the full one names the link. */
    whatsapp: {label: "Talk to us on WhatsApp", shortLabel: "Talk to us", message: whatsappChatCopy.hostQuestionMessage},
  },
} as const;

/**
 * The one site footer on every public page (shared/site PublicSiteFooter).
 * Guest pages: Explore, Cities, Hosts and Help and legal; a page without its
 * own city list shows every live city and the all-cities page. Host pages: Product, Get started,
 * the brand's column and Legal (the playbook kit's KitFooter). Help and
 * legal, and Legal, end with Privacy choices, which reopens the consent
 * banner.
 */
export const siteFooterCopy = {
  nav: "Footer",
  tagline: "Meet people in real life, through hosts who bring them together.",
  groups: {
    explore: "Explore",
    cities: "Cities",
    hosts: "Hosts",
    help: "Help and legal",
    product: "Product",
    getStarted: "Get started",
    brand: brand.name,
    legal: "Legal",
  },
  explore: [
    whatsOnLink,
    {href: "/#app", label: guestAppActionLabel},
  ],
  hosts: [hostLandingLink, hostPricingLink, hostStartLink, weddingsLink, claimLink],
  /** The legal links in reading order: help first, then the policies, then contact. */
  helpOrder: ["/help/", "/privacy/", "/terms/", "/refunds/", "/contact/"],
  /** The host footer's columns. */
  host: {
    product: [
      hostLandingLink,
      {href: "/host/#night", label: `How ${brand.name} works`},
      {href: "/host/#ways", label: `Ways to use ${brand.name}`},
      weddingsLink,
    ],
    getStarted: [hostStartLink, hostPricingLink, claimLink],
    brandOrder: ["/explore/", "/help/", "/contact/"],
    legalOrder: ["/privacy/", "/terms/", "/refunds/"],
  },
  /**
   * The help band across the top of the footer on guest and host pages, not
   * on ad landing pages or one-job flows. It states no hours. Guest pages add
   * Help; host pages add the walkthrough request page.
   */
  helpBand: {
    title: "We reply on WhatsApp, usually within an hour.",
    whatsapp: whatsappChatCopy.chat,
    guestMessage: whatsappChatCopy.generalMessage,
    hostMessage: whatsappChatCopy.hostQuestionMessage,
    guestHelp: helpLink,
    walkthrough: {href: hostWalkthroughHref, label: "Book a walkthrough"},
  },
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

/**
 * The Cities column a guest page shows when it doesn't list its own: every
 * live city in the market catalog, then the all-cities page (the canvas's
 * guest footer always carries Cities).
 */
export const siteFooterDefaultCities: readonly {href: string; label: string; soon: boolean}[] = [
  ...websiteCities.filter((city) => city.status === "live").map((city) => ({href: `/${city.slug}/`, label: city.label, soon: false})),
  {href: "/cities/", label: siteFooterCopy.moreCities, soon: false},
];
