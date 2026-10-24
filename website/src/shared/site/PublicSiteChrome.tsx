import {publicSiteCopy, siteFooterLegalLinks} from "../../content/site";
import {ConsumerHome} from "../ui/primitives/consumerHome";
import {SiteHeader} from "./SiteHeader";
import {SiteFooter} from "./SiteFooter";

// Every public route renders this one header and footer. Route-specific links
// belong in the page itself (for example the Host section navigation row).
export function PublicSiteHeader() {
  return <ConsumerHome><SiteHeader brandHref="/" menuCopy={publicSiteCopy.menu} nav={[...publicSiteCopy.nav]} actions={[]} /></ConsumerHome>;
}

export function PublicSiteFooter() {
  return <ConsumerHome><SiteFooter brandHref="/" body={publicSiteCopy.footerOperator} links={[...publicSiteCopy.nav, ...siteFooterLegalLinks]} /></ConsumerHome>;
}
