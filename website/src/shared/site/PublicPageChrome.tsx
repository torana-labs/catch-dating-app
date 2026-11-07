import {CatchButton, CatchStack, CatchText} from "@catch/web-ui";
import {publicPageChromeCopy as copy} from "../../content/organizerPage";
import {PublicSiteHeader} from "./PublicSiteChrome";
import type {SiteNavItem} from "./SiteFooter";

/** The rebuilt public pages' site top bar: the wordmark, Explore and For organisers, and Get the app. */
export function PublicPageHeader() {
  return <PublicSiteHeader actions={<CatchButton href={copy.getAppHref} label={copy.getApp} size="sm" />} links={copy.links} />;
}

/**
 * The boards' short footer: the wordmark across from quiet links. The
 * organiser and event pages close their main column with the four default
 * links; the claim, form and offer pages pass the site and legal links and
 * the operator line. Only a page that records site clicks passes
 * `onLinkPressed` (the private offer and form pages record none).
 */
export function PublicPageFooter({label = copy.footerLabel, links = copy.footerLinks, note, onLinkPressed}: {
  label?: string;
  links?: readonly SiteNavItem[];
  note?: string;
  onLinkPressed?: (link: SiteNavItem) => void;
}) {
  return (
    <CatchStack as="footer" gap={12}>
      <CatchStack align="center" direction="row" gap={12} justify="between" wrap>
        <CatchText variant="display-xs">{copy.wordmark}</CatchText>
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
