import {
  CatchBadge,
  CatchBandHeader,
  CatchButton,
  CatchDateTile,
  CatchEmptyState,
  CatchGrid,
  CatchIndexRow,
  CatchPhotoTile,
  CatchSection,
  CatchStack,
  CatchText,
} from "@catch/web-ui";
import {useId} from "react";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/**
 * Coming up: Catch events and imported events in one list, soonest first,
 * as the board's event rows. Each row has its date tile, where and when,
 * where it is sold with the price and the places left, and its action; the
 * row opens the event page, or for an imported event the page that sells it.
 */
export function OrganizerEventsSection({controller}: {controller: OrganizerPageController}) {
  const {events, name} = controller.view;
  const titleId = `${useId()}-title`;
  return (
    <CatchStack aria-labelledby={titleId} as="section" gap={8} id="events">
      <CatchStack align="end" direction="row" gap={12} justify="between" wrap>
        <CatchBandHeader size="feature" title={copy.eventsTitle} titleId={titleId} />
        {events.rows.length ? <CatchText as="p" tone="secondary" variant="body-small">{events.note}</CatchText> : null}
      </CatchStack>
      <CatchSection
        dividers="between"
        empty={<CatchEmptyState message={copy.eventsEmptyBody(name)} title={copy.eventsEmptyTitle} />}
      >
        {events.rows.map((row) => (
          <CatchIndexRow
            density="roomy"
            footer={(
              <>
                <CatchBadge label={row.sourceLabel} size="sm" tone={row.source === "catch" ? "brand" : "affinity"} />
                {row.womenLed ? <CatchBadge label={copy.labels.womenLed} size="sm" tone="success" /> : null}
                <CatchText as="span" variant="label-action">{row.price}</CatchText>
                {/* An imported row names its seller in the tag and on its button already. */}
                {row.source === "catch" && row.note ? <CatchText as="span" tone="secondary" variant="body-meta">{row.note}</CatchText> : null}
              </>
            )}
            href={row.href}
            key={row.key}
            leading={<CatchDateTile dateTime={row.date.dateTime} day={row.date.day} ground={row.ground} month={row.date.month}
              weekday={row.date.weekday} />}
            onTap={() => controller.openEvent(row)}
            subtitle={row.detail}
            title={row.title}
            trailing={(
              <CatchButton isInteractive={false} label={row.action} onPressed={null} size="sm"
                trailingIcon={row.source === "external" ? "openExternal" : undefined} variant={row.actionPrimary ? "primary" : "secondary"} />
            )}
            wrap
          />
        ))}
      </CatchSection>
    </CatchStack>
  );
}

/**
 * What it's like: past photos alternating with what the numbers say, or what
 * a generated page found with the slot its photos will fill. Four across on a
 * wide page, two on a phone. A figure shows only when the page has the data
 * behind it.
 */
export function OrganizerMomentsSection({controller}: {controller: OrganizerPageController}) {
  const {moments} = controller.view;
  const titleId = `${useId()}-title`;
  if (!moments.tiles.length) return null;
  return (
    <CatchStack aria-labelledby={titleId} as="section" gap={16}>
      <CatchBandHeader size="feature" title={moments.title} titleId={titleId} />
      <CatchGrid columns={4} compactColumns={2}>
        {moments.tiles.map((tile) => (
          <CatchPhotoTile caption={tile.caption} figure={tile.figure} ground={tile.ground} imageAlt={tile.imageAlt}
            imageUrl={tile.imageUrl} key={tile.key} placeholder={tile.placeholder} title={tile.title} />
        ))}
      </CatchGrid>
    </CatchStack>
  );
}
