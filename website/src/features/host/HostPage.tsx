import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {HostLanding} from "../../shared/ui/primitives/hostLanding";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {renderHostSectionNav, renderHostLandingParticipation, renderHostLandingHero, renderHostLandingBenefits, renderHostFormatExplorer, renderHostLandingInsights, renderHostLandingAdoption, renderHostLandingFaq, renderHostLandingClose} from "./sections/hostLandingSections";

export function HostPage({captures}: {captures: CaptureSlots}) {
  return <HostLanding>
    <PublicSiteHeader />
    {renderHostSectionNav()}
    <WebsitePageMain id="top">
      {renderHostLandingHero(captures)}
      {renderHostLandingBenefits()}
      {renderHostFormatExplorer()}
      {renderHostLandingParticipation()}
      {renderHostLandingInsights()}
      {renderHostLandingAdoption()}
      {renderHostLandingFaq(captures)}
      {renderHostLandingClose()}
    </WebsitePageMain>
    <PublicSiteFooter />
  </HostLanding>;
}
