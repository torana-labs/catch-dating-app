import {
  CatchButton,
  CatchEventCard,
  CatchHeroImage,
  CatchIcon,
  CatchIndexRow,
  CatchMetricTile,
  CatchOrganizerCard,
  CatchRail,
  CatchSection,
  CatchStack,
  CatchStarRating,
  CatchSurface,
  CatchText,
  type CatchTextTone,
  MapPreview,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {eventPageCopy as copy} from "../../../content/events";
import type {EventPageGoodToKnow, EventPageView} from "../eventPageModel";

// The board's Good to know kickers: what's included in info, what to bring in
// danger, getting in in success and cancelling in warning.
const knowTones: Record<EventPageGoodToKnow["key"], CatchTextTone> = {
  included: "info",
  bring: "danger",
  accessibility: "success",
  cancellation: "warning",
  joining: "secondary",
};

/**
 * Who hosts it, with the verified mark and the organiser's rating, and the
 * page's share action across from it. The organiser's name links to their page.
 */
export function EventPageHeader({view, onShare}: {view: EventPageView; onShare?: () => void}) {
  const {host} = view;
  return (
    <CatchStack align="center" direction="row" gap={12} justify="between" wrap>
      <CatchStack align="center" direction="row" gap={4} wrap>
        <CatchText tone="secondary" variant="body-small">{copy.hostedBy}</CatchText>
        <CatchButton href={host.path} label={host.name} size="sm" variant="quiet" />
        {host.verified ? <CatchIcon label={copy.verified} name="protected" size={16} /> : null}
        {host.rating ? <CatchText tone="secondary" variant="body-small">{`· ${host.rating}`}</CatchText> : null}
      </CatchStack>
      {onShare ? <CatchButton label={copy.share} leadingIcon="share" onPressed={onShare} size="sm" variant="secondary" /> : null}
    </CatchStack>
  );
}

/**
 * The event's main column, band for band as the RbWebEventV2 board: the hero,
 * the head, three facts, what it is, coming on your own, the plan, where,
 * good to know, who's going, the organiser, what people say and more from
 * them. Each section shows only when the event has it.
 */
export function EventPageMain({view, mapImageUrl, onOutboundClick, onShare}: {
  view: EventPageView;
  /** A static map of the meeting point, once the page has a map provider. */
  mapImageUrl?: string;
  onOutboundClick?: (placement: "maps") => void;
  onShare?: () => void;
}) {
  return (
    <CatchStack gap={40}>
      <EventIntro onShare={onShare} view={view} />
      {view.moments ? <EventMoments moments={view.moments} /> : null}
      {view.plan ? <EventPlan format={view.format} plan={view.plan} /> : null}
      <EventWhere mapImageUrl={mapImageUrl} onMapsClick={() => onOutboundClick?.("maps")} where={view.where} />
      {view.goodToKnow.length ? <EventGoodToKnow items={view.goodToKnow} /> : null}
      {view.going ? <EventGoing going={view.going} /> : null}
      <CatchOrganizerCard color={view.format} href={view.organizer.path} initials={view.organizer.initials}
        meta={view.organizer.summary || undefined} name={view.organizer.name} />
      {view.reviews ? <EventReviews reviews={view.reviews} /> : null}
      {view.more ? <EventMore more={view.more} /> : null}
    </CatchStack>
  );
}

function EventIntro({view, onShare}: {view: EventPageView; onShare?: () => void}) {
  const {media, facts} = view;
  return (
    <CatchStack aria-labelledby="event-title" as="section" gap={24}>
      {media.kind === "photo" ?
        <CatchHeroImage framed imageUrl={media.url} semanticLabel={media.alt} showScrim={false} /> :
        <CatchEventCard format={view.format} formatLabel={view.activityLabel} place={media.place} title={media.title} variant="poster" when={media.date} />}
      <CatchStack gap={8}>
        <CatchText tone="secondary" variant="label-kicker">{view.kindLabel}</CatchText>
        <CatchText as="h1" id="event-title" variant="page-title">{view.title}</CatchText>
        <EventPageHeader onShare={onShare} view={view} />
      </CatchStack>
      <CatchStack collapseBelow="medium" direction="row" equal gap={8}>
        {[facts.when, facts.where, facts.price].map((fact) => (
          <CatchMetricTile key={fact.label} label={fact.label} layout="fact" note={fact.note} value={fact.value} />
        ))}
      </CatchStack>
      {view.description ? <CatchText as="p" variant="body-lead">{view.description}</CatchText> : null}
    </CatchStack>
  );
}

/** Coming on your own: the ink spotlight with what the organiser does so nobody stands alone. */
function EventMoments({moments}: {moments: NonNullable<EventPageView["moments"]>}) {
  return (
    <CatchSurface aria-labelledby="event-moments" as="section" block="spotlight" color="ink">
      <CatchText tone="info" variant="label-kicker">{copy.moments.label}</CatchText>
      <CatchText as="h2" id="event-moments" variant="display-sm">{copy.moments.title}</CatchText>
      <CatchSection>
        {moments.map((moment) => <CatchIndexRow density="regular" key={moment.title} subtitle={moment.body} title={moment.title} wrap />)}
      </CatchSection>
    </CatchSurface>
  );
}

/** The plan for the night: each step at its time on a joined line of format markers. */
function EventPlan({plan, format}: {plan: NonNullable<EventPageView["plan"]>; format: EventPageView["format"]}) {
  return (
    <CatchSection dividers="none" timeline title={plan.title}>
      {plan.steps.map((step, index) => (
        <CatchIndexRow
          density="compact"
          key={`${step.marker}-${step.title}`}
          marker={index < plan.steps.length - 1 ? {tone: "format", format, size: 12} : {tone: "ink", size: 12}}
          subtitle={step.body}
          time={step.marker}
          title={step.title}
          value={step.tag}
          wrap
        />
      ))}
    </CatchSection>
  );
}

/** Where: the map when there is one, the meeting point, and Google Maps in a new tab. */
function EventWhere({where, mapImageUrl, onMapsClick}: {
  where: EventPageView["where"]; mapImageUrl?: string; onMapsClick: () => void;
}) {
  return (
    <CatchSection
      dividers="none"
      footer={(
        <CatchStack align="start">
          <CatchButton href={where.mapsHref} label={copy.where.openMaps} newTab onPressed={onMapsClick} size="sm"
            trailingIcon="openExternal" variant="quiet" />
        </CatchStack>
      )}
      title={copy.where.title}
    >
      {where.map && mapImageUrl ? <MapPreview coordinate={where.map} fallbackLabel={where.map.alt} framed imageUrl={mapImageUrl} /> : null}
      <CatchIndexRow density="compact" subtitle={where.note ?? undefined} title={where.place} wrap />
    </CatchSection>
  );
}

/** Good to know: one small tile for each thing, its kicker in the board's colour. */
function EventGoodToKnow({items}: {items: EventPageView["goodToKnow"]}) {
  return (
    <CatchSection dividers="none" title={copy.goodToKnow.title}>
      <CatchStack gap={8}>
        {items.map((item) => (
          <CatchSurface aria-labelledby={`event-know-${item.key}`} as="article" key={item.key} padding="sm">
            <CatchText as="h3" id={`event-know-${item.key}`} tone={knowTones[item.key]} variant="label-kicker">{item.label}</CatchText>
            <CatchText as="p" variant="body-small">{item.body}</CatchText>
          </CatchSurface>
        ))}
      </CatchStack>
    </CatchSection>
  );
}

/** Who's going: a count and how many places are left; names stay out of the public page. */
function EventGoing({going}: {going: NonNullable<EventPageView["going"]>}) {
  return (
    <CatchSurface aria-labelledby="event-going" as="section">
      <CatchStack gap={2}>
        <CatchText as="h2" id="event-going" variant="title-row">{going.title}</CatchText>
        <CatchText as="p" tone="secondary" variant="body-small">{going.note}</CatchText>
      </CatchStack>
    </CatchSurface>
  );
}

/** What people say: each review with its stars, booked on Catch or unverified, and the organiser's reply. */
function EventReviews({reviews}: {reviews: NonNullable<EventPageView["reviews"]>}) {
  return (
    <CatchStack gap={0} id="event-reviews">
      <CatchSection note={reviews.note} title={copy.reviews.title}>
        {reviews.items.map((review) => (
          <CatchIndexRow
            body={review.body}
            density="roomy"
            key={review.id}
            meta={review.reply ? `${review.reply.author} ${review.reply.verb} ${review.reply.text}` : undefined}
            status={review.verified ? copy.reviews.verified : copy.reviews.unverified}
            statusTone={review.verified ? "success" : "secondary"}
            subtitle={review.meta}
            title={review.name}
            trailing={<CatchStarRating label={review.ratingLabel} value={review.rating} />}
            wrap
          />
        ))}
      </CatchSection>
    </CatchStack>
  );
}

/** More from the organiser: a rail of their other events, on Catch or where they are sold. */
function EventMore({more}: {more: NonNullable<EventPageView["more"]>}) {
  return (
    <CatchSection dividers="none" title={more.title}>
      <CatchRail itemWidth={200} label={more.title} wrap="auto">
        {more.cards.map((card) => (
          <CatchEventCard format={card.format} href={card.href} key={card.href} price={card.source ? undefined : card.meta}
            source={card.source} title={card.title} variant={card.source ? "external" : "compact"} when={card.label} />
        ))}
      </CatchRail>
    </CatchSection>
  );
}

/**
 * The booking card: the price and when, then where to book. A Catch event
 * takes the booking steps the page passes; an imported event links out to
 * its source. The cancellation terms close it, as the board's card does.
 * The sticky aside that holds it names the booking landmark, so the card is
 * not one.
 */
export function EventBookingCard({view, catchEntry, onExternalClick}: {
  view: EventPageView;
  catchEntry: ReactNode;
  onExternalClick: () => void;
}) {
  const {booking, facts} = view;
  const when = [facts.when.value, facts.when.note].filter(Boolean).join(" · ");
  const cancellation = view.goodToKnow.find((item) => item.key === "cancellation");
  return (
    <CatchSurface block="floating">
      <CatchStack gap={4}>
        <CatchStack align="baseline" direction="row" gap={8} wrap>
          <CatchText as="h2" variant="display-sm">{view.priceLabel}</CatchText>
          {facts.price.note ? <CatchText tone="secondary" variant="body-small">{facts.price.note}</CatchText> : null}
        </CatchStack>
        <CatchText as="p" tone="secondary" variant="body-small">{when}</CatchText>
      </CatchStack>
      {!booking.open ? <CatchText as="p" tone="secondary" variant="body">{copy.booking.closed}</CatchText> :
        booking.kind === "catch" ? catchEntry : (
          <CatchStack gap={12}>
            <CatchText as="p" tone="secondary" variant="body-small">{copy.booking.externalNote(booking.label)}</CatchText>
            <CatchButton fill href={booking.url} label={copy.booking.externalAction(booking.label)} newTab
              onPressed={onExternalClick} trailingIcon="openExternal" />
          </CatchStack>
        )}
      {booking.open && cancellation ? <CatchText align="center" as="p" tone="secondary" variant="body-small">{cancellation.body}</CatchText> : null}
    </CatchSurface>
  );
}
