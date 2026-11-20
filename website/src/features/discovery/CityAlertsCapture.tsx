import {CatchButton, CatchCtaSection, CatchField, CatchStack, CatchText, type CatchBandGround} from "@catch/web-ui";
import {cityAlertsCopy as copy} from "@content/discovery/cityAlerts";
import {interpolateContent as fill} from "@content/interpolate";
import type {ReactNode} from "react";
import {Form} from "../../shared/ui/primitives";
import type {CityAlertInterest, CityAlertPlace} from "./cityAlertsModel";
import {useCityAlertsController, type CityAlertsController} from "./useCityAlertsController";
import {phoneFieldCopy} from "@content/phoneField";
import {activePhoneCountry} from "@content/markets";

/** The band's anchor, which every page's "Get notified" action points at. */
export const cityAlertsAnchor = "notify";

/**
 * The board's form: the number and Notify me on one row (stacked on a
 * phone), then the consent line with the privacy policy across from it, and
 * the sent line once a person will reply.
 */
function CityAlertsForm({alerts, city}: {alerts: CityAlertsController; city: string}) {
  return (
    <CatchStack gap={12}>
      {alerts.sent ? null : (
        <Form noValidate onSubmit={alerts.handleSubmit} pending={alerts.sending}>
          <CatchStack gap={8}>
            <CatchStack collapseBelow="medium" direction="row" gap={8} railWidth="fit">
              <CatchField copy={phoneFieldCopy} countryCode={activePhoneCountry} errorText={alerts.error}
                inputMode={alerts.sending ? "inactive" : "editable"} labelMode="hidden" onChanged={alerts.setPhone} recipe="phone" required
                title={copy.phone} value={alerts.phone} />
              <CatchButton label={copy.action} onPressed={() => undefined} status={alerts.sending ? "loading" : "idle"} type="submit" />
            </CatchStack>
            <CatchStack direction="row" gap={8} railWidth="fit">
              <CatchText tone="secondary" variant="body-meta">{fill(copy.consent, {city})}</CatchText>
              <CatchButton href="/privacy/" label={copy.privacy} size="sm" variant="quiet" />
            </CatchStack>
          </CatchStack>
        </Form>
      )}
      <CatchText aria-live="polite" as="p" role="status" variant="body">{alerts.sent ? copy.sent : ""}</CatchText>
    </CatchStack>
  );
}

export interface CityAlertsCaptureProps {
  place: CityAlertPlace;
  interests: readonly CityAlertInterest[];
  /** The band's headline and kicker; default to "Get new plans in {city} on WhatsApp." */
  title?: string;
  kicker?: string;
  ground?: CatchBandGround;
  /** The app screen beside the words, as the board's phone. */
  media?: ReactNode;
}

/**
 * The closing "hear about new plans first" band of Explore, the city pages
 * and the discovery pages (the kit's KitFinal with its WhatsApp form): a
 * CatchCtaSection whose capture sends a city_alerts website lead through the
 * site's lead client, with App Check.
 */
export function CityAlertsCapture({place, interests, title, kicker, ground = "coral", media}: CityAlertsCaptureProps) {
  const alerts = useCityAlertsController(place, interests);
  const city = place.cityLabel;
  return (
    <CatchCtaSection
      capture={<CityAlertsForm alerts={alerts} city={city} />}
      flush={media != null}
      ground={ground}
      id={cityAlertsAnchor}
      kicker={kicker ?? copy.kicker}
      lead={copy.lead}
      media={media}
      title={title ?? fill(copy.title, {city})}
    />
  );
}
