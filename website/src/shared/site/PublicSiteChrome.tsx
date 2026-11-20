import {
  CatchBanner,
  CatchBreadcrumbRow,
  CatchButton,
  CatchNavMenu,
  CatchSiteFooter,
  CatchStack,
  CatchSurface,
  CatchText,
  CatchTopBar,
  CatchWordmark,
  type CatchSiteFooterColumns,
  type CatchSiteFooterGroup,
  type CatchTopBarAction,
} from "@catch/web-ui";
import {createContext, useContext, type ReactNode} from "react";
import {openMarketingConsentPreferences} from "../../analytics";
import {
  publicSiteCopy,
  siteFooterCopy,
  siteFooterDefaultCities,
  siteFooterLegalLinks,
  siteHeaderCopy,
  whatsappChatHref,
  type SiteLinkCopy,
  type SiteNavGroupCopy,
} from "../../content/site";
import {slugForTracking, trackSiteCtaClick} from "./siteTracking";

/**
 * The header's account entry ("Sign in" or "Account"). The app shell provides
 * it from the account feature, so shared chrome never imports a feature; a
 * story or test without the provider draws the header without it.
 */
export interface SiteAccountEntry {
  /**
   * The top bar's account control on wide pages, at the right end after the
   * actions: "Sign in" signed out, the avatar signed in, in the same place.
   */
  bar?: ReactNode;
  /** The same entry in the phone menu, where the bar has no room for it. */
  menu: {label: string; href?: string; onPressed?: () => void};
  /**
   * A signed-in reader's whole phone menu in place of the built-in one: the
   * Menu button carries their avatar and opens a sheet with the account and
   * the page's links.
   */
  phoneMenu?: (links: readonly SiteNavItem[], menuLabel: string) => ReactNode;
}
/** A page link: where it goes and what it says. */
export interface SiteNavItem {
  href: string;
  label: string;
}

const SiteAccountActionContext = createContext<SiteAccountEntry | null>(null);
export const SiteAccountActionProvider = SiteAccountActionContext.Provider;

/** "Catch for hosts" → the brand and its product line, so the wordmark sets both in one voice. */
function wordmarkParts(title: string): {brand: string; subBrand?: string} {
  const brand = publicSiteCopy.wordmark;
  return title.startsWith(`${brand} `) ? {brand, subBrand: title.slice(brand.length + 1)} : {brand: title};
}

/**
 * Which header a page carries (the playbook kit's KitHeader). guest: What's
 * on and For hosts, then the guest app. host: What's on, the For hosts
 * dropdown and Resources, then WhatsApp and the free trial.
 * minimal: the wordmark alone, for one-job flows such as a booking.
 */
export type SiteHeaderVariant = "guest" | "host" | "minimal";

/** Which footer a page carries: the guest columns or the host columns. */
/** guest and host: the full footer. minimal: the same footer for a one-job page, with no help band and two short columns. */
export type SiteFooterVariant = "guest" | "host" | "minimal";

/**
 * A strip above the bar, such as a running offer: a lead in bold, its body
 * and an optional action. It is persistent (catch.banner) and has no dismiss.
 */
export interface SiteOffer {
  lead: string;
  body: string;
  action?: SiteNavItem;
}

/** The row under the bar: the pages above this one, outermost first, then this page's name. */
export interface SiteBreadcrumbs {
  links: readonly SiteNavItem[];
  current: string;
}

const isGroup = (entry: SiteLinkCopy | SiteNavGroupCopy): entry is SiteNavGroupCopy => "links" in entry;

/**
 * A variant's entries in order, as the bar draws them: plain links, and a
 * dropdown where a group has several pages. A group of one page is that page
 * as a plain link, and an empty group is left out, so no dropdown opens onto
 * nothing. `menus` lists the dropdowns again for the phone menu.
 */
