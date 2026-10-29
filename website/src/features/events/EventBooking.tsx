import {CatchGap, CatchStickyAside, CatchText} from "@catch/web-ui";
import type {ReactNode} from "react";
import {eventPageCopy as copy} from "../../content/events";
import type {EventPageView} from "./eventPageModel";
import {EventBookingCard} from "./sections/EventPageSections";

/**
 * The event page's booking (CAT-252). From 840px the card sticks beside the
 * page; on a phone a docked bar shows the price and opens the card in a
 * sheet. A booking is one place: the places stepper waits on CAT-282.
 */
export function EventBooking({view, catchEntry, onExternalClick}: {
  view: EventPageView;
  /** A Catch event's booking steps. */
  catchEntry: ReactNode;
  onExternalClick: () => void;
}) {
  const {booking} = view;
  const note = !booking.open ? copy.booking.closed :
    booking.kind === "external" ? copy.ticketsOn(booking.label) : view.going?.title ?? view.facts.when.value;
  const openLabel = !booking.open ? copy.booking.details :
    booking.kind === "external" ? copy.booking.getTickets : copy.booking.book;
  return (
    <CatchStickyAside
      closeLabel={copy.booking.close}
      dock={(
        <CatchGap size="headerTitleToSubtitle">
          <CatchText as="span" variant="sectionTitle">{view.priceLabel}</CatchText>
          <CatchText as="span" color="ink2" maxLines={1} variant="bodyS">{note}</CatchText>
        </CatchGap>
      )}
      label={copy.booking.label}
      openLabel={openLabel}
      sheetTitle={view.title}
    >
      <EventBookingCard catchEntry={catchEntry} onExternalClick={onExternalClick} view={view} />
    </CatchStickyAside>
  );
}
