import {
  CatchAvatar,
  CatchBadge,
  CatchButton,
  CatchEventPoster,
  CatchFactTile,
  CatchGap,
  CatchGrid,
  CatchGroundCard,
  CatchHeroImage,
  CatchIcon,
  CatchPreviewCard,
  CatchReviewItem,
  CatchSectionList,
  CatchStepList,
  CatchText,
  MapPreview,
} from "@catch/web-ui";
import type {ReactNode} from "react";
import {eventPageCopy as copy} from "../../../content/events";
import type {EventPageView} from "../eventPageModel";

/** The organiser link back and the share action above the event. */
export function EventPageHeader({view, onShare}: {view: EventPageView; onShare: () => void}) {
  return (
    <CatchGap as="nav" aria-label={view.organizer.name} crossAxisAlignment="center" direction="horizontal"
      mainAxisAlignment="spaceBetween" size="related">
      <CatchButton href={view.organizer.path} label={view.organizer.name} onPressed={() => undefined}
        recipe="command" semanticsLabel={copy.back(view.organizer.name)} leading={
          <CatchGap crossAxisAlignment="center" direction="horizontal" size="inline">
            <CatchIcon icon="back" />
            <CatchAvatar ground={view.accent} initials={view.organizer.initials} name={view.organizer.name}
              recipe="monogram" size={34} />
          </CatchGap>
        } />
      <CatchButton label={copy.share} leading={<CatchIcon icon="share" />} onPressed={onShare} size="md" variant="secondary" />
    </CatchGap>
  );
}

/** Every section of the event, each present only when the event has it. */
export function EventPageMain({view, mapImageUrl, onOutboundClick}: {
  view: EventPageView;
  /** A static map of the meeting point, once the page has a map provider. */
  mapImageUrl?: string;
  onOutboundClick?: (placement: "maps") => void;
}) {
  return (
    <CatchSectionList emptyStateOmitted gap="majorSection">
      <EventIntro view={view} />
      {view.moments ? <EventMoments moments={view.moments} accent={view.accent} /> : null}
      {view.plan ? <EventPlan plan={view.plan} /> : null}
      <EventWhere where={view.where} mapImageUrl={mapImageUrl} onMapsClick={() => onOutboundClick?.("maps")} />
      {view.goodToKnow.length ? <EventGoodToKnow items={view.goodToKnow} /> : null}
      {view.going ? <EventGoing going={view.going} /> : null}
      <EventOrganizer organizer={view.organizer} accent={view.accent} />
      {view.reviews ? <EventReviews reviews={view.reviews} /> : null}
      {view.more ? <EventMore more={view.more} /> : null}
    </CatchSectionList>
  );
}

function Section({id, title, aside, children}: {id: string; title: string; aside?: ReactNode; children: ReactNode}) {
  return (
    <CatchGap as="section" aria-labelledby={id} size="formField">
      {aside ? (
        <CatchGap crossAxisAlignment="baseline" direction="horizontal" mainAxisAlignment="spaceBetween" size="related" wrap>
          <CatchText as="h2" id={id} variant="displayS">{title}</CatchText>
          {aside}
        </CatchGap>
      ) : <CatchText as="h2" id={id} variant="displayS">{title}</CatchText>}
      {children}
    </CatchGap>
  );
}

