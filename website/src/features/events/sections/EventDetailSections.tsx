import {EventThumbnail, activityKindFromValue} from "@catch/web-ui";
import {consumerEventCopy} from "../../../content/consumerEvent";
import {EventExperiencePanel} from "../../../shared/ui/primitives/consumerEvent";
import {exploreCopy} from "../../../content/explore";
import {publicExperienceActivities} from "../../organizers/publicExperience";
import {ExploreBadge} from "../../../shared/ui/primitives/explore";
import type {ReactNode} from "react";
import {trackOrganizerProviderOutboundClick} from "../../organizers/observeOrganizerProviders";
import {trackOrganizerAnalytics} from "../../organizers/analytics";
import {ButtonLink, EventDetailFactGrid, EventDetailHeroLayout, EventDetailMedia,
  EventDetailOrganizerPanel, EventDetailReviewPreview, EventDetailSection, EventDetailSourceLink,
  ReviewSignalLane} from "../../../shared/ui/primitives";
import {EventDetailBodyLayout, EventDetailItinerary} from "../../../shared/ui/primitives/eventDetail";
import {eventDetailCopy as copy} from "../../../content/events";
import {interpolateContent} from "../../../content/interpolate";
import {ActivityMark, StatusBadge} from "../../organizers/OrganizerIdentity";
import {organizerPolicyForListing} from "../../organizers/organizerPolicy";
import {activityForKind} from "../../organizers/publicDiscovery";
import {buildListingReviewSummary} from "../../reviews/reviewModel";
import type {EventDetailRecord} from "../eventDetailModel";

export function EventDetailHeroSection({event, guestEntry}: {
  event: EventDetailRecord; guestEntry?: ReactNode;
}) {
  const activity = activityForKind(event.activityKind);
  const external = event.supply === "external";
  const credibility = organiserMetrics(event);
  return <EventDetailHeroLayout activityToken={activity.token} eyebrow={activity.label}
    title={event.title}
    badge={publicExperienceActivities(event.catchExperienceActivities).length ?
      <EventDetailSourceLink href="#catch-experience"><ExploreBadge>{exploreCopy.experienceLabel}</ExploreBadge></EventDetailSourceLink> : undefined}
    media={<EventDetailMedia><EventThumbnail photoUrl={event.photoUrl} activityKind={activityKindFromValue(event.activityKind)}
      semanticLabel={interpolateContent(copy.invitation.coverAlt, {title: event.title})} fit="contain" loading="eager" /></EventDetailMedia>}
    host={<><ActivityMark listing={event.listing} size="sm" /><div><span>{copy.hero.hostedByLabel}</span>
      <EventDetailSourceLink href={event.listing.path}>{event.listing.name}</EventDetailSourceLink></div></>}
    facts={[
      {label: copy.hero.facts.when, value: <>{event.date}{event.timezone ? <small>{event.timezone}</small> : null}</>},
      {label: copy.hero.facts.where, value: <>{event.location}{event.locationDetails.trim() ? <small>{event.locationDetails}</small> : null}</>},
      {label: copy.details.price, value: event.priceLabel},
    ]}>
    {!external ? <div>
      <p><strong>{event.registrationState === "closed" ? consumerEventCopy.registration.closed :
        event.remainingCapacity === 0 ? consumerEventCopy.registration.full :
        event.registrationAccess === "restricted" ? consumerEventCopy.registration.restricted :
        event.registrationState === "webOtp" ? consumerEventCopy.registration.open : consumerEventCopy.registration.app}</strong></p>
      {event.registrationState === "closed" ? <p>{consumerEventCopy.registration.recovery}</p> : <>
        {event.capacityLimit !== null && event.remainingCapacity !== null ? <p>{consumerEventCopy.registration.availability(event.remainingCapacity, event.capacityLimit)}</p> : null}
        {event.waitlistAvailable ? <p>{consumerEventCopy.registration.waitlist}</p> : null}
      </>}
    </div> : null}
    {credibility.length ? <EventDetailReviewPreview eyebrow={consumerEventCopy.credibility.organiser}
      title={<EventDetailSourceLink href={event.listing.path}>{event.listing.name}</EventDetailSourceLink>}
      body={credibility.map(metric => `${metric.value} ${metric.label.toLowerCase()}`).join(" · ")}
      meta={event.listing.reviews.length ? <EventDetailSourceLink href="#reviews">{consumerEventCopy.credibility.link}</EventDetailSourceLink> : undefined} /> : null}
    {external ? <>
      <p>{event.registrationState === "closed" ? copy.details.registrationClosed :
        interpolateContent(copy.hero.externalActionHeading, {source: event.sourceLabel})}</p>
      {event.registrationState !== "closed" && event.sourceHref ? <ButtonLink href={event.sourceHref}
        target="_blank" rel="noreferrer" onClick={() => trackSource(event, "external_event_booking")}>
        {copy.hero.officialSourceAction}</ButtonLink> : null}
    </> : guestEntry ?? <ButtonLink href={`/booking/${encodeURIComponent(event.eventId)}/`}>
      {copy.hero.guestAction}</ButtonLink>}
  </EventDetailHeroLayout>;
}

