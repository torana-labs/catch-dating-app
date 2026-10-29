import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event_viewer_state.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen_state.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_viewer_state_fixtures.dart';
import 'events_test_helpers.dart';

void main() {
  test('retained admission is distinct from revoked future eligibility', () {
    final v = viewerFixture(
      reason: 'membershipRequired',
      membership: 'revoked',
      review: 'approved',
      admission: 'nativeParticipation',
    );
    expect(v.hasAdmission, isTrue);
    expect(v.canBook, isFalse);
    expect(v.membership, EventViewerMembership.revoked);
    expect(v.payment, EventViewerPayment.notRead);
    expect(v.attendance, EventViewerAttendance.notRecorded);
  });

  test('an owned offer permits acceptance rather than direct booking', () {
    final v = viewerFixture(route: 'catchWaitlistOffer', waitlisted: true);
    expect(v.canAcceptOffer, isTrue);
    expect(v.canBook, isFalse);
    expect(v.hasAdmission, isFalse);
  });

  test('malformed and contradictory facts never produce a booking DTO', () {
    final mutations = <void Function(Map<String, Object?>)>[
      (v) => v['phoneNumber'] = '+919000000001',
      (v) => v.remove('membership'),
      (v) => v['review'] = 'unknown',
      (v) => v['observedAtMillis'] = -1,
      (v) => v['quotedPriceInPaise'] = 0.5,
      (v) => v['futureBooking'] = {
        'allowed': true,
        'reason': 'membershipRequired',
      },
      (v) => v['futureBooking'] = {'allowed': false, 'reason': null},
      (v) => v['route'] = null,
      (v) => v['route'] = 'externalPrivateLink',
      (v) => v['route'] = 'catchCheckout',
    ];
    for (final mutate in mutations) {
      final response = viewerResponse();
      mutate(response['viewer']! as Map<String, Object?>);
      expect(
        () => EventViewerState.fromResponse(response),
        throwsFormatException,
      );
    }
    expect(
      () => EventViewerState.fromResponse({
        'viewer': viewerResponse()['viewer'],
        'uid': 'other',
      }),
      throwsFormatException,
    );
  });

  group('booking dock consumes current facts', () {
    final now = DateTime(2026, 10, 2, 12);
    final event = buildEvent(startTime: now.add(const Duration(days: 1)));
    final user = buildUser();
    final l10n = AppLocalizationsEn();
    EventDetailBookingDockState dock(
      EventViewerState viewer, {
      bool followed = false,
      bool confirmed = false,
      bool offered = false,
    }) => eventDetailBookingDockStateFrom(
      l10n: l10n,
      event: event,
      userProfile: user,
      participation: confirmed || offered
          ? buildEventParticipation(
              event: event,
              uid: user.uid,
              status: confirmed
                  ? EventParticipationStatus.signedUp
                  : EventParticipationStatus.waitlisted,
              waitlistOfferStatus: offered
                  ? EventWaitlistOfferStatus.active
                  : null,
              waitlistOfferExpiresAt: offered
                  ? now.add(const Duration(hours: 1))
                  : null,
            )
          : null,
      currentViewer: viewer,
      isClubMember: followed,
      now: now,
      hasInviteCode: false,
      supportsPaidBookings: true,
    );

    test('follow and approval cannot bypass current membership', () {
      final state = dock(
        viewerFixture(
          reason: 'membershipRequired',
          membership: 'revoked',
          review: 'approved',
        ),
        followed: true,
      );
      expect(state.isPrimaryActionEnabled, isFalse);
      expect(state.primaryAction, EventDetailBookingDockAction.none);
    });

    test('approval cannot bypass present capacity', () {
      final state = dock(viewerFixture(reason: 'full', review: 'approved'));
      expect(state.primaryAction, isNot(EventDetailBookingDockAction.book));
      expect(state.label, isNot('Join approved event'));
    });

    test('confirmed native booking is retained after revocation', () {
      final state = dock(
        viewerFixture(
          reason: 'membershipRequired',
          membership: 'revoked',
          admission: 'nativeParticipation',
        ),
        confirmed: true,
      );
      expect(state.primaryAction, EventDetailBookingDockAction.cancelBooking);
      expect(state.leadingKind, EventDetailBookingDockLeadingKind.booked);
    });

    test('public paid admission does not invent a native cancellation', () {
      final state = dock(
        viewerFixture(
          reason: 'membershipRequired',
          membership: 'revoked',
          admission: 'publicPaidRoster',
        ),
      );
      expect(state.primaryAction, EventDetailBookingDockAction.none);
      expect(state.leadingKind, EventDetailBookingDockLeadingKind.booked);
    });

    test('current quote controls paid display', () {
      final state = dock(viewerFixture(price: 15000));
      expect(state.primaryAction, EventDetailBookingDockAction.book);
      expect(state.leadingKind, EventDetailBookingDockLeadingKind.price);
      expect(state.price, isNotNull);
    });

    test('an active local offer cannot bypass a revoked current grant', () {
      final state = dock(
        viewerFixture(
          reason: 'membershipRequired',
          membership: 'revoked',
          waitlisted: true,
        ),
        offered: true,
      );
      expect(state.primaryAction, EventDetailBookingDockAction.none);
      expect(
        state.secondaryAction,
        EventDetailBookingDockAction.declineWaitlistOffer,
      );
    });

    test('current scoped offer exposes accept rather than direct book', () {
      final state = dock(
        viewerFixture(route: 'catchWaitlistOffer', waitlisted: true),
        offered: true,
      );
      expect(
        state.primaryAction,
        EventDetailBookingDockAction.acceptWaitlistOffer,
      );
    });

    test('current offer survives a missing local participation snapshot', () {
      final state = dock(
        viewerFixture(route: 'catchWaitlistOffer', waitlisted: true),
      );
      expect(
        state.primaryAction,
        EventDetailBookingDockAction.acceptWaitlistOffer,
      );
      expect(state.isPrimaryActionEnabled, isTrue);
      expect(state.waitlistOfferExpiresAt, isNull);
    });

    test(
      'current offer overrides a stale confirmed participation snapshot',
      () {
        final state = dock(
          viewerFixture(route: 'catchWaitlistOffer', waitlisted: true),
          confirmed: true,
        );
        expect(
          state.primaryAction,
          EventDetailBookingDockAction.acceptWaitlistOffer,
        );
      },
    );

    for (final reason in ['cohortCapacityUnavailable', 'balanceUnavailable']) {
      test('waitlisted viewer can leave despite $reason', () {
        final state = dock(viewerFixture(reason: reason, waitlisted: true));
        expect(state.primaryAction, EventDetailBookingDockAction.leaveWaitlist);
        expect(state.isPrimaryActionEnabled, isTrue);
      });
    }

    test('retained admission overrides a stale local waitlist offer', () {
      final state = dock(
        viewerFixture(
          reason: 'membershipRequired',
          membership: 'revoked',
          admission: 'nativeParticipation',
        ),
        offered: true,
      );
      expect(state.primaryAction, EventDetailBookingDockAction.cancelBooking);
      expect(state.leadingKind, EventDetailBookingDockLeadingKind.booked);
      expect(state.secondaryAction, EventDetailBookingDockAction.none);
    });

    test('unknown scope cannot enable any action', () {
      expect(
        () => dock(viewerFixture(organizerId: 'foreign')),
        throwsFormatException,
      );
    });

    test('missing booking details remain closed despite a valid account', () {
      final state = dock(viewerFixture(reason: 'bookingDetailsRequired'));
      expect(state.primaryAction, EventDetailBookingDockAction.none);
    });
  });
}
