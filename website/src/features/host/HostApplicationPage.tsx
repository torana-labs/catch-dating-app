import {ArrowLeft} from "lucide-react";
import {hostPageCopy} from "@content/host";
import {hostLandingCopy} from "@content/hostLanding";
import {hostProductCopy} from "@content/hostProduct";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {PlainLink} from "../../shared/ui/primitives";
import {HostLanding, HostLandingHeading, HostLandingNote, HostLandingSection, HostSectionNav} from "../../shared/ui/primitives/hostLanding";
import {HostApplicationFlow} from "./application/HostApplicationFlow";

export function HostApplicationPage() {
  const copy = hostProductCopy.application;
  return <HostLanding>
    <PublicSiteHeader />
    <HostSectionNav aria-label={hostLandingCopy.navLabel}><PlainLink href="/host/"><ArrowLeft size={15} aria-hidden="true" />{copy.back}</PlainLink></HostSectionNav>
    <WebsitePageMain id="top">
      <HostLandingSection variant="apply" id="founding-hosts" aria-labelledby="host-apply-title">
        <HostLandingHeading>
          <h1 id="host-apply-title">{copy.title}</h1>
          <p>{hostPageCopy.apply.body}</p>
          <HostLandingNote>{copy.body}</HostLandingNote>
          <HostLandingNote>{copy.note}</HostLandingNote>
        </HostLandingHeading>
        <HostApplicationFlow />
      </HostLandingSection>
    </WebsitePageMain>
    <PublicSiteFooter />
  </HostLanding>;
}
