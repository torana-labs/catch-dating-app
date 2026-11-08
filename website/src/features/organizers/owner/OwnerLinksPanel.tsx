import {CatchButton, CatchCheckboxInput, CatchField, CatchIconAction, CatchSection, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {ownerViewCopy} from "../../../content/ownerView";
import {ownerDayLabel, renderOwnerNotice} from "./OwnerInsightsPanel";
import type {OwnerViewController} from "./useOwnerViewController";

const copy = ownerViewCopy.links;

/** `datetime-local` value from an ISO time, in the visitor's zone. */
function localInput(iso: string | null): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return new Date(at.getTime() - at.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function isoFromLocal(value: string): string | null {
  if (!value) return null;
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/**
 * The link editor: every owner link with its clicks in the last 30 days,
 * edited in place (title, line, address, pin, end date), reordered with the
 * arrows, and saved in one replace through manageOrganizerOwnerPage, which
 * applies the page's link policy (https only, no shorteners).
 */
export function OwnerLinksPanel({controller, readAt}: {controller: OwnerViewController; readAt: number}) {
  const {links} = controller;
  return (
    <CatchStack gap={16}>
      <CatchSection action={{label: copy.add, onPressed: links.add}} dividers="none" note={copy.note} title={copy.title}>
        <CatchStack gap={12}>
          {links.items.length ? links.items.map(({link, index, clicks}) => {
            const name = link.label.trim() || copy.untitled;
            const ended = link.showUntil !== null && new Date(link.showUntil).getTime() <= readAt;
            const status = ended ? copy.endedStatus : link.pinned ? copy.pinnedStatus :
              link.showUntil ? copy.endsStatus(ownerDayLabel(link.showUntil.slice(0, 10))) : null;
            return (
              <CatchSurface key={link.id}>
                <CatchStack align="center" direction="row" gap={8} justify="between">
                  <CatchStack gap={2}>
                    <CatchText as="p" variant="title-row">{name}</CatchText>
                    <CatchText as="p" tone="secondary" variant="body-small">
                      {status ? `${copy.clicks(clicks)} · ${status}` : copy.clicks(clicks)}
                    </CatchText>
                  </CatchStack>
                  <CatchStack direction="row" gap={4}>
                    <CatchIconAction icon="moveUp" label={copy.moveUp(name)} onPressed={index > 0 ? () => links.moveUp(index) : null} size="sm" />
                    <CatchIconAction icon="moveDown" label={copy.moveDown(name)}
                      onPressed={index < links.items.length - 1 ? () => links.moveDown(index) : null} size="sm" />
                    <CatchIconAction icon="delete" label={copy.remove(name)} onPressed={() => links.remove(index)} size="sm" />
                  </CatchStack>
                </CatchStack>
                <CatchField maxLength={80} onChanged={(value) => links.change(index, {label: value})} recipe="input"
                  title={copy.labelField} value={link.label} />
                <CatchField maxLength={80} onChanged={(value) => links.change(index, {subtitle: value || null})} recipe="input"
                  title={copy.subtitleField} value={link.subtitle ?? ""} />
                <CatchField inputHint={copy.urlHint} keyboardType="url" onChanged={(value) => links.change(index, {url: value})}
                  recipe="input" title={copy.urlField} value={link.url} />
                <CatchField helperText={copy.showUntilHelp} keyboardType="datetime"
                  onChanged={(value) => links.change(index, {showUntil: isoFromLocal(value)})} recipe="input"
                  title={copy.showUntilField} value={localInput(link.showUntil)} />
                <CatchCheckboxInput label={copy.pinned} onChanged={(value) => links.change(index, {pinned: value})} value={link.pinned} />
              </CatchSurface>
            );
          }) : <CatchText as="p" tone="secondary" variant="body-small">{copy.empty}</CatchText>}
        </CatchStack>
      </CatchSection>
      {renderOwnerNotice({controller, failed: copy.failed, panel: "links", saved: copy.saved})}
      <CatchStack align="start">
        <CatchButton label={copy.save} onPressed={links.dirty ? links.save : null} status={links.busy ? "loading" : "idle"} />
      </CatchStack>
    </CatchStack>
  );
}