function navPlan(entries: readonly (SiteLinkCopy | SiteNavGroupCopy)[]): {items: (SiteNavItem | SiteNavGroupCopy)[]; menus: SiteNavGroupCopy[]} {
  const items: (SiteNavItem | SiteNavGroupCopy)[] = [];
  const menus: SiteNavGroupCopy[] = [];
  for (const entry of entries) {
    if (!isGroup(entry)) items.push(entry);
    else if (entry.links.length === 1) items.push(entry.links[0]);
    else if (entry.links.length > 1) {
      items.push(entry);
      menus.push(entry);
    }
  }
  return {items, menus};
}

const trackNav = (link: SiteNavItem) => trackSiteCtaClick(`nav_${slugForTracking(link.label)}`, link.href);
const withNavTracking = (link: SiteNavItem): CatchTopBarAction => ({...link, onPressed: () => trackNav(link)});
const navAction = (item: SiteNavItem | SiteNavGroupCopy): CatchTopBarAction =>
  isGroup(item)
    ? {label: item.label, menu: item.sections
      ? <CatchNavMenu appearance="link" label={item.label} onLinkPressed={trackNav} sections={item.sections} />
      : <CatchNavMenu appearance="link" label={item.label} links={item.links} onLinkPressed={trackNav} />}
    : withNavTracking(item);

/**
 * A dropdown's pages for the phone menu, after the bar's links: a divider
 * opens each dropdown and each of its titled columns.
 */
const phoneMenuLinks = (menu: SiteNavGroupCopy): CatchTopBarAction[] =>
  (menu.sections ?? [{title: menu.label, links: menu.links}]).flatMap((section) =>
    section.links.map((link, index) => ({...withNavTracking(link), ...(index === 0 ? {startsSection: true} : {})})));

/**
 * The one public header, the system's site top bar, on every public route:
 * the wordmark (catch.wordmark) and the page links on the left; on the right
 * the page's actions, a setting such as the city and then the one primary
 * action, and last the visitor's account control. `variant` picks the links
 * and the primary action (guest, host or the one-job minimal); a product page
 * may still name itself and pass its own sections and action. An offer strip
 * may sit above the bar and a breadcrumb row below it; neither shows unless
 * the page passes it.
 */
