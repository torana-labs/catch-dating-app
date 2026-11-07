import {CatchButton, CatchStack, CatchText} from "@catch/web-ui";
import {publicPageChromeCopy as copy} from "../../../content/organizerPage";
import {PublicSiteHeader} from "../../../shared/site";

/** The organiser and event pages' site top bar: the wordmark, Explore and For organisers, and Get the app. */
export function PublicPageHeader() {
  return <PublicSiteHeader actions={<CatchButton href={copy.getAppHref} label={copy.getApp} size="sm" />} links={copy.links} />;
}

/** The short footer that closes the organiser and event pages' main column: the wordmark across from four quiet links. */
export function PublicPageFooter() {
  return (
    <CatchStack align="center" as="footer" direction="row" gap={12} justify="between" wrap>
      <CatchText variant="display-xs">{copy.wordmark}</CatchText>
      <CatchStack aria-label={copy.footerLabel} as="nav" direction="row" gap={12} wrap>
        {copy.footerLinks.map((link) => <CatchButton href={link.href} key={link.label} label={link.label} size="sm" variant="quiet" />)}
      </CatchStack>
    </CatchStack>
  );
}
