import {CatchButton, CatchStack, CatchSurface, CatchText, CatchTopBar} from "@catch/web-ui";
import {createContext, useContext, type ReactNode} from "react";
import {publicPageChromeCopy, publicSiteCopy, siteFooterLegalLinks} from "../../content/site";
import {ConsumerHome} from "../ui/primitives/consumerHome";
import {SiteFooter, type SiteNavItem} from "./SiteFooter";
import {slugForTracking, trackSiteCtaClick} from "./siteTracking";

/**
 * The header's account entry ("Sign in" or "Account"). The app shell provides
 * it from the account feature, so shared chrome never imports a feature; a
 * story or test without the provider draws the header without it.
 */
const SiteAccountActionContext = createContext<ReactNode>(null);
export const SiteAccountActionProvider = SiteAccountActionContext.Provider;

/**
 * The one public header, the system's site top bar: the wordmark, page links
 * (a menu on phones) and actions. Every public route renders it with the
 * global destinations; a product page may name itself and its own sections,
 * as the host landing does ("Catch for hosts", its sections and Apply).
 */
export function PublicSiteHeader({title = publicSiteCopy.wordmark, links = publicSiteCopy.nav, actions}: {
  title?: string;
  links?: readonly SiteNavItem[];
  actions?: ReactNode;
}) {
  const account = useContext(SiteAccountActionContext);
  return (
    <CatchTopBar
      actions={account ? <CatchStack align="center" direction="row" gap={8}>{account}{actions}</CatchStack> : actions}
      homeHref="/"
      links={links.map((link) => ({...link, onPressed: () => trackSiteCtaClick(`nav_${slugForTracking(link.label)}`, link.href)}))}
      linksLabel={publicSiteCopy.menu.navLabel}
      menuLabel={publicSiteCopy.menu.openLabel}
      title={title}
      variant="site"
    />
  );
}

/** The rebuilt public pages' site top bar: the wordmark, Explore and For organisers, and Get the app. */
export function PublicPageHeader() {
  return <PublicSiteHeader actions={<CatchButton href={publicPageChromeCopy.getAppHref} label={publicPageChromeCopy.getApp} size="sm" />} links={publicPageChromeCopy.links} />;
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
        <CatchText variant="display-xs">{publicPageChromeCopy.wordmark}</CatchText>
        <CatchStack aria-label={label} as="nav" direction="row" gap={4} wrap>
          {links.map((link) => (
            <CatchButton href={link.href} key={`${link.label}-${link.href}`} label={link.label}
              onPressed={onLinkPressed ? () => onLinkPressed(link) : undefined} size="sm" variant="quiet" />
          ))}
        </CatchStack>
      </CatchStack>
      {note ? <CatchText tone="secondary" variant="body-meta">{note}</CatchText> : null}
    </CatchStack>
  );
}

/** The footer of routes not yet rebuilt on the system. */
export function PublicSiteFooter() {
  return <ConsumerHome><SiteFooter brandHref="/" body={publicSiteCopy.footerOperator} links={[...publicSiteCopy.nav, ...siteFooterLegalLinks]} /></ConsumerHome>;
}

/** One footer column: a kicker over its links. */
export interface SiteFooterColumn {
  title: string;
  links: readonly SiteNavItem[];
}

/**
 * The system pages' footer: an ink band with link columns (left out on a
 * product page that keeps it short), then the wordmark and the tagline.
 */
export function SiteFooterBand({columns, label, tagline, wordmark}: {
  columns?: readonly SiteFooterColumn[];
  label: string;
  tagline: string;
  wordmark: string;
}) {
  return (
    <CatchStack as="footer" gap={0}>
      <CatchSurface block="band" color="ink">
        {columns ? (
          <CatchStack aria-label={label} as="nav" collapseBelow="medium" direction="row" equal gap={24}>
            {columns.map((column) => (
              <CatchStack gap={8} key={column.title}>
                <CatchText tone="secondary" variant="label-kicker">{column.title}</CatchText>
                {column.links.map((link) => (
                  <CatchStack align="start" key={`${column.title}-${link.label}`}>
                    <CatchButton href={link.href} label={link.label} onPressed={() => trackSiteCtaClick(`footer_${slugForTracking(link.label)}`, link.href)}
                      size="sm" variant="quiet" />
                  </CatchStack>
                ))}
              </CatchStack>
            ))}
          </CatchStack>
        ) : null}
        <CatchStack align="end" direction="row" gap={16} justify="between" wrap>
          <CatchText variant="display-xl">{wordmark}</CatchText>
          <CatchText tone="secondary" variant="body-small">{tagline}</CatchText>
        </CatchStack>
      </CatchSurface>
    </CatchStack>
  );
}
