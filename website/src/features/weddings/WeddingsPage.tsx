import {CatchButton, CatchRoot, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {weddingsCopy as copy} from "@content/weddings";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {WeddingsBands} from "./sections/weddingsBands";
import {useWeddingsLandingController} from "./useWeddingsController";

/** The one site footer, named for weddings, with the product's line. */
function Foot() {
  return <PublicSiteFooter tagline={copy.foot.body} wordmark={copy.foot.title} />;
}

/**
 * Catch for weddings (/weddings/), band for band as the RbWebWeddings board on
 * the white ground in the nights-out format: the site top bar naming the
 * product and its sections, the board's bands and the foot band. Programme
 * screens are capture slots (`captures`, src/app/marketingCaptures.ts); every
 * example is fictional.
 */
export function WeddingsPage({captures}: {captures: CaptureSlots}) {
  const landing = useWeddingsLandingController();
  return (
    <CatchRoot format="nightsOut" theme="day">
      <PublicSiteHeader actions={<CatchButton href="#apply" label={copy.header.apply} size="sm" />} links={copy.header.nav} title={copy.header.title} />
      <WebsitePageMain id="top">
        <WeddingsBands captures={captures} landing={landing} />
      </WebsitePageMain>
      <Foot />
    </CatchRoot>
  );
}