export function PublicSiteHeader({
  actions,
  breadcrumbs,
  links,
  newToCity,
  offer,
  showWhatsOn = true,
  title = publicSiteCopy.wordmark,
  variant = "guest",
  whatsOnHref,
  wideActions,
}: {
  /** The page's own actions in place of the variant's primary action, such as the city picker and Get the app. */
  actions?: ReactNode;
  breadcrumbs?: SiteBreadcrumbs;
  /** A product page's own sections in place of the variant's links. */
  links?: readonly SiteNavItem[];
  /** A guest page's city's new-to-the-city page, after What's on (the canvas's "New to Mumbai"). */
  newToCity?: SiteNavItem;
  /** The strip above the bar. No page shows one yet. */
  offer?: SiteOffer;
  /**
   * What's on leads guest and host pages. A city with no events in the
   * coming month will hide it; until that read exists it always shows.
   */
  showWhatsOn?: boolean;
  title?: string;
  variant?: SiteHeaderVariant;
  /** Where What's on goes: a city's pages point it at that city's Explore. */
  whatsOnHref?: string;
  /** Actions shown from 600px only: one the page's phone bar already carries, such as Get notified. */
  wideActions?: ReactNode;
}) {
  const account = useContext(SiteAccountActionContext);
  const {brand, subBrand} = wordmarkParts(title);
  const minimal = variant === "minimal";
  const whatsOn = showWhatsOn ? [{...publicSiteCopy.whatsOn, href: whatsOnHref ?? publicSiteCopy.whatsOn.href}] : [];
  const plan = minimal ? {items: [], menus: []}
    : links ? {items: [...links], menus: []}
    : navPlan([...whatsOn, ...(variant === "guest" && newToCity ? [newToCity] : []), ...siteHeaderCopy[variant].nav]);
  // Below 600px the dropdowns draw nothing, so the phone menu lists their pages after the links.
  const menuLinks = plan.menus.flatMap((menu) => menu.links);
  const menuActions = plan.menus.flatMap(phoneMenuLinks);
  const plainLinks = plan.items.filter((item): item is SiteNavItem => !isGroup(item));
  const primary = actions ?? (minimal ? null : <PrimaryAction link={siteHeaderCopy[variant].action} />);
  return (
    <>
      {offer ? <SiteOfferStrip offer={offer} /> : null}
      <CatchTopBar
        account={minimal ? undefined : account?.bar}
        actions={primary}
        contact={variant === "host" ? hostWhatsAppContact() : undefined}
        homeHref="/"
        links={plan.items.map(navAction)}
        linksLabel={publicSiteCopy.menu.navLabel}
        menuExtras={minimal ? undefined : [...menuActions, ...(account ? [{...account.menu, startsSection: menuActions.length > 0}] : [])]}
        menuLabel={publicSiteCopy.menu.openLabel}
        siteMenu={minimal ? undefined : account?.phoneMenu?.([...plainLinks, ...menuLinks], publicSiteCopy.menu.openLabel)}
        subBrand={subBrand}
        title={brand}
        variant="site"
        wideActions={wideActions}
      />
      {breadcrumbs ? (
        <CatchSurface as="div" block="band" padding="sm">
          <CatchBreadcrumbRow
            current={breadcrumbs.current}
            label={siteHeaderCopy.breadcrumbLabel}
            links={breadcrumbs.links}
            onLinkPressed={(link) => trackSiteCtaClick(`breadcrumb_${slugForTracking(link.label)}`, link.href)}
          />
        </CatchSurface>
      ) : null}
    </>
  );
}

function PrimaryAction({link}: {link: SiteNavItem}) {
  return <CatchButton href={link.href} label={link.label} size="sm" />;
}

/** The host bar's WhatsApp link: the mark and "Talk to us", in green, before Sign in and the free trial. */
function hostWhatsAppContact() {
  const {label, message, shortLabel} = siteHeaderCopy.host.whatsapp;
  return {accessibleLabel: label, href: whatsappChatHref(message), label: shortLabel};
}

/** The offer strip above the bar (catch.banner): persistent, never dismissed. */
function SiteOfferStrip({offer}: {offer: SiteOffer}) {
  return (
    <CatchBanner
      actions={offer.action ? <CatchButton href={offer.action.href} label={offer.action.label} size="sm" variant="secondary" /> : undefined}
      message={offer.body}
      title={offer.lead}
    />
  );
}

// Beside a tagline it takes the surrounding type and is underlined so it reads as a link.
const privacyChoicesText = {font: "inherit", textDecoration: "underline", textUnderlineOffset: "0.2em"} as const;

/**
 * "Privacy choices": reopens the consent banner. Beside a line of text it
 * takes the surrounding colour and type, so no control floats over the page
 * once a choice exists. The site footer's link columns end with
 * `privacyChoicesAction` instead, which the footer draws exactly as a link.
 */
export function PrivacyChoicesButton() {
  return (
    <CatchButton foregroundColor="currentColor" label={publicSiteCopy.privacyChoices} minimumSize={{width: 0, height: 0}}
      onPressed={openMarketingConsentPreferences} padding={0} recipe="text" textStyle={privacyChoicesText} />
  );
}

/** "Privacy choices" as the last item of the site footer's last link column. */
const privacyChoicesAction = {label: publicSiteCopy.privacyChoices, onPressed: openMarketingConsentPreferences};

/** A city in the footer's Cities column, as the city pages and the homepage list them. */
export interface SiteFooterCity {
  href: string;
  label: string;
  /** Not yet open: the column marks it "soon". */
  soon: boolean;
  /** The city's own note, such as "2 plans this week"; it replaces "soon". */
  note?: string;
}