export function EventDetailFactsSection({event}: {event: EventDetailRecord}) {
  const details = [
    {label: consumerEventCopy.details.included, value: event.included?.trim() ?? ""},
    {label: copy.details.requirements, value: event.requirements.trim()},
    {label: copy.details.accessibility, value: event.accessibility.trim()},
  ].filter((item) => item.value);
  const itinerary = event.itinerary ?? [];
  const experience = publicExperienceActivities(event.catchExperienceActivities);
  return <EventDetailSection aria-label={copy.details.eyebrow}>
    <EventDetailBodyLayout host={<EventDetailOrganizerPanel
      activity={<ActivityMark listing={event.listing} size="lg" />}
      badge={<StatusBadge listing={event.listing} />} eyebrow={copy.hero.hostedByLabel}
      location={[event.listing.city, event.listing.country].filter(Boolean).join(", ")}
      metrics={organiserMetrics(event)} name={event.listing.name}
      primaryAction={<ButtonLink href={event.listing.path} variant="ghost">{copy.nav.organizerAction}</ButtonLink>} />}>
      {event.summary.trim() ? <><h2>{copy.invitation.about}</h2><p>{event.summary}</p></> : null}
      {experience.length ? <EventExperiencePanel id="catch-experience" aria-labelledby="event-experience-title">
        <ExploreBadge>{exploreCopy.experienceLabel}</ExploreBadge>
        <h2 id="event-experience-title">{consumerEventCopy.experienceIntro}</h2>
        <p>{consumerEventCopy.experienceBody}</p>
        <ul>{experience.map(item => <li key={item}><h3>{exploreCopy.activities[item]}</h3><p>{consumerEventCopy.activities[item]}</p></li>)}</ul>
        <p><strong>{exploreCopy.experienceChoice}</strong></p>
        <p>{consumerEventCopy.experienceMeaning}</p>
      </EventExperiencePanel> : null}
      {event.meetingLocation ? <><h2>{consumerEventCopy.details.venue}</h2>
        <p><EventDetailSourceLink target="_blank" rel="noreferrer"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.meetingLocation.latitude},${event.meetingLocation.longitude}`)}`}>
          {event.meetingLocation.name}{event.meetingLocation.address ? ` · ${event.meetingLocation.address}` : ""}
        </EventDetailSourceLink></p>
        {event.meetingLocation.notes ? <p>{event.meetingLocation.notes}</p> : null}
      </> : null}
      {itinerary.length ? <><h2>{copy.invitation.itinerary}</h2><EventDetailItinerary items={itinerary.map((item) => ({
        id: item.id, title: item.title, description: item.description,
        time: itineraryTime(event, item.offsetMinutes),
        duration: item.durationMinutes != null ? consumerEventCopy.details.duration(item.durationMinutes) : undefined,
        location: item.location ? <EventDetailSourceLink target="_blank" rel="noreferrer"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.location.latitude},${item.location.longitude}`)}`}>
          {item.location.name}{item.location.address ? ` · ${item.location.address}` : ""}
        </EventDetailSourceLink> : undefined,
      }))} /></> : null}
      {details.length ? <EventDetailFactGrid items={details} /> : null}
      {event.admissionLabels?.length ? <><h2>{consumerEventCopy.details.admission}</h2><ul>{event.admissionLabels.map(label => <li key={label}>{consumerEventCopy.admission[label]}</li>)}</ul></> : null}
      {event.cancellationPolicy ? <><h2>{consumerEventCopy.details.cancellation}</h2>
        <p>{consumerEventCopy.cancellation[event.cancellationPolicy]}{event.cancellationPolicy !== "notApplicable" ? ` · ${consumerEventCopy.cancellationNote}` : ""}</p>
      </> : null}
    </EventDetailBodyLayout>
  </EventDetailSection>;
}

