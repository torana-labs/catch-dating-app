import {CatchCtaSection, CatchText, type CatchBandGround} from "@catch/web-ui";
import {cityAlertsCopy as copy} from "@content/discovery/cityAlerts";
import {interpolateContent as fill} from "@content/interpolate";
import {playbookCopy} from "@content/playbook/playbookCopy";
import {whatsappChatHref} from "@content/site";
import type {ReactNode} from "react";

/** The band's anchor, which every page's "Get notified" action points at. */
export const cityAlertsAnchor = "notify";

export interface CityAlertsCaptureProps {
  city: string;
  /** What the WhatsApp button types for the person; defaults to new plans in the city. */
  message?: string;
  /** The band's headline and kicker; default to "Get new plans in {city} on WhatsApp." */
  title?: string;
  kicker?: string;
  ground?: CatchBandGround;
  /** The app screen beside the words, as the board's phone. */
  media?: ReactNode;
}

/**
 * The closing "hear about new plans first" band of Explore, the city pages
 * and the discovery pages (the kit's KitFinal): a CatchCtaSection whose
 * action opens a WhatsApp chat naming the city, with the reply line beside
 * it. No form renders until the website lead client can send one.
 */
export function CityAlertsCapture({city, message, title, kicker, ground = "coral", media}: CityAlertsCaptureProps) {
  return (
    <CatchCtaSection
      actions={[{label: copy.action, href: whatsappChatHref(message ?? fill(copy.message, {city})), newTab: true}]}
      capture={<CatchText tone="secondary" variant="body-meta">{playbookCopy.whatsappReply}</CatchText>}
      flush={media != null}
      ground={ground}
      id={cityAlertsAnchor}
      kicker={kicker ?? copy.kicker}
      lead={fill(copy.lead, {city})}
      media={media}
      title={title ?? fill(copy.title, {city})}
    />
  );
}
