import {CatchBand, CatchBandHeader, CatchCardGrid, CatchGrid, CatchPhotoTile, CatchStack} from "@catch/web-ui";
import {useId} from "react";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/**
 * Coming up: Catch events and imported events in one card grid, soonest
 * first. Each card has the date and time, the place, the price, the places
 * left and where it is sold; a Catch card opens its event page and an
 * imported one the page that sells it. Without a photo the card's poster
 * shows the date, as the board's date tile does.
 */
export function OrganizerEventsSection({controller}: {controller: OrganizerPageController}) {
  const {events, name} = controller.view;
  return (
    <CatchCardGrid
      empty={{title: copy.eventsEmptyTitle, message: copy.eventsEmptyBody(name)}}
      id="events"
      items={events.rows.map((row) => ({
        id: row.key,
        availability: row.availability,
        detail: row.place,
        format: row.format ?? null,
        href: row.href,
        label: row.cardLabel,
        onClick: () => controller.openEvent(row),
        photoUrl: row.photoUrl,
        posterLabel: row.posterLabel,
        price: row.price,
        title: row.title,
      }))}
      kind="plan"
      lead={events.rows.length ? events.note : undefined}
      title={copy.eventsTitle}
    />
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
    <CatchBand aria-labelledby={titleId} as="section" pt="compact" width="content">
      <CatchStack gap={24}>
        <CatchBandHeader title={moments.title} titleId={titleId} />
        <CatchGrid columns={4} compactColumns={2}>
          {moments.tiles.map((tile) => (
            <CatchPhotoTile caption={tile.caption} figure={tile.figure} ground={tile.ground} imageAlt={tile.imageAlt}
              imageUrl={tile.imageUrl} key={tile.key} placeholder={tile.placeholder} title={tile.title} />
          ))}
        </CatchGrid>
      </CatchStack>
    </CatchBand>
  );
}
