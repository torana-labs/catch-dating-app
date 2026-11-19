import {generatedWebsiteCities as websiteCities} from "./markets/generated/catalog.ts";
import {brand} from "./brand.ts";
import {publishedLegalContent} from "./legal.ts";
import {marketingConsentPreferencesCopy} from "./marketingConsent.ts";
import type {StoreCtaCopy} from "./types";

/**
 * True once the guest app is on either store (packages/brand/brand.json).
 * Until then every "Get the app" button reads "Get notified" and leads to
 * the guest app page (/app/), whose form asks for one WhatsApp message on
 * launch, so no primary button ends at "Coming soon".
 */
export const guestAppLive = Boolean(brand.stores.consumer.ios || brand.stores.consumer.android);
export const guestAppActionLabel = guestAppLive ? "Get the app" : "Get notified";
/** The guest app page (/app/, a playbook page): every "Get the app" link off the homepage goes here. */
export const guestAppHref = "/app/";

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
  /**
   * Titled columns in place of one list (the playbook's "For hosts" menu).
   * `links` then holds every column's links in order, for the phone menu.
   */
  readonly sections?: readonly SiteLinkColumnCopy[];
}

/** A titled column of page links: a header menu's column or a footer column. */
export interface SiteLinkColumnCopy {
  readonly title: string;
  readonly links: readonly SiteLinkCopy[];
}

/** A header group drawn as titled columns: its links are the columns' links in order. */
const sectionedGroup = (label: string, sections: readonly SiteLinkColumnCopy[]): SiteNavGroupCopy =>
  ({label, sections, links: sections.flatMap((section) => section.links)});

const whatsOnLink = {href: "/explore/", label: "What’s on"} as const;
const forHostsLink = {href: "/host/", label: "For hosts"} as const;
const hostLandingLink = {href: "/host/", label: `${brand.name} for hosts`} as const;
const hostPricingLink = {href: "/pricing/", label: "Pricing"} as const;
const hostStartLink = {href: "/host/#start", label: "Start free trial"} as const;
const weddingsLink = {href: "/weddings/", label: "Weddings"} as const;
const claimLink = {href: "/claim/", label: "Claim your page"} as const;
const helpLink = {href: "/help/", label: "Help"} as const;
/** The listing request form (/listings/request/): ask to correct, claim or remove a public listing. */
const reportListingLink = {href: "/listings/request/", label: "Report or remove a listing"} as const;
/** The walkthrough request page (/host/walkthrough/): a lead form staff answer on WhatsApp. */
export const hostWalkthroughHref = "/host/walkthrough/";
/** Refer a host (/refer/): the host-to-host referral page. */
const referHref = "/refer/";
const aboutLink = {href: "/about/", label: "About"} as const;
const safetyLink = {href: "/safety/", label: "Safety"} as const;
/** The free host tools and guides under Resources (the canvas's Resources menu and footer column). */
const noShowCalculatorLink = {href: "/tools/no-show-calculator/", label: "No-show calculator"} as const;
const hostPlaybooksLink = {href: "/playbooks/", label: "Host playbooks"} as const;

/**
 * The host product pages (product pages v2), in the canvas's order. Each is a
 * playbook page (features/playbook/playbookRoutes.ts); the chrome test holds
 * every link here to a route with content.
 */
const productPageLinks = {
  howItWorks: {href: "/how-it-works/", label: `How ${brand.name} works`},
  yourPage: {href: "/product/your-page/", label: "Your page"},
  bookings: {href: "/product/bookings-and-memberships/", label: "Bookings and memberships"},
  messages: {href: "/product/messages-and-growth/", label: "Messages and growth"},
  room: {href: "/product/the-room/", label: "The room"},
  event: {href: "/product/running-the-event/", label: "Running the event"},
  guests: {href: "/product/guest-records/", label: "Guest records"},
  reports: {href: "/product/reports-and-payouts/", label: "Reports and payouts"},
  forms: {href: "/product/forms/", label: "Forms"},
} as const satisfies Record<string, SiteLinkCopy>;

