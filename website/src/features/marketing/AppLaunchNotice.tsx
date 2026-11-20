import {useState} from "react";
import {
  CatchBand,
  CatchBandHeader,
  CatchButton,
  CatchCheckboxInput,
  CatchConsentNote,
  CatchField,
  CatchGroundCard,
  CatchStack,
  CatchText,
  type CatchBandGround,
} from "@catch/web-ui";
import {homePageCopy} from "@content/homePage";
import {activePhoneCountry, websiteCities} from "@content/markets";
import {phoneFieldCopy} from "@content/phoneField";
import type {MarketCity} from "@content/markets/types";
import {Form} from "../../shared/ui/primitives";
import {useAppNoticeController} from "./useAppNoticeController";

/** The cities a visitor can ask about: every market city that is not paused, as the city picker lists them. */
const noticeCities: readonly MarketCity[] = websiteCities.filter((city) => city.status !== "paused");
/** The form opens on the first open city; the visitor picks theirs. */
const firstCity = noticeCities.find((city) => city.status === "live") ?? noticeCities[0];

function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/gu, (match, token: string) => values[token] ?? match);
}

export interface AppLaunchNoticeProps {
  readonly id: string;
  readonly ground: CatchBandGround;
  readonly kicker?: string;
  readonly title?: string;
  readonly lead?: string;
  /** The words only this page has, by key: `city`, the city field's label. */
  readonly labels: Readonly<Record<string, string>>;
}

/**
 * /app/'s "Get notified" band (the PlaybookStart board's app state): a
 * WhatsApp number and a city for one message the day the guest app is on
 * the stores, and new plans in that city only if ticked. It sends the same
 * request as the homepage's app band, through the same controller
 * (useAppNoticeController: joinWaitlist with notice appLaunch), with the
 * homepage's consent line and version; nothing else is sent.
 */
export function AppLaunchNotice({id, ground, kicker, title, lead, labels}: AppLaunchNoticeProps) {
  const [picked, setPicked] = useState<MarketCity | null>(null);
  const city = picked ?? firstCity;
  const notice = useAppNoticeController(city.label, undefined, {slug: city.slug, ...(picked ? {source: "picked" as const} : {})});
  const notify = homePageCopy.app.notify;
  return (
    <CatchBand ground={ground} id={id}>
      <CatchStack gap={24}>
        {title ? <CatchBandHeader ground={ground} kicker={kicker} lead={lead} title={title} /> : null}
        <CatchGroundCard ground={ground === "white" ? "paper" : "white"} padding="spacious">
          <CatchStack gap={12}>
            {notice.joined ? null : (
              <Form aria-label={title ?? notify.action} noValidate onSubmit={notice.handleSubmit} pending={notice.sending}>
                <CatchStack gap={12}>
                  <CatchField copy={phoneFieldCopy} countryCode={activePhoneCountry} errorText={notice.status.tone === "is-error" ? notice.status.message : null}
                    inputHint={notify.phoneHint} inputMode={notice.sending ? "inactive" : "editable"} onChanged={notice.setPhone}
                    recipe="phone" required title={notify.phone} value={notice.phone} />
                  <CatchField itemLabelBuilder={(item: MarketCity) => item.label} itemValueBuilder={(item: MarketCity) => item.slug}
                    onChanged={(item: MarketCity | null) => { if (item) setPicked(item); }} recipe="select" title={labels.city ?? ""} value={city} values={noticeCities} />
                  <CatchCheckboxInput label={fill(notify.newPlans, {city: city.label})} onChanged={notice.sending ? null : notice.setNewPlans} value={notice.newPlans} />
                  <CatchStack align="start">
                    <CatchButton label={notify.action} onPressed={() => undefined} size="lg" status={notice.sending ? "loading" : "idle"} type="submit" />
                  </CatchStack>
                  <CatchConsentNote href="/privacy/" linkLabel={notify.privacy} text={notify.consent} />
                </CatchStack>
              </Form>
            )}
            <CatchText aria-live="polite" as="p" role="status" variant="body">{notice.status.tone === "is-success" ? notice.status.message : ""}</CatchText>
          </CatchStack>
        </CatchGroundCard>
      </CatchStack>
    </CatchBand>
  );
}
