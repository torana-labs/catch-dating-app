import {CatchButton, CatchRoot} from "@catch/web-ui";
import {weddingsCopy as copy} from "@content/weddings";
import {PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {Follow} from "./sections/weddingsFollowSections";
import {Foot, Hero, MessagesAndFamily, Pilot, Pricing, Problem, Questions, Team} from "./sections/weddingsLandingSections";
import {useWeddingsLandingController, type WeddingsLandingController} from "./useWeddingsController";

/** The landing's bands in the board's order, for the page and its stories. */
export function WeddingsBands({landing}: {landing: WeddingsLandingController}) {
  return (
    <>
      <Hero />
      <Problem />
      <Follow landing={landing} />
      <Team />
      <MessagesAndFamily />
      <Pricing />
      <Pilot landing={landing} />
      <Questions />
    </>
  );
}

/**
 * Catch for weddings (/weddings/), band for band as the RbWebWeddings board on
 * the white ground in the nights-out format: the site top bar naming the
 * product, the running-order hero, why planners switch, one wedding followed
 * through six chapters, the team, messages and the family, pricing, the pilot
 * with the step-1 card, questions and the foot band. Every example is
 * illustrative and runs nothing.
 */
export function WeddingsPage() {
  const landing = useWeddingsLandingController();
  return (
    <CatchRoot format="nightsOut" theme="day">
      <PublicSiteHeader actions={<CatchButton href="#apply" label={copy.header.apply} size="sm" />} links={copy.header.nav} title={copy.header.title} />
      <WebsitePageMain id="top">
        <WeddingsBands landing={landing} />
      </WebsitePageMain>
      <Foot />
    </CatchRoot>
  );
}
