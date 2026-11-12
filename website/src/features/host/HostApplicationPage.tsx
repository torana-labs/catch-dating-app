import {CatchButton, CatchRoot, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {hostPageCopy} from "@content/host";
import {hostLandingCopy} from "@content/hostLanding";
import {hostProductCopy} from "@content/hostProduct";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {HostApplicationFlow} from "./application/HostApplicationFlow";

// The landing's in-page anchors, from the application page.
const hostLandingPath = (anchor: string) => `/host/${anchor}`;

/** The host application (/host/apply/): the landing's header and footer around the application flow on the white ground. */
export function HostApplicationPage() {
  const copy = hostProductCopy.application;
  return (
    <CatchRoot theme="day">
      {/* The host top bar, as on the landing: its sections (on /host/) and Start free trial. */}
      <PublicSiteHeader actions={<CatchButton href={hostLandingPath("#start")} label={hostLandingCopy.header.start} size="sm" />}
        links={hostLandingCopy.header.nav.map((link) => ({...link, href: hostLandingPath(link.href)}))} title={hostLandingCopy.header.title} />
      <WebsitePageMain id="top">
        <CatchSurface aria-labelledby="host-apply-title" as="section" block="band" id="founding-hosts">
          <CatchStack gap={12}>
            <CatchStack align="start"><CatchButton href="/host/" label={copy.back} leadingIcon="back" size="sm" variant="quiet" /></CatchStack>
            <CatchText as="h1" id="host-apply-title" variant="page-title">{copy.title}</CatchText>
            <CatchText tone="secondary" variant="body-lead">{hostPageCopy.apply.body}</CatchText>
            <CatchText tone="secondary" variant="body-small">{copy.body}</CatchText>
            <CatchText tone="secondary" variant="body-small">{copy.note}</CatchText>
          </CatchStack>
          <HostApplicationFlow />
        </CatchSurface>
      </WebsitePageMain>
      <PublicSiteFooter tagline={hostLandingCopy.footer.tagline} />
    </CatchRoot>
  );
}
