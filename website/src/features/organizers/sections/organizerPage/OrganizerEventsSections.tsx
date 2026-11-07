import {CatchButton, CatchHeroImage, CatchIndexRow, CatchSection, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../../../content/organizerPage";
import type {OrganizerMomentView} from "../../organizerPageView";
import type {OrganizerPageController} from "../../useOrganizerPageController";

/**
 * Coming up: Catch events and imported events in one list, soonest first.
 * Each row has its date tile, where and when, the price, where it is sold
 * and its action; the row opens the event page or the page that sells it.
 */
export function OrganizerEventsSection({controller}: {controller: OrganizerPageController}) {
  const {events, name} = controller.view;
  return (
    <CatchStack gap={0} id="events">
      <CatchSection
        empty={(
          <CatchSurface>
            <CatchText as="p" variant="title-row">{copy.eventsEmptyTitle}</CatchText>
            <CatchText as="p" tone="secondary" variant="body-small">{copy.eventsEmptyBody(name)}</CatchText>
          </CatchSurface>
        )}
        note={events.rows.length ? events.note : undefined}
        title={copy.eventsTitle}
      >
        {events.rows.map((row) => (
          <CatchIndexRow
            date={{day: row.date.weekday, date: row.date.day, ...(row.format ? {format: row.format} : {})}}
            density="regular"
            href={row.href}
            key={row.key}
            meta={[row.price, row.note].filter(Boolean).join(" · ")}
            onTap={() => controller.openEvent(row)}
            status={row.sourceLabel}
            statusTone={row.source === "catch" ? "success" : "secondary"}
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

/** One square of "What it's like": a past photo, a figure on a colour, or the space a claim fills. */
function MomentTile({tile, format}: {tile: OrganizerMomentView; format: OrganizerPageController["view"]["header"]["format"]}) {
  if (tile.imageUrl) {
    return (
      <CatchStack gap={8}>
        <CatchHeroImage framed imageUrl={tile.imageUrl} semanticLabel={tile.imageAlt} showScrim={false} />
        <CatchStack gap={2}>
          <CatchText variant="title-row">{tile.title}</CatchText>
          {tile.caption ? <CatchText tone="secondary" variant="body-meta">{tile.caption}</CatchText> : null}
        </CatchStack>
      </CatchStack>
    );
  }
  if (tile.placeholder) {
    return (
      <CatchSurface aspect={1}>
        <CatchText variant="title-row">{tile.title}</CatchText>
        {tile.caption ? <CatchText tone="secondary" variant="body-small">{tile.caption}</CatchText> : null}
      </CatchSurface>
    );
  }
  // The first figure takes the organiser's colour and the second ink, as the board alternates them.
  return (
    <CatchSurface aspect={1} block="spotlight" color={tile.key === "count" ? format : "ink"}>
      {tile.figure ? <CatchText numeric variant="display-xl">{tile.figure}</CatchText> : null}
      <CatchText variant="label-action">{tile.title}</CatchText>
      {tile.caption ? <CatchText variant="body-small">{tile.caption}</CatchText> : null}
    </CatchSurface>
  );
}

/** What it's like: past photos and what the numbers say, two to a row, or what a generated page found. */
export function OrganizerMomentsSection({controller}: {controller: OrganizerPageController}) {
  const {moments, header} = controller.view;
  if (!moments.tiles.length) return null;
  const rows: OrganizerMomentView[][] = [];
  for (let index = 0; index < moments.tiles.length; index += 2) rows.push(moments.tiles.slice(index, index + 2));
  return (
    <CatchSection dividers="none" title={moments.title}>
      <CatchStack gap={8}>
        {rows.map((row) => (
          <CatchStack direction="row" equal gap={8} key={row.map((tile) => tile.key).join("-")}>
            {row.map((tile) => <MomentTile format={header.format} key={tile.key} tile={tile} />)}
          </CatchStack>
        ))}
      </CatchStack>
    </CatchSection>
  );
}
