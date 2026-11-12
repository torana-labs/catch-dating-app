import {CatchButton, CatchRoot, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {weddingsCopy as copy} from "@content/weddings";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {WeddingsBands} from "./sections/weddingsBands";
import {useWeddingsLandingController} from "./useWeddingsController";

/** The foot band (ink): the product name across from what it is. */
function Foot() {
  return (
    <CatchStack as="footer" gap={0}>
      <CatchSurface block="band" color="ink" padding="md">
        <CatchStack align="end" collapseBelow="medium" direction="row" equal gap={12}>
          <CatchText variant="display-xl">{copy.foot.title}</CatchText>
          <CatchText tone="secondary" variant="body-small">{copy.foot.body}</CatchText>
        </CatchStack>
      </CatchSurface>
    </CatchStack>
  );
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
