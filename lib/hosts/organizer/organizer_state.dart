import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:flutter/foundation.dart';

/// The figures under Last 30 days, in board order.
enum OrganizerStatKind { bookings, ticketSales, followers, pageVisits }

@immutable
class OrganizerStat {
  const OrganizerStat({
    required this.kind,
    required this.value,
    this.previousValue,
    this.currencyCode,
  });

  final OrganizerStatKind kind;
  final num value;

  /// The same figure for the thirty days before, for the change note.
  final num? previousValue;

  /// Set for money in minor units.
  final String? currencyCode;
}

/// What a row or button on the Organiser tab asks for.
enum OrganizerAction {
  editPage,
  viewPage,
  sharePage,
  insights,
  payments,
  team,
  memberships,
  eventDefaults,
  rehearse,
  settings,
  help,
}

/// Everything the Organiser tab shows, as plain values.
@immutable
class OrganizerState {
  const OrganizerState({
    required this.organizer,
    required this.isOwner,
    this.pageLink,
    this.pageLive = false,
    this.stats = const <OrganizerStat>[],
    this.statsPending = false,
    this.billMinor,
    this.billCurrencyCode,
    this.accountName,
    this.helpAvailable = false,
  });

  final Organizer organizer;

  /// Owners see money: the bill on the Payments row.
  final bool isOwner;

  /// The public page address without its scheme, such as
  /// `<web domain>/lanternlane` (see `Brand.webDomain`); null until the page
  /// has a route.
  final String? pageLink;

  /// The public page is published on the website.
  final bool pageLive;
  final List<OrganizerStat> stats;

  /// The thirty-day report is still being read.
  final bool statsPending;

  /// The newest Catch bill, owners only; null while unread or when none.
  final int? billMinor;
  final String? billCurrencyCode;

  /// The signed-in host, for the Settings row.
  final String? accountName;

  /// A help page is configured for this build.
  final bool helpAvailable;

  int get teamCount => organizer.displayHostProfiles.length;
}