export function EventDetailProvenanceSection({event}: {event: EventDetailRecord}) {
  if (event.supply !== "external" || !event.sourceHref) return null;
  return <EventDetailSection variant="provenance">
    <p>{copy.hero.externalActionBody} <EventDetailSourceLink href={event.sourceHref} target="_blank" rel="noreferrer"
      onClick={() => trackSource(event, "external_event_source")}>{event.sourceLabel}</EventDetailSourceLink></p>
  </EventDetailSection>;
}

export function EventDetailReviewsSection({event}: {event: EventDetailRecord}) {
  if (!organizerPolicyForListing(event.listing).canReadPublicReviews) return null;
  const eventReviews = buildListingReviewSummary(event.listing, event.eventReviews).verifiedReviews;
  const scoped = !event.isUpcoming && eventReviews.length > 0;
  const futureIds = new Set((event.listing.catchEvents ?? []).filter(item => item.timeline === "upcoming").map(item => item.id));
  const input = scoped ? event.eventReviews : event.listing.reviews.filter(review =>
    review.eventId !== event.eventId && (!review.eventId || !futureIds.has(review.eventId)));
  const summary = buildListingReviewSummary(event.listing, input);
  const reviews = scoped ? eventReviews : [...summary.verifiedReviews, ...summary.publicReviews];
  if (!reviews.length && !event.listing.reviewReadState) return null;
  return <EventDetailSection id="reviews" aria-label={copy.reviews.eyebrow} variant="reviews">
    {event.listing.reviewReadState === "unavailable" ? <p>{consumerEventCopy.reviews.unavailable}</p> : <>
      {!event.isUpcoming && !scoped ? <p>{consumerEventCopy.reviews.eventEmpty}</p> : null}
      <ReviewSignalLane body={scoped ? copy.reviews.laneBody : event.isUpcoming ? consumerEventCopy.reviews.organiserBody : consumerEventCopy.reviews.pastOrganiserBody}
        emptyBody={consumerEventCopy.reviews.empty} emptyTitle={scoped ? copy.reviews.emptyTitle : consumerEventCopy.reviews.organiserTitle(event.listing.name)}
        reviews={reviews} title={scoped ? copy.reviews.laneTitle : consumerEventCopy.reviews.organiserTitle(event.listing.name)} />
      {reviews.length ? <p>{consumerEventCopy.reviews.recent}</p> : null}
    </>}
  </EventDetailSection>;
}

function organiserMetrics(event: EventDetailRecord): Array<{label: string; value: string}> {
  const metrics: Array<{label: string; value: string}> = [];
  const listing = event.listing;
  if (organizerPolicyForListing(listing).canReadPublicReviews) {
    const summary = buildListingReviewSummary(listing, listing.reviews);
    if (summary.verifiedCount > 0 && summary.displayRating > 0) {
      metrics.push({label: consumerEventCopy.credibility.score, value: consumerEventCopy.credibility.rating(summary.displayRating)});
      metrics.push({label: consumerEventCopy.credibility.verified, value: String(summary.verifiedCount)});
    }
  }
  if (listing.metrics?.followerCount != null && listing.metrics.followerCount > 0) metrics.push({label: consumerEventCopy.credibility.followers, value: String(listing.metrics.followerCount)});
  return metrics;
}

function trackSource(event: EventDetailRecord, placement: string) {
  trackOrganizerAnalytics(event.listing, "outboundClick", placement, event.eventId);
  trackOrganizerProviderOutboundClick(event.listing.id, event.eventId);
}

function itineraryTime(event: EventDetailRecord, offsetMinutes: number): string {
  // Never imply a browser-local time when the organizer has not supplied a zone.
  if (!event.timezone || !Number.isFinite(Date.parse(event.startTime))) return copy.invitation.offset(offsetMinutes);
  try {
    return new Intl.DateTimeFormat("en-IN", {timeZone: event.timezone, hour: "numeric", minute: "2-digit"})
      .format(new Date(Date.parse(event.startTime) + offsetMinutes * 60_000));
  } catch { return copy.invitation.offset(offsetMinutes); }
}
