import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/foundation.dart';

/// Where the event report is: reading the roster, showing the report, or
/// unable to read the roster.
enum HostEventReportStatus { loading, content, error }

/// The two exports under Downloads.
enum HostEventReportDownload { guestList, payments }

/// Everything the event report body shows, as plain values. A null figure
/// has not been read (or the report does not carry it) and shows a dash.
@immutable
class HostEventReportState {
  const HostEventReportState({
    required this.status,
    required this.event,
    this.format,
    this.booked,
    this.came,
    this.newFaces,
    this.ticketSalesMinor,
    this.currencyCode,
    this.payments,
    this.rating,
    this.ratingCount = 0,
    this.stayInTouch,
    this.people = const <String>[],
    this.reviews = const <Review>[],
    this.reviewCount = 0,
    this.nextEvent,
    this.tonight = false,
    this.error,
    this.stackTrace,
  });

  final HostEventReportStatus status;
  final Event event;

  /// The event's format colour, for the spotlight.
  final CatchFormat? format;

  /// Guests booked, and guests checked in.
  final int? booked;
  final int? came;

  /// Checked-in guests with no earlier event with this organizer.
  final int? newFaces;

  /// Ticket sales in minor units from the event's report row.
  final int? ticketSalesMinor;
  final String? currencyCode;

  /// Completed payments behind [ticketSalesMinor].
  final int? payments;

  /// The average of the guests' star ratings, and how many rated.
  final double? rating;
  final int ratingCount;

  /// Pairs of guests who matched with each other after the event; null
  /// when the report does not carry any.
  final int? stayInTouch;

  /// The first names on the roster, for the faces.
  final List<String> people;

  /// The newest reviews, and how many there are in all.
  final List<Review> reviews;
  final int reviewCount;

  /// The organizer's next coming event, which the spotlight invites to.
  final Event? nextEvent;

  /// The event ran today, so the report speaks of tonight.
  final bool tonight;
  final Object? error;
  final StackTrace? stackTrace;

  /// How many more guests came than booked (negative when fewer came).
  int? get walkIns {
    final booked = this.booked;
    final came = this.came;
    if (booked == null || came == null) return null;
    return came - booked;
  }
}
