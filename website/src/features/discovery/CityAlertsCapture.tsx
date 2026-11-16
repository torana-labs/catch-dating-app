import {CatchButton, CatchCtaSection, CatchField, CatchStack, CatchText, type CatchBandGround} from "@catch/web-ui";
import {cityAlertsCopy as copy} from "@content/discovery/cityAlerts";
import {interpolateContent as fill} from "@content/interpolate";
import {activeMarket} from "@content/markets";
import {Form} from "../../shared/ui/primitives";
import {cityAlertsAnchor, type CityAlertInterest, type CityAlertPlace} from "./cityAlertsModel";
import {useCityAlertsController, type CityAlertsController} from "./useCityAlertsController";

/** The form itself: the number, Notify me, the consent line and the privacy link, then the sent line. */
function CityAlertsForm({alerts, city}: {alerts: CityAlertsController; city: string}) {
  return (
    <CatchStack gap={12}>
      {alerts.sent ? null : (
        <Form noValidate onSubmit={alerts.handleSubmit} pending={alerts.sending}>
          <CatchStack gap={12}>
            <CatchField autoComplete="tel-national" errorText={alerts.error} inputMode={alerts.sending ? "inactive" : "editable"}
              keyboardType="phone" onChanged={alerts.setPhone} prefixText={activeMarket.dialCode} recipe="input" required
              title={copy.phone} value={alerts.phone} />
            <CatchButton label={copy.action} onPressed={() => undefined} status={alerts.sending ? "loading" : "idle"} type="submit" />
            <CatchText tone="secondary" variant="body-small">{fill(copy.consent, {city})}</CatchText>
            <CatchStack align="start"><CatchButton href="/privacy/" label={copy.privacy} size="sm" variant="quiet" /></CatchStack>
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
}

/**
 * The closing "hear about new plans first" band of Explore, the city pages
 * and the discovery pages (the kit's KitFinal with its WhatsApp form): a
 * CatchCtaSection whose capture sends a city_alerts website lead.
 */
export function CityAlertsCapture({place, interests, title, kicker, ground = "coral"}: CityAlertsCaptureProps) {
  const alerts = useCityAlertsController(place, interests);
  const city = place.cityLabel;
  return (
    <CatchCtaSection
      capture={<CityAlertsForm alerts={alerts} city={city} />}
      ground={ground}
      id={cityAlertsAnchor}
      kicker={kicker ?? copy.kicker}
      lead={copy.lead}
      title={title ?? fill(copy.title, {city})}
    />
  );
}