const trackFooter = (link: SiteNavItem) => trackSiteCtaClick(`footer_${slugForTracking(link.label)}`, link.href);

/** The site's own links by path, in the order given. */
function siteLinks(hrefs: readonly string[]): SiteNavItem[] {
  const pool: readonly SiteNavItem[] = [publicSiteCopy.whatsOn, ...siteFooterLegalLinks, ...siteFooterCopy.extraLinks];
  return hrefs.map((href) => pool.find((link) => link.href === href)!);
}

/**
 * The footer's help band actions: a person answers on WhatsApp. Guest pages
 * add Help; host pages add the walkthrough request page. The band states no
 * hours.
 */
function FooterHelpActions({variant}: {variant: Exclude<SiteFooterVariant, "minimal">}) {
  const band = siteFooterCopy.helpBand;
  const whatsapp = {href: whatsappChatHref(variant === "host" ? band.hostMessage : band.guestMessage), label: band.whatsapp};
  const second = variant === "host" ? band.walkthrough : band.guestHelp;
  return (
    <>
      <CatchButton href={whatsapp.href} label={whatsapp.label} onPressed={() => trackFooter(whatsapp)} size="sm" variant="light" />
      <CatchButton href={second.href} label={second.label} onPressed={() => trackFooter(second)} size="sm" variant="ghost" />
    </>
  );
}

/**
 * The one site footer on every public page: the ink band with its link
 * columns, each link flush with its column title on one row rhythm, then
 * the wordmark with the tagline on its baseline and the operator line.
 * Guest pages carry Explore, Cities (the page's own list, or every live
 * city), Hosts and Help and legal; host pages carry the canvas's five:
 * Product, Hosts by format, Get started, Resources and the brand's column.
 * The last column ends with Privacy choices. The help band
 * leads the footer unless the page turns it off (ad landing pages, one-job
 * flows). A product page may name itself ("Catch for weddings") and give
 * its own line.
 */
export function PublicSiteFooter({
  appHref,
  cities,
  cityFormats,
  columns,
  exploreHref,
  footnotes,
  helpBand = true,
  helpTitle = siteFooterCopy.helpBand.title,
  navLabel = siteFooterCopy.nav,
  tagline = siteFooterCopy.tagline,
  variant = "guest",
  wordmark = publicSiteCopy.wordmark,
}: {
  /** Where Get the app goes: the homepage's own band from the homepage. */
  appHref?: string;
  cities?: readonly SiteFooterCity[];
  /**
   * A guest page's city: its new-to-the-city page in Explore, and its format
   * pages as their own column (the canvas's "Things to do"). Pass only pages
   * that exist for the city.
   */
  cityFormats?: SiteFooterCityPages;
  /**
   * The link columns in place of the variant's (the kit's KitFooter `cols`),
   * for a page that needs its own. The last column ends with Privacy
   * choices, as every footer's does.
   */
  columns?: readonly SiteFooterColumn[];
  /** Where What's on goes: a city page links its own plans. */
  exploreHref?: string;
  /** Numbered notes under the columns, such as a figure's source; each carries its own number. */
  footnotes?: readonly string[];
  /** The band across the top: a person answers on WhatsApp. */
  helpBand?: boolean;
  /** The help band's headline; a page may name its own topic ("Questions about hosting? A person answers."). */
  helpTitle?: string;
  /** The footer nav's name; only a page showing several footers needs another. */
  navLabel?: string;
  tagline?: string;
  variant?: SiteFooterVariant;
  wordmark?: string;
}) {
  const {brand, subBrand} = wordmarkParts(wordmark);
  const minimal = variant === "minimal";
  const groups = columns ? columnFooterGroups(columns) :
    minimal ? minimalFooterGroups(exploreHref) :
    variant === "host" ? hostFooterGroups(exploreHref) : guestFooterGroups({appHref, cities: cities ?? siteFooterDefaultCities, cityFormats, exploreHref});
  return (
    <CatchSiteFooter
      brandHref="/"
      brandLabel={brand}
      brandSubBrand={subBrand}
      // The canvas's five link columns, so each column keeps the canvas width.
      columns={(minimal ? 2 : 5) satisfies CatchSiteFooterColumns}
      footnotes={footnotes}
      groups={groups}
      headerActions={helpBand && !minimal ? <FooterHelpActions variant={variant} /> : undefined}
      headerTitle={helpBand && !minimal ? helpTitle : undefined}
      navLabel={navLabel}
      note={publicSiteCopy.footerOperator}
      // One-job pages record no footer clicks: the private offer and form pages record none at all.
      onLinkPressed={minimal ? undefined : trackFooter}
      tagline={tagline}
    />
  );
}

