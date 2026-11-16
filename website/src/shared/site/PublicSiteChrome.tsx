import {
  CatchBanner,
  CatchBreadcrumbRow,
  CatchButton,
  CatchIconAction,
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
  publicPageChromeCopy,
  publicSiteCopy,
  siteFooterCopy,
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
 * dropdown, Pricing and Resources, then WhatsApp and the free trial.
 * minimal: the wordmark alone, for one-job flows such as a booking.
 */
export type SiteHeaderVariant = "guest" | "host" | "minimal";

/** Which footer a page carries: the guest columns or the host columns. */
export type SiteFooterVariant = "guest" | "host";

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
 * Splits a variant's entries into the bar's plain links and its dropdowns.
 * A group of one page is that page as a plain link, and an empty group is
 * left out, so no dropdown opens onto nothing.
 */
function navPlan(entries: readonly (SiteLinkCopy | SiteNavGroupCopy)[]): {links: SiteNavItem[]; menus: SiteNavGroupCopy[]} {
  const links: SiteNavItem[] = [];
  const menus: SiteNavGroupCopy[] = [];
  for (const entry of entries) {
    if (!isGroup(entry)) links.push(entry);
    else if (entry.links.length === 1) links.push(entry.links[0]);
    else if (entry.links.length > 1) menus.push(entry);
  }
  return {links, menus};
}

const trackNav = (link: SiteNavItem) => trackSiteCtaClick(`nav_${slugForTracking(link.label)}`, link.href);
const withNavTracking = (link: SiteNavItem): CatchTopBarAction => ({...link, onPressed: () => trackNav(link)});

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
  offer,
  showWhatsOn = true,
  title = publicSiteCopy.wordmark,
  variant = "guest",
  whatsOnHref,
}: {
  /** The page's own actions in place of the variant's primary action, such as the city picker and Get the app. */
  actions?: ReactNode;
  breadcrumbs?: SiteBreadcrumbs;
  /** A product page's own sections in place of the variant's links. */
  links?: readonly SiteNavItem[];
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
}) {
  const account = useContext(SiteAccountActionContext);
  const {brand, subBrand} = wordmarkParts(title);
  const minimal = variant === "minimal";
  const whatsOn = showWhatsOn ? [{...publicSiteCopy.whatsOn, href: whatsOnHref ?? publicSiteCopy.whatsOn.href}] : [];
  const plan = minimal ? {links: [], menus: []}
    : links ? {links: [...links], menus: []}
    : navPlan([...whatsOn, ...siteHeaderCopy[variant].nav]);
  // Below 600px the dropdowns draw nothing, so the phone menu lists their pages after the links.
  const menuLinks = plan.menus.flatMap((menu) => menu.links);
  const primary = actions ?? (minimal ? null : <PrimaryAction link={siteHeaderCopy[variant].action} />);
  return (
    <>
      {offer ? <SiteOfferStrip offer={offer} /> : null}
      <CatchTopBar
        account={minimal ? undefined : account?.bar}
        actions={(
          <>
            {plan.menus.map((menu) => (
              <CatchNavMenu align="end" key={menu.label} label={menu.label} links={menu.links} onLinkPressed={trackNav} />
            ))}
            {variant === "host" ? <HostWhatsAppAction /> : null}
            {primary}
          </>
        )}
        homeHref="/"
        links={plan.links.map(withNavTracking)}
        linksLabel={publicSiteCopy.menu.navLabel}
        menuExtras={minimal ? undefined : [...menuLinks.map(withNavTracking), ...(account ? [account.menu] : [])]}
        menuLabel={publicSiteCopy.menu.openLabel}
        siteMenu={minimal ? undefined : account?.phoneMenu?.([...plan.links, ...menuLinks], publicSiteCopy.menu.openLabel)}
        subBrand={subBrand}
        title={brand}
        variant="site"
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

/** The host bar's WhatsApp link, an icon with its name, before the free trial. */
function HostWhatsAppAction() {
  const {label, message} = siteHeaderCopy.host.whatsapp;
  return <CatchIconAction href={whatsappChatHref(message)} icon="chat" label={label} size="sm" variant="ghost" />;
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

// The footer's own type and colour. Beside a tagline it is underlined so it
// reads as a link; in a link column it matches its siblings.
const privacyChoicesText = {
  inline: {font: "inherit", textDecoration: "underline", textUnderlineOffset: "0.2em"},
  link: {font: "inherit", lineHeight: "inherit", textDecoration: "none", border: 0},
} as const;

/**
 * "Privacy choices": reopens the consent banner. It sits in each footer's
 * legal area in the surrounding colour and type, so no control floats over
 * the page once a choice exists.
 */
export function PrivacyChoicesButton({tone = "inline"}: {tone?: keyof typeof privacyChoicesText} = {}) {
  return (
    <CatchButton foregroundColor="currentColor" label={publicSiteCopy.privacyChoices} minimumSize={{width: 0, height: 0}}
      onPressed={openMarketingConsentPreferences} padding={0} recipe="text" textStyle={privacyChoicesText[tone]} />
  );
}

/**
 * The boards' short footer: the wordmark across from quiet links. The form,
 * offer, account and billing pages pass the site and legal links and the
 * operator line; the four default links wait for organiser pages served on
 * their own domain. Only a page that records site clicks passes
 * `onLinkPressed` (the private offer and form pages record none).
 */
export function PublicPageFooter({label = publicPageChromeCopy.footerLabel, links = publicPageChromeCopy.footerLinks, note, onLinkPressed}: {
  label?: string;
  links?: readonly SiteNavItem[];
  note?: string;
  onLinkPressed?: (link: SiteNavItem) => void;
}) {
  return (
    <CatchStack as="footer" gap={12}>
      <CatchStack align="center" direction="row" gap={12} justify="between" wrap>
        <CatchWordmark>{publicPageChromeCopy.wordmark}</CatchWordmark>
        <CatchStack aria-label={label} as="nav" direction="row" gap={4} wrap>
          {links.map((link) => (
            <CatchButton href={link.href} key={`${link.label}-${link.href}`} label={link.label}
              onPressed={onLinkPressed ? () => onLinkPressed(link) : undefined} size="sm" variant="quiet" />
          ))}
          <CatchButton label={publicSiteCopy.privacyChoices} onPressed={openMarketingConsentPreferences} size="sm" variant="quiet" />
        </CatchStack>
      </CatchStack>
      {note ? <CatchText tone="secondary" variant="body-meta">{note}</CatchText> : null}
    </CatchStack>
  );
}

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
  const pool: readonly SiteNavItem[] = [publicSiteCopy.whatsOn, ...siteFooterLegalLinks];
  return hrefs.map((href) => pool.find((link) => link.href === href)!);
}

/**
 * The footer's help band: a person answers on WhatsApp. Host pages add the
 * walkthrough. It states no hours.
 */
function FooterHelpBand({variant}: {variant: SiteFooterVariant}) {
  const band = siteFooterCopy.helpBand;
  const whatsapp = {href: whatsappChatHref(variant === "host" ? band.hostMessage : band.guestMessage), label: band.whatsapp};
  return (
    <>
      <CatchText as="h2" variant="title-bar">{band.title}</CatchText>
      <CatchStack direction="row" gap={8} wrap>
        <CatchButton href={whatsapp.href} label={whatsapp.label} leadingIcon="chat" onPressed={() => trackFooter(whatsapp)} size="sm" variant="light" />
        {variant === "host" ? (
          <CatchButton href={band.walkthrough.href} label={band.walkthrough.label} onPressed={() => trackFooter(band.walkthrough)} size="sm" variant="ghost" />
        ) : null}
      </CatchStack>
    </>
  );
}

/**
 * The one site footer on every public page: the ink band with its link
 * columns, each link flush with its column title on one row rhythm, then
 * the wordmark with the tagline on its baseline and the operator line.
 * Guest pages carry Explore, Hosts and Help and legal (and Cities where a
 * page lists them); host pages carry Product, Get started, the brand's
 * column and Legal. The last column ends with Privacy choices. The help band
 * leads the footer unless the page turns it off (ad landing pages, one-job
 * flows). A product page may name itself ("Catch for weddings") and give
 * its own line.
 */
export function PublicSiteFooter({
  appHref,
  cities,
  exploreHref,
  footnotes,
  helpBand = true,
  navLabel = siteFooterCopy.nav,
  tagline = siteFooterCopy.tagline,
  variant = "guest",
  wordmark = publicSiteCopy.wordmark,
}: {
  /** Where Get the app goes: the homepage's own band from the homepage. */
  appHref?: string;
  cities?: readonly SiteFooterCity[];
  /** Where What's on goes: a city page links its own plans. */
  exploreHref?: string;
  /** Numbered notes under the columns, such as a figure's source; each carries its own number. */
  footnotes?: readonly string[];
  /** The band across the top: a person answers on WhatsApp. */
  helpBand?: boolean;
  /** The footer nav's name; only a page showing several footers needs another. */
  navLabel?: string;
  tagline?: string;
  variant?: SiteFooterVariant;
  wordmark?: string;
}) {
  const {brand, subBrand} = wordmarkParts(wordmark);
  const groups = variant === "host" ? hostFooterGroups(exploreHref) : guestFooterGroups({appHref, cities, exploreHref});
  return (
    <CatchSiteFooter
      brandHref="/"
      brandLabel={brand}
      brandSubBrand={subBrand}
      columns={Math.min(5, Math.max(2, groups.length)) as CatchSiteFooterColumns}
      footnotes={footnotes}
      groups={groups}
      header={helpBand ? <FooterHelpBand variant={variant} /> : undefined}
      navLabel={navLabel}
      note={publicSiteCopy.footerOperator}
      onLinkPressed={trackFooter}
      tagline={tagline}
    />
  );
}

function guestFooterGroups({appHref, cities, exploreHref}: {appHref?: string; cities?: readonly SiteFooterCity[]; exploreHref?: string}): CatchSiteFooterGroup[] {
  const [whatsOn, app] = siteFooterCopy.explore;
  return [
    {title: siteFooterCopy.groups.explore, links: [{...whatsOn, href: exploreHref ?? whatsOn.href}, {...app, href: appHref ?? app.href}]},
    ...(cities ? [{title: siteFooterCopy.groups.cities, links: cities.map((city) => ({href: city.href, label: city.label, note: city.note ?? (city.soon ? siteFooterCopy.soon : undefined)}))}] : []),
    {title: siteFooterCopy.groups.hosts, links: siteFooterCopy.hosts},
    {title: siteFooterCopy.groups.help, links: siteLinks(siteFooterCopy.helpOrder), trailing: <PrivacyChoicesButton tone="link" />},
  ];
}

function hostFooterGroups(exploreHref?: string): CatchSiteFooterGroup[] {
  const {host, groups} = siteFooterCopy;
  const brandLinks = siteLinks(host.brandOrder).map((link) => link.href === publicSiteCopy.whatsOn.href && exploreHref ? {...link, href: exploreHref} : link);
  return [
    {title: groups.product, links: host.product},
    {title: groups.getStarted, links: host.getStarted},
    {title: groups.brand, links: brandLinks},
    {title: groups.legal, links: siteLinks(host.legalOrder), trailing: <PrivacyChoicesButton tone="link" />},
  ];
}
