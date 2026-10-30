import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen_state.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_test_helpers.dart' as events;

final _l10n = AppLocalizationsEn();

/// INR paid seats are sold only through the organizer's own Razorpay
/// checkout. Anything else is unavailable up front, never charged by Catch.
void main() {
  final now = DateTime(2026, 7, 21, 9);
  final event = events.buildEvent(
    priceInPaise: 15000,
    startTime: now.add(const Duration(days: 1)),
  );

  EventDetailBookingDockState dock({
    required bool seats,
    bool offers = true,
    EventParticipation? participation,
  }) => eventDetailBookingDockStateFrom(
    l10n: _l10n,
    event: event,
    userProfile: events.buildUser(),
    participation: participation,
    now: now,
    hasInviteCode: false,
    supportsPaidBookings: true,
    paidSeatsSoldInApp: seats,
    paidOffersSoldInApp: offers,
  );

  test('organizer-sold paid seats keep the book action', () {
    final state = dock(seats: true);
    expect(state.primaryAction, EventDetailBookingDockAction.book);
    expect(state.label, 'Book event');
    expect(state.catchLine, 'Matching opens for everyone who goes');
  });

  test('other paid seats are unavailable with a reason before any tap', () {
    final state = dock(seats: false);
    expect(state.primaryAction, EventDetailBookingDockAction.none);
    expect(state.label, 'Paid booking unavailable');
    expect(
      state.catchLine,
      'The organiser hasn’t opened paid booking in the app for this event.',
    );
    expect(state.isPrimaryActionEnabled, isFalse);
  });

  test('paid waitlist offers cannot be accepted when offers are not sold', () {
    final offer = events.buildEventParticipation(
      event: event,
      uid: 'runner-1',
      status: EventParticipationStatus.waitlisted,
      waitlistOfferStatus: EventWaitlistOfferStatus.active,
      waitlistOfferExpiresAt: now.add(const Duration(hours: 1)),
    );
    final blocked = dock(seats: true, offers: false, participation: offer);
    expect(blocked.primaryAction, EventDetailBookingDockAction.none);
    expect(blocked.label, 'Paid booking unavailable');
    // Declining stays possible.
    expect(
      blocked.secondaryAction,
      EventDetailBookingDockAction.declineWaitlistOffer,
    );

    final allowed = dock(seats: true, participation: offer);
    expect(
      allowed.primaryAction,
      EventDetailBookingDockAction.acceptWaitlistOffer,
    );
  });
}