/** A one-job page's footer (a booking, a form, the trial start): where to go next, then help and legal ending in Privacy choices. */
function minimalFooterGroups(exploreHref?: string): CatchSiteFooterGroup[] {
  const [whatsOn] = siteFooterCopy.explore;
  return [
    {title: siteFooterCopy.groups.explore, links: [{...whatsOn, href: exploreHref ?? whatsOn.href}, siteFooterCopy.hosts[0]]},
    {title: siteFooterCopy.groups.help, links: siteLinks(siteFooterCopy.helpOrder), action: privacyChoicesAction},
  ];
}

function guestFooterGroups({appHref, cities, cityFormats, exploreHref}: {appHref?: string; cities?: readonly SiteFooterCity[]; cityFormats?: SiteFooterCityPages; exploreHref?: string}): CatchSiteFooterGroup[] {
  const [whatsOn, app] = siteFooterCopy.explore;
  const explore = [
    {...whatsOn, href: exploreHref ?? whatsOn.href},
    ...(cityFormats?.newToCity ? [cityFormats.newToCity] : []),
    siteFooterCopy.safety,
    {...app, href: appHref ?? app.href},
  ];
  return [
    {title: siteFooterCopy.groups.explore, links: explore},
    ...(cityFormats && cityFormats.formats.length > 0 ? [{title: cityFormats.title, links: cityFormats.formats}] : []),
    ...(cities ? [{title: siteFooterCopy.groups.cities, links: cities.map((city) => ({href: city.href, label: city.label, note: city.note ?? (city.soon ? siteFooterCopy.soon : undefined)}))}] : []),
    {title: siteFooterCopy.groups.hosts, links: siteFooterCopy.hosts},
    {title: siteFooterCopy.groups.help, links: siteLinks(siteFooterCopy.helpOrder), action: privacyChoicesAction},
  ];
}

/** A guest page's city pages for the footer: its new-to-the-city page and the column of its format pages. */
export interface SiteFooterCityPages {
  newToCity?: SiteNavItem;
  /** The column's title, such as "Things to do in Mumbai". */
  title: string;
  formats: readonly SiteNavItem[];
}

/** A page's own footer column: its title and links. */
interface SiteFooterColumn {
  readonly title: string;
  readonly links: readonly SiteNavItem[];
}

function columnFooterGroups(columns: readonly SiteFooterColumn[]): CatchSiteFooterGroup[] {
  return columns.map((column, index) => ({
    title: column.title,
    links: column.links,
    ...(index === columns.length - 1 ? {action: privacyChoicesAction} : {}),
  }));
}

function hostFooterGroups(exploreHref?: string): CatchSiteFooterGroup[] {
  const whatsOn = publicSiteCopy.whatsOn.href;
  return columnFooterGroups(siteFooterCopy.host.columns.map((column) => ({
    title: column.title,
    links: column.links.map((link) => link.href === whatsOn && exploreHref ? {...link, href: exploreHref} : link),
  })));
}
