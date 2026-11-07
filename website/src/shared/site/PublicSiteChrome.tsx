import {CatchButton, CatchStack, CatchSurface, CatchText, CatchTopBar} from "@catch/web-ui";
import type {ReactNode} from "react";
import {publicSiteCopy, siteFooterLegalLinks} from "../../content/site";
import {ConsumerHome} from "../ui/primitives/consumerHome";
import {SiteFooter, type SiteNavItem} from "./SiteFooter";
import {slugForTracking, trackSiteCtaClick} from "./siteTracking";

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
  return (
    <CatchTopBar
      actions={actions}
      homeHref="/"
      links={links.map((link) => ({...link, onPressed: () => trackSiteCtaClick(`nav_${slugForTracking(link.label)}`, link.href)}))}
      linksLabel={publicSiteCopy.menu.navLabel}
      menuLabel={publicSiteCopy.menu.openLabel}
      title={title}
      variant="site"
    />
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
