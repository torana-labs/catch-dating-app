import {CatchButton, CatchSiteFooter, CatchStack, CatchText, CatchTopBar, CatchWordmark, type CatchSiteFooterGroup} from "@catch/web-ui";
import {createContext, useContext, type ReactNode} from "react";
import {openMarketingConsentPreferences} from "../../analytics";
import {publicPageChromeCopy, publicSiteCopy, siteFooterCopy, siteFooterLegalLinks} from "../../content/site";
import {slugForTracking, trackSiteCtaClick} from "./siteTracking";

/**
 * The header's account entry ("Sign in" or "Account"). The app shell provides
 * it from the account feature, so shared chrome never imports a feature; a
 * story or test without the provider draws the header without it.
 */
export interface SiteAccountEntry {
  /** The top bar's button, the last item of its left group on wide pages. */
  bar: ReactNode;
  /** The same entry in the phone menu, where the bar has no room for it. */
  menu: {label: string; href?: string; onPressed?: () => void};
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
 * The one public header, the system's site top bar, on every public route:
 * the wordmark (catch.wordmark), the page links and the visitor's account
 * entry on the left; on the right only the page's actions, a setting such as
 * the city and then the one primary action. General pages carry the main
 * site's links and "Get the app"; a product page names itself and passes its
 * own sections and action, as the host landing does ("Catch for hosts", its
 * sections and Start free trial).
 */
export function PublicSiteHeader({title = publicSiteCopy.wordmark, links = publicSiteCopy.nav, actions = <GetTheAppButton />}: {
  title?: string;
  links?: readonly SiteNavItem[];
  actions?: ReactNode;
}) {
  const account = useContext(SiteAccountActionContext);
  const {brand, subBrand} = wordmarkParts(title);
  return (
    <CatchTopBar
      account={account?.bar}
      actions={actions}
      homeHref="/"
      links={links.map((link) => ({...link, onPressed: () => trackSiteCtaClick(`nav_${slugForTracking(link.label)}`, link.href)}))}
      linksLabel={publicSiteCopy.menu.navLabel}
      menuExtras={account ? [account.menu] : undefined}
      menuLabel={publicSiteCopy.menu.openLabel}
      subBrand={subBrand}
      title={brand}
      variant="site"
    />
  );
}

function GetTheAppButton() {
  return <CatchButton href={publicSiteCopy.getApp.href} label={publicSiteCopy.getApp.label} size="sm" />;
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

/** The organiser and event pages' top bar: the same header as every general page. */
export function PublicPageHeader() {
  return <PublicSiteHeader />;
}

/**
 * The boards' short footer: the wordmark across from quiet links. The
 * organiser and event pages close their main column with the four default
 * links; the claim, form and offer pages pass the site and legal links and
 * the operator line. Only a page that records site clicks passes
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

/**
 * The one site footer on every public page: the ink band with Explore,
 * Hosts and Help and legal (and Cities where a page lists them), each link
 * flush with its column title on one row rhythm, then the wordmark with the
 * tagline on its baseline and the operator line. Help and legal ends with
 * Privacy choices. A product page may name itself ("Catch for weddings")
 * and give its own line; the columns stay the same everywhere.
 */
export function PublicSiteFooter({appHref, cities, exploreHref, tagline = siteFooterCopy.tagline, wordmark = publicSiteCopy.wordmark}: {
  /** Where Get the app goes: the homepage's own band from the homepage. */
  appHref?: string;
  cities?: readonly SiteFooterCity[];
  /** Where What's on goes: a city page links its own plans. */
  exploreHref?: string;
  tagline?: string;
  wordmark?: string;
}) {
  const {brand, subBrand} = wordmarkParts(wordmark);
  const [whatsOn, organisers, app] = siteFooterCopy.explore;
  const help = siteFooterCopy.helpOrder.map((href) => siteFooterLegalLinks.find((link) => link.href === href)!);
  const groups: CatchSiteFooterGroup[] = [
    {title: siteFooterCopy.groups.explore, links: [{...whatsOn, href: exploreHref ?? whatsOn.href}, organisers, {...app, href: appHref ?? app.href}]},
    ...(cities ? [{title: siteFooterCopy.groups.cities, links: cities.map((city) => ({href: city.href, label: city.label, note: city.note ?? (city.soon ? siteFooterCopy.soon : undefined)}))}] : []),
    {title: siteFooterCopy.groups.hosts, links: siteFooterCopy.hosts},
    {title: siteFooterCopy.groups.help, links: help, trailing: <PrivacyChoicesButton tone="link" />},
  ];
  return (
    <CatchSiteFooter
      brandHref="/"
      brandLabel={brand}
      brandSubBrand={subBrand}
      groups={groups}
      navLabel={siteFooterCopy.nav}
      note={publicSiteCopy.footerOperator}
      onLinkPressed={(link) => trackSiteCtaClick(`footer_${slugForTracking(link.label)}`, link.href)}
      tagline={tagline}
    />
  );
}
