import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {HostLanding} from "../../shared/ui/primitives/hostLanding";
import type {HostCaptureMap} from "./sections/CaptureFrames";
import {renderHostSectionNav, renderHostLandingParticipation, renderHostLandingHero, renderHostLandingBenefits, renderHostFormatExplorer, renderHostLandingInsights, renderHostLandingAdoption, renderHostLandingFaq, renderHostLandingClose} from "./sections/hostLandingSections";

export function HostPage(_props: {captures: HostCaptureMap}) {
  return <HostLanding>
    <PublicSiteHeader />
    {renderHostSectionNav()}
    <WebsitePageMain id="top">
      {renderHostLandingHero()}
      {renderHostLandingBenefits()}
      {renderHostFormatExplorer()}
      {renderHostLandingParticipation()}
      {renderHostLandingInsights()}
      {renderHostLandingAdoption()}
      {renderHostLandingFaq()}
      {renderHostLandingClose()}
    </WebsitePageMain>
    <PublicSiteFooter />
  </HostLanding>;
}
