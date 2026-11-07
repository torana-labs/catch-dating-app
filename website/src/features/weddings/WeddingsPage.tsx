import {CatchButton, CatchRoot, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {weddingsCopy as copy} from "@content/weddings";
import {PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {WeddingsBands} from "./sections/weddingsBands";
import {useWeddingsLandingController} from "./useWeddingsController";

/** The foot band (ink): the product name across from what it is. */
function Foot() {
  return (
    <CatchStack as="footer" gap={0}>
      <CatchSurface block="band" color="ink">
        <CatchStack align="end" direction="row" gap={24} justify="between" wrap>
          <CatchText variant="display-section">{copy.foot.title}</CatchText>
          <CatchText tone="secondary" variant="body-small">{copy.foot.body}</CatchText>
        </CatchStack>
      </CatchSurface>
    </CatchStack>
  );
}

/**
 * Catch for weddings (/weddings/), band for band as the RbWebWeddings board on
 * the white ground in the nights-out format: the site top bar naming the
 * product and its sections, the board's bands and the foot band. Every
 * example is illustrative and runs nothing.
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
