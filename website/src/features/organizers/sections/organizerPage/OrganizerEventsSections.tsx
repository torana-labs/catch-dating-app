import {
  CatchButton,
  CatchDateTile,
  CatchGap,
  CatchGrid,
  CatchGroundCard,
  CatchIcon,
  CatchIndexRow,
  CatchPhotoTile,
  CatchText,
} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerPageController} from "../../useOrganizerPageController";
import {organizerSectionHeading} from "./organizerSectionHeading";

/** Catch events and imported events in one list, soonest first, each with where it is sold. */
export function OrganizerEventsSection({controller}: {controller: OrganizerPageController}) {
  const {events, name} = controller.view;
  return (
    <CatchGap aria-labelledby="organizer-events-title" as="section" id="events" size="inline">
      {organizerSectionHeading({id: "organizer-events-title", title: copy.eventsTitle, note: events.rows.length ? events.note : undefined})}
      {events.rows.length ? (
        <CatchGap as="ul" size="headerTitleToSubtitle">
          {events.rows.map((row) => (
            <CatchGap as="li" key={row.key} size="headerTitleToSubtitle">
              <CatchIndexRow
                footer={(
                  <>
                    <CatchText as="span" color={row.sourceAccent} variant="statusLabel">{row.sourceLabel}</CatchText>{" "}
                    <CatchText as="span" variant="titleS">{row.price}</CatchText>
                    {row.note ? <>{" "}<CatchText as="span" color="ink2" variant="bodyS">{row.note}</CatchText></> : null}
                  </>
                )}
                href={row.href}
                leading={<CatchDateTile dateTime={row.date.dateTime} day={row.date.day} ground={row.ground} month={row.date.month} weekday={row.date.weekday} />}
                onTap={() => controller.openEvent(row)}
                subtitle={row.detail}
                title={row.title}
                titleMaxLines={2}
                titleVariant="sectionTitle"
                trailing={(
                  <CatchButton
                    isInteractive={false}
                    label={row.action}
                    onPressed={null}
                    size="md"
                    trailing={row.source === "external" ? <CatchIcon icon="openExternal" size="md" /> : undefined}
                    variant={row.actionPrimary ? "primary" : "secondary"}
                  />
                )}
              />
            </CatchGap>
          ))}
        </CatchGap>
      ) : (
        <CatchGroundCard>
          <CatchGap size="headerTitleToSubtitle">
            <CatchText variant="sectionTitle">{copy.eventsEmptyTitle}</CatchText>
            <CatchText color="ink2" variant="bodyM">{copy.eventsEmptyBody(name)}</CatchText>
          </CatchGap>
        </CatchGroundCard>
      )}
    </CatchGap>
  );
}

/** Past moments: photos and what the numbers say, or what a generated page found. */
export function OrganizerMomentsSection({controller}: {controller: OrganizerPageController}) {
  const {moments} = controller.view;
  if (!moments.tiles.length) return null;
  return (
    <CatchGap aria-labelledby="organizer-moments-title" as="section" size="formField">
      {organizerSectionHeading({id: "organizer-moments-title", title: moments.title})}
      <CatchGrid columns={4} compactColumns={2}>
        {moments.tiles.map((tile) => (
          <CatchPhotoTile
            caption={tile.caption}
            figure={tile.figure}
            ground={tile.ground}
            imageAlt={tile.imageAlt}
            imageUrl={tile.imageUrl}
            key={tile.key}
            placeholder={tile.placeholder}
            title={tile.title}
          />
        ))}
      </CatchGrid>
    </CatchGap>
  );
}
