import {CatchStack, CatchStickyAside, CatchText} from "@catch/web-ui";
import type {ReactNode} from "react";
import {eventPageCopy as copy} from "../../content/events";
import type {EventPageView} from "./eventPageModel";
import {EventBookingCard} from "./sections/EventPageSections";

/**
 * The event page's booking (CAT-252), as the board places it: from 840px the
 * card sticks beside the page; on a phone a docked bar shows the price and
 * opens the card in a sheet. A booking is one place: the places stepper
 * waits on CAT-282.
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
  // "₹499 a place"; an imported event's note says where it is sold, which the line below already does.
  const price = booking.kind === "catch" ? [view.priceLabel, view.facts.price.note].filter(Boolean).join(" ") : view.priceLabel;
  return (
    <CatchStickyAside
      closeLabel={copy.booking.close}
      dock={(
        <CatchStack gap={2}>
          <CatchText variant="title-row">{price}</CatchText>
          <CatchText maxLines={1} tone="secondary" variant="body-meta">{note}</CatchText>
        </CatchStack>
      )}
      label={copy.booking.label}
      openLabel={openLabel}
      sheetTitle={view.title}
    >
      <EventBookingCard catchEntry={catchEntry} onExternalClick={onExternalClick} view={view} />
    </CatchStickyAside>
  );
}
