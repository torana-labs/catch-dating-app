import {CatchButton, CatchField, CatchIndexRow, CatchSection, CatchStack, CatchText} from "@catch/web-ui";
import {ownerViewCopy} from "../../../content/ownerView";
import type {OrganizerEventView} from "../organizerPageView";
import {renderOwnerNotice} from "./OwnerInsightsPanel";
import type {OwnerViewController} from "./useOwnerViewController";

const copy = ownerViewCopy;
/** The Catch Host page, with the store links, until Host takes event deep links. */
export const ownerHostHref = "/host/";

/**
 * The page's address and custom domain, Pixel and GA4 (the existing tracking
 * settings, owner only), and the page's upcoming events with "Open in Catch
 * Host": events and live tools stay in the Host app.
 */
export function OwnerSettingsPanel({controller, displayUrl, events}: {
  controller: OwnerViewController;
  displayUrl: string;
  events: readonly OrganizerEventView[];
}) {
  const {tracking, can} = controller;
  // Imported events are sold elsewhere; only Catch events open in Host.
  const hostEvents = events.filter((event) => event.source !== "external").slice(0, 6);
  return (
    <CatchStack gap={24}>
      {can("settings") ? (
        <>
          <CatchSection dividers="between" title={copy.settings.addressTitle}>
            <CatchIndexRow subtitle={copy.settings.addressNote} title={displayUrl} wrap />
            <CatchIndexRow subtitle={copy.settings.customDomainNote} title={copy.settings.customDomain} wrap />
          </CatchSection>
          <CatchSection dividers="none" note={copy.settings.trackingNote} title={copy.settings.trackingTitle}>
            {tracking.ready ? (
              <CatchStack gap={12}>
                {!tracking.canEdit ? <CatchText as="p" tone="secondary" variant="body-small">{copy.settings.blocked}</CatchText> : null}
                <CatchField inputHint={copy.settings.pixelHint} keyboardType="number" maxLength={20}
                  onChanged={tracking.changePixel} recipe="input" title={copy.settings.pixelField} value={tracking.pixel} />
                <CatchField inputHint={copy.settings.gaHint} maxLength={22} onChanged={tracking.changeGa} recipe="input"
                  title={copy.settings.gaField} value={tracking.ga} />
                <CatchStack align="start">
                  <CatchButton label={copy.settings.save} onPressed={tracking.canEdit ? tracking.save : null}
                    status={tracking.busy ? "loading" : "idle"} />
                </CatchStack>
                {renderOwnerNotice({controller, failed: copy.settings.failed, panel: "settings", saved: copy.settings.saved})}
              </CatchStack>
            ) : <CatchText as="p" tone="secondary" variant="body-small">{copy.settings.loading}</CatchText>}
          </CatchSection>
        </>
      ) : null}
      {can("openInHost") ? (
        <CatchSection action={{label: copy.host.getApp, href: ownerHostHref}} dividers="between" note={copy.host.note}
          title={copy.host.title}>
          {hostEvents.length ? hostEvents.map((event) => (
            <CatchIndexRow action={{label: copy.host.open}} date={{day: event.date.weekday, date: event.date.day, format: event.format}}
              href={ownerHostHref} key={event.key}
              subtitle={event.detail} title={event.title} wrap />
          )) : <CatchText as="p" tone="secondary" variant="body-small">{copy.host.empty}</CatchText>}
        </CatchSection>
      ) : null}
    </CatchStack>
  );
}