/** The organiser type pages under /host/<type>/, by their path segment. */
const hostTypeHref = (type: string) => `/host/${type}/`;

/** The host's ways in beyond the landing (the host section's playbook pages). */
const hostStartPageLink = {href: "/host/start/", label: "Start free trial"} as const;
const firstEventHref = "/host/first-event/";
const switchHref = "/host/switch/";
const hostDemoHref = "/host/demo/";
const programmesHref = "/programmes/";

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
  getApp: {label: guestAppActionLabel, href: guestAppHref},
  footerOperator: publishedLegalContent.ui.footerBody,
  /** The footer control that reopens the consent banner. */
  privacyChoices: marketingConsentPreferencesCopy.preferences,
} as const;

/**
 * The header variants (the playbook kit's KitHeader). Every variant starts
 * with the wordmark; What's on leads guest and host pages unless the page
 * hides it. Link only pages that exist in design/website/routes.json:
 * Resources is Help alone, a plain link; the canvas's Resources menu (host
 * stories, host playbooks, compare, the no-show calculator and the event
 * page from a link) is a separate change to the bar. The playbooks and the
 * calculator are in the host footer's Resources column meanwhile.
 */
export const siteHeaderCopy = {
  /** The breadcrumb row's accessible name. */
  breadcrumbLabel: "Breadcrumb",
  /**
   * Guest pages: What's on, New to the city where the page has a city,
   * Safety and For hosts, then the guest app.
   */
  guest: {
    nav: [safetyLink, forHostsLink] as readonly (SiteLinkCopy | SiteNavGroupCopy)[],
    /** The city's new-to-the-city page (/new-to-<city>/), after What's on. */
    newToCity: "New to {city}",
    action: {href: guestAppHref, label: guestAppActionLabel},
  },
  /**
   * Host pages: What's on, the For hosts menu (the canvas's columns:
   * Product, By format, By organisation, Programmes and Where you are),
   * Pricing (/pricing/) and Resources, then WhatsApp and the free trial.
   */
  host: {
    nav: [
      sectionedGroup("For hosts", [
        {title: "Product", links: [hostLandingLink, ...Object.values(productPageLinks)]},
        {title: "By format", links: [
          {href: hostTypeHref("run-clubs"), label: "Run and walk clubs"},
          {href: hostTypeHref("racket-sports"), label: "Racket sports"},
          {href: hostTypeHref("supper-clubs"), label: "Supper clubs"},
          {href: hostTypeHref("quiz-nights"), label: "Quiz and game nights"},
          {href: hostTypeHref("nightlife"), label: "Nightlife"},
          {href: hostTypeHref("studios"), label: "Studios and fitness"},
          {href: hostTypeHref("workshops"), label: "Workshops and classes"},
          {href: hostTypeHref("communities"), label: "Communities"},
          {href: hostTypeHref("outdoors"), label: "Outdoors and trips"},
        ]},
        {title: "By organisation", links: [
          {href: hostTypeHref("venues"), label: "Cafés, bars and breweries"},
          {href: hostTypeHref("facilities"), label: "Courts and clubhouses"},
          {href: hostTypeHref("teams"), label: "Companies and shared spaces"},
          {href: hostTypeHref("colleges"), label: "Colleges and alumni"},
          {href: hostTypeHref("creators"), label: "Creators"},
          {href: hostTypeHref("brands"), label: "Brands"},
        ]},
        {title: "Programmes", links: [weddingsLink, {href: programmesHref, label: "Offsites, retreats and birthdays"}]},
        {title: "Where you are", links: [
          {href: firstEventHref, label: "Plan your first event"},
          {href: switchHref, label: "Switch from WhatsApp"},
          {href: hostDemoHref, label: "Try a demo night"},
          claimLink,
          {href: hostWalkthroughHref, label: "Several chapters? Book a walkthrough"},
        ]},
      ]),
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
 * own city list shows every live city and the all-cities page. Host pages:
 * Product, Hosts by format, Get started, Resources and the brand's column
 * (the playbook kit's KitFooter). Help and legal, and the brand's column,
 * end with Privacy choices, which reopens the consent banner.
 */
export const siteFooterCopy = {
  nav: "Footer",
  tagline: "Meet people in real life, through hosts who bring them together.",
  groups: {
    explore: "Explore",
    cities: "Cities",
    hosts: "Hosts",
    help: "Help and legal",
  },
  explore: [
    whatsOnLink,
    {href: guestAppHref, label: guestAppActionLabel},
  ],
  /** Explore's Safety link, after What's on and the page's New to the city. */
  safety: safetyLink,
  /** The column of the city's format pages (the canvas's guest "Things to do"), on pages that know the city. */
  cityFormats: "Things to do in {city}",
  hosts: [hostLandingLink, hostPricingLink, hostStartLink, weddingsLink, claimLink],
  /**
   * The legal links in reading order: help first, then the policies, then
   * contact, then the quiet listing request link.
   */
  helpOrder: ["/help/", "/privacy/", "/terms/", "/refunds/", "/contact/", reportListingLink.href],
  /** The footer's own links beyond the legal ones, which helpOrder may name. */
  extraLinks: [reportListingLink],
  /**
   * The host footer's five columns on every host page (the canvas's KitFooter
   * host columns, as the product pages v2 drew them): the product pages,
   * the organiser type pages, the ways to start, resources and the brand's
   * column with the listing request and the legal links. Resources lists
   * Forms, the host playbooks, the no-show calculator, the walkthrough,
   * Refer a host and Help; pages the canvas names that are not built yet
   * (host stories, compare, event page from a link) join when they ship.
   */
  host: {
    columns: [
      {title: "Product", links: [
        productPageLinks.howItWorks, productPageLinks.yourPage, productPageLinks.bookings, productPageLinks.messages,
        productPageLinks.room, productPageLinks.event, productPageLinks.guests, productPageLinks.reports,
      ]},
      {title: "Hosts by format", links: [
        {href: hostTypeHref("run-clubs"), label: "Run and walk clubs"},
        {href: hostTypeHref("racket-sports"), label: "Racket sports"},
        {href: hostTypeHref("supper-clubs"), label: "Supper clubs"},
        {href: hostTypeHref("quiz-nights"), label: "Quiz and game nights"},
        {href: hostTypeHref("studios"), label: "Studios"},
        {href: hostTypeHref("venues"), label: "Venues"},
        {href: hostTypeHref("communities"), label: "Communities"},
        {href: hostTypeHref("nightlife"), label: "Mixers and pub crawls"},
        {href: hostTypeHref("teams"), label: "Teams"},
        {href: hostTypeHref("colleges"), label: "Colleges and alumni"},
      ]},
      {title: "Get started", links: [
        hostStartPageLink,
        hostPricingLink,
        {href: firstEventHref, label: "Your first event"},
        {href: switchHref, label: `Switch to ${brand.name}`},
        {href: hostDemoHref, label: "Try a demo night"},
        {href: programmesHref, label: "Programmes"},
      ]},
      {title: "Resources", links: [
        productPageLinks.forms, hostPlaybooksLink, noShowCalculatorLink, {href: hostWalkthroughHref, label: "Book a walkthrough"},
        {href: referHref, label: "Refer a host"}, helpLink,
      ]},
      {title: brand.name, links: [
        whatsOnLink, aboutLink, safetyLink, {href: "/contact/", label: "Contact"}, reportListingLink,
        {href: "/terms/", label: "Terms"}, {href: "/privacy/", label: "Privacy"}, {href: "/refunds/", label: "Refunds"},
      ]},
    ] satisfies readonly SiteLinkColumnCopy[],
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
  getAppHref: guestAppHref,
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
