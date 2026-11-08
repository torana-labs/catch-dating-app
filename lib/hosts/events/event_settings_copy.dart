/// Copy for the event settings the boards drew and the backend now carries.
///
/// It lives here, not in `packages/l10n/lib/app_en.arb`, only because another
/// lane holds the ARB while this one runs. Move these into `hostEvents…`
/// messages when it frees.
abstract final class HostEventSettingsCopy {
  // Who can see and book.
  static const linkTitle = 'People with the link';
  static const linkBody = 'Not listed anywhere';
  static const whoCanBook = 'Who can book';
  static const anyone = 'Anyone';
  static const anyoneBody = 'First come, first served';
  static const askFirst = 'Ask first';
  static const askFirstBody = 'You approve each guest first';
  static const bookingLocked = 'Unpublish the event to change who can book';
  static const showGuestList = 'Show who else is going';
  static const showGuestListBody =
      'Guests see a count; friends see names in the app';
  static const hidePrice = 'Hide the price until booking opens';

  // Event defaults.
  static const tickets = 'Tickets';
  static const startingPrice = 'Starting price';
  static const places = 'Places';
  static const lowerPrice = 'Lower the starting price';
  static const raisePrice = 'Raise the starting price';
  static const fewerPlaces = 'Fewer places';
  static const morePlaces = 'More places';
  static const waitlistWhenFull = 'Waitlist when full';
  static const waitlistWhenFullBody =
      'A place offered to the next person when someone cancels';
  static const askToJoin = 'Ask to join instead of booking';
  static const askToJoinBody = 'You approve each guest first';
  static const refunds = 'Refunds';
  static const refundsBody =
      'Guests see this before they pay and on their ticket.';
  static const refund24h = 'Up to 24 hours before';
  static const refund24hBody = 'Most guests expect this';
  static const refund3d = 'Up to 3 days before';
  static const refund3dBody = 'Good for suppers, where you buy food ahead';
  static const refundNone = 'No refunds';
  static const refundNoneBody = 'Guests can still pass a ticket to a friend';
  static const askedAtBooking = 'Asked at booking';
  static String askedAtBookingCount(int count) =>
      count == 1 ? '1 question' : '$count questions';
  static const messages = 'Messages';
  static const thankYou = 'Thanks the morning after';
  static const thankYouBody = 'With photos and a rating';
  static const arrival = 'Reminder the day before';
  static const arrivalBody =
      'On WhatsApp, billed at cost · with the plan and the door';

  // Workspace facts.
  static const ticketSales = 'Ticket sales';
  static String ticketsSold(int count) =>
      count == 1 ? '1 ticket sold' : '$count tickets sold';
  static const arrivalReady = 'Arrival message is ready';
  static const arrivalNotReady = 'Arrival message is not set up';
}