function EventIntro({view}: {view: EventPageView}) {
  const {media, facts, host} = view;
  return (
    <CatchGap as="section" aria-labelledby="event-title" size="section">
      {media.kind === "photo" ?
        <CatchHeroImage framed imageUrl={media.url} semanticLabel={media.alt} showScrim={false} /> :
        <CatchEventPoster date={media.date} ground={view.accent} kicker={media.kicker} place={media.place} title={media.title} />}
      <CatchGap size="related">
        <CatchText as="span" color={view.accent} variant="supportingStrong">{view.kindLabel}</CatchText>
        <CatchText as="h1" id="event-title" variant="displayXl">{view.title}</CatchText>
        <CatchGap crossAxisAlignment="center" direction="horizontal" size="inline" wrap>
          <CatchText as="span" variant="bodyM">{copy.hostedBy}</CatchText>
          <CatchButton href={host.path} label={host.name} onPressed={() => undefined} recipe="text" tone="neutral" />
          {host.verified ? <CatchIcon icon="verified" semanticLabel={copy.verified} tone="primary" /> : null}
          {host.rating ? <CatchText as="span" color="ink2" variant="bodyM">{host.rating}</CatchText> : null}
        </CatchGap>
      </CatchGap>
      <CatchGrid columns={3} compactColumns={1} gap="inline">
        {[facts.when, facts.where, facts.price].map((fact) => (
          <CatchFactTile key={fact.label} label={fact.label} note={fact.note} value={fact.value} />
        ))}
      </CatchGrid>
      {view.description ? <CatchText variant="bodyL">{view.description}</CatchText> : null}
    </CatchGap>
  );
}

function EventMoments({moments, accent}: {moments: NonNullable<EventPageView["moments"]>; accent: EventPageView["accent"]}) {
  return (
    <CatchGroundCard aria-labelledby="event-moments" as="section" ground="ink" padding="spacious">
      <CatchGap size="formField">
        <CatchText as="span" color={accent} variant="supportingStrong">{copy.moments.label}</CatchText>
        <CatchText as="h2" id="event-moments" variant="displayS">{copy.moments.title}</CatchText>
        <CatchGrid columns={2} compactColumns={1} gap="section">
          {moments.map((moment) => (
            <CatchGap key={moment.title} size="headerTitleToSubtitle">
              <CatchText as="h3" variant="sectionTitle">{moment.title}</CatchText>
              <CatchText color="ink2" variant="bodyM">{moment.body}</CatchText>
            </CatchGap>
          ))}
        </CatchGrid>
      </CatchGap>
    </CatchGroundCard>
  );
}

function EventPlan({plan}: {plan: NonNullable<EventPageView["plan"]>}) {
  return (
    <Section id="event-plan" title={plan.title}>
      <CatchStepList steps={plan.steps} />
    </Section>
  );
}

function EventWhere({where, mapImageUrl, onMapsClick}: {
  where: EventPageView["where"]; mapImageUrl?: string; onMapsClick: () => void;
}) {
  return (
    <Section id="event-where" title={copy.where.title} aside={
      <CatchButton href={where.mapsHref} label={copy.where.openMaps} newTab onPressed={onMapsClick}
        recipe="command" trailing={<CatchIcon icon="openExternal" />} />
    }>
      {where.map && mapImageUrl ? (
        <MapPreview coordinate={where.map} fallbackLabel={where.map.alt} framed imageUrl={mapImageUrl} />
      ) : null}
      <CatchGap size="headerTitleToSubtitle">
        <CatchText variant="sectionTitle">{where.place}</CatchText>
        {where.note ? <CatchText color="ink2" variant="bodyM">{where.note}</CatchText> : null}
      </CatchGap>
    </Section>
  );
}

function EventGoodToKnow({items}: {items: EventPageView["goodToKnow"]}) {
  return (
    <Section id="event-good-to-know" title={copy.goodToKnow.title}>
      <CatchGrid columns={2} compactColumns={1} gap="related">
        {items.map((item) => (
          <CatchGroundCard as="article" aria-labelledby={`event-know-${item.key}`} ground="paper" key={item.key}>
            <CatchGap size="headerTitleToSubtitle">
              <CatchText as="h3" color={item.accent} id={`event-know-${item.key}`} variant="supportingStrong">{item.label}</CatchText>
              <CatchText variant="bodyM">{item.body}</CatchText>
            </CatchGap>
          </CatchGroundCard>
        ))}
      </CatchGrid>
    </Section>
  );
}

function EventGoing({going}: {going: NonNullable<EventPageView["going"]>}) {
  return (
    <CatchGroundCard aria-labelledby="event-going" as="section" ground="paper">
      <CatchGap size="headerTitleToSubtitle">
        <CatchText as="h2" id="event-going" variant="sectionTitle">{going.title}</CatchText>
        <CatchText color="ink2" variant="bodyM">{going.note}</CatchText>
      </CatchGap>
    </CatchGroundCard>
  );
}

function EventOrganizer({organizer, accent}: {organizer: EventPageView["organizer"]; accent: EventPageView["accent"]}) {
  return (
    <CatchGroundCard aria-labelledby="event-organizer" as="section" ground="white" outlined>
      <CatchGap crossAxisAlignment="center" direction="horizontal" mainAxisAlignment="spaceBetween" size="formField" wrap>
        <CatchGap crossAxisAlignment="center" direction="horizontal" size="formField">
          <CatchAvatar ground={accent} initials={organizer.initials} name={organizer.name} recipe="monogram" size={64} />
          <CatchGap size="headerTitleToSubtitle">
            <CatchText as="h2" id="event-organizer" variant="sectionTitle">{organizer.name}</CatchText>
            {organizer.summary ? <CatchText color="ink2" variant="bodyM">{organizer.summary}</CatchText> : null}
          </CatchGap>
        </CatchGap>
        <CatchButton href={organizer.path} label={copy.organizer.see} onPressed={() => undefined} size="md" variant="secondary" />
      </CatchGap>
    </CatchGroundCard>
  );
}

function EventReviews({reviews}: {reviews: NonNullable<EventPageView["reviews"]>}) {
  return (
    <Section id="event-reviews" title={copy.reviews.title}
      aside={<CatchText as="span" color="ink2" variant="bodyM">{reviews.note}</CatchText>}>
      <CatchGrid columns={2} compactColumns={1} gap="related">
        {reviews.items.map((review) => (
          <CatchReviewItem body={review.body} key={review.id} meta={review.meta} name={review.name} rating={review.rating}
            ratingLabel={review.ratingLabel} reply={review.reply} variant="card"
            badge={<CatchBadge label={review.verified ? copy.reviews.verified : copy.reviews.unverified} recipe="status"
              tone={review.verified ? "success" : "neutral"} />} />
        ))}
      </CatchGrid>
    </Section>
  );
}

function EventMore({more}: {more: NonNullable<EventPageView["more"]>}) {
  return (
    <Section id="event-more" title={more.title}>
      <CatchGrid columns={3} compactColumns={1} gap="related">
        {more.cards.map((card) => (
          <CatchPreviewCard ground={card.ground} href={card.href} key={card.href} label={card.label} meta={card.meta} title={card.title} />
        ))}
      </CatchGrid>
    </Section>
  );
}

/**
 * The price, the time and where to book. A Catch event takes the guest entry
 * the page passes; an imported event links out to its source. The sticky aside
 * that will hold it names the booking landmark, so the card is not one.
 */
export function EventBookingCard({view, catchEntry, externalAction, onExternalClick}: {
  view: EventPageView;
  catchEntry: ReactNode;
  /** Places the source link and its note, such as in the docked phone action. */
  externalAction: (button: ReactNode, note: string) => ReactNode;
  onExternalClick: () => void;
}) {
  const {booking, facts} = view;
  const when = [facts.when.value, facts.when.note].filter(Boolean).join(" · ");
  return (
    <CatchGroundCard ground="white" outlined>
      <CatchGap size="formField">
        <CatchGap crossAxisAlignment="baseline" direction="horizontal" size="inline" wrap>
          <CatchText as="h2" variant="displayM">{view.priceLabel}</CatchText>
          {facts.price.note ? <CatchText as="span" color="ink2" variant="bodyM">{facts.price.note}</CatchText> : null}
        </CatchGap>
        <CatchText variant="sectionTitle">{when}</CatchText>
        {!booking.open ? <CatchText color="ink2" variant="bodyM">{copy.booking.closed}</CatchText> :
          booking.kind === "catch" ? catchEntry : externalAction(
            <CatchButton fullWidth href={booking.url} label={copy.booking.externalAction(booking.label)} newTab
              onPressed={onExternalClick} trailing={<CatchIcon icon="openExternal" />} />,
            copy.booking.externalNote(booking.label),
          )}
      </CatchGap>
    </CatchGroundCard>
  );
}
