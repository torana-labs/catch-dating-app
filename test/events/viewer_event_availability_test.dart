import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/viewer_event_availability.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:flutter_test/flutter_test.dart';

import 'events_test_helpers.dart';

void main() {
  group('resolveViewerEventAvailability', () {
    final now = DateTime(2026, 5, 26, 10);

    test('signed-up participation wins over saved/open eligibility', () {
      final user = buildUser();
      final event = buildEvent(startTime: now.add(const Duration(days: 1)));
      final participation = buildEventParticipation(
        event: event,
        uid: user.uid,
      );

      final availability = resolveViewerEventAvailability(
        event: event,
        userProfile: user,
        participation: participation,
        isSaved: true,
        now: now,
      );

      expect(availability.status, ViewerEventAvailabilityStatus.joined);
      expect(availability.isSaved, isTrue);
    });

    test('approved host-review waitlist edge is bookable', () {
      final user = buildUser();
      final event = buildEvent(startTime: now.add(const Duration(days: 1)));
      final participation = buildEventParticipation(
        event: event,
        uid: user.uid,
        status: EventParticipationStatus.waitlisted,
        hostApprovalStatus: EventJoinRequestStatus.approved,
      );

      final availability = resolveViewerEventAvailability(
        event: event,
        userProfile: user,
        participation: participation,
        now: now,
      );

      expect(availability.status, ViewerEventAvailabilityStatus.approvedToBook);
      expect(availability.canBookNow, isTrue);
    });

    test(
      'expired accepted waitlist offers stay waitlisted at the injected now',
      () {
        final referenceNow = DateTime(2099, 1, 1, 12);
        final user = buildUser();
        final event = buildEvent(
          startTime: referenceNow.add(const Duration(days: 1)),
        );
        final participation = buildEventParticipation(
          event: event,
          uid: user.uid,
          status: EventParticipationStatus.waitlisted,
          waitlistOfferStatus: EventWaitlistOfferStatus.accepted,
          waitlistOfferAcceptedAt: referenceNow.subtract(
            const Duration(days: 3),
          ),
          waitlistOfferExpiresAt: referenceNow.subtract(
            const Duration(days: 1),
          ),
        );

        final availability = resolveViewerEventAvailability(
          event: event,
          userProfile: user,
          participation: participation,
          now: referenceNow,
        );

        expect(availability.status, ViewerEventAvailabilityStatus.waitlisted);
        expect(availability.canBookNow, isFalse);
      },
    );

    test('saved open events keep saved state and viewer price quote', () {
      final user = buildUser();
      final event = buildEvent(
        startTime: now.add(const Duration(days: 1)),
        priceInPaise: 120000,
      );

      final availability = resolveViewerEventAvailability(
        event: event,
        userProfile: user,
        isSaved: true,
        now: now,
      );

      expect(availability.status, ViewerEventAvailabilityStatus.saved);
      expect(availability.quotedPriceInPaise, 120000);
    });

    test('invite-only events are discoverable but booking-gated', () {
      final user = buildUser();
      final event = buildEvent(
        startTime: now.add(const Duration(days: 1)),
        eventPolicy: EventPolicyBundle.inviteOnlyEvent(
          capacityLimit: 12,
          basePriceInPaise: 0,
        ),
      );

      final availability = resolveViewerEventAvailability(
        event: event,
        userProfile: user,
        now: now,
      );

      expect(availability.status, ViewerEventAvailabilityStatus.inviteRequired);
      expect(availability.isBlocked, isTrue);
    });

    test('non-binary viewers resolve to inclusive cohort, not binary caps', () {
      final user = buildUser(
        gender: Gender.nonBinary,
        interestedInGenders: const [Gender.man, Gender.woman],
      );
      final event = buildEvent(
        startTime: now.add(const Duration(days: 1)),
        eventPolicy: EventPolicyBundle.balancedSinglesEvent(
          capacityLimit: 12,
          basePriceInPaise: 0,
        ),
        cohortCounts: const {
          EventCohortIds.menInterestedInWomen: 5,
          EventCohortIds.womenInterestedInMen: 5,
        },
      );

      final availability = resolveViewerEventAvailability(
        event: event,
        userProfile: user,
        now: now,
      );

      expect(availability.status, ViewerEventAvailabilityStatus.open);
      expect(availability.cohortId, EventCohortIds.nonBinaryOrOther);
    });

    test('cohort waitlistable events surface waitlist availability', () {
      final user = buildUser();
      final event = buildEvent(
        startTime: now.add(const Duration(days: 1)),
        eventPolicy: EventPolicyBundle.fixedCohortCapsEvent(
          capacityLimit: 12,
          basePriceInPaise: 0,
          maxMenInterestedInWomen: 1,
        ),
        cohortCounts: const {EventCohortIds.menInterestedInWomen: 1},
      );

      final availability = resolveViewerEventAvailability(
        event: event,
        userProfile: user,
        now: now,
      );

      expect(
        availability.status,
        ViewerEventAvailabilityStatus.waitlistAvailable,
      );
      expect(availability.canJoinWaitlist, isTrue);
    });

    test('legacy aggregate occupancy still makes full events waitlistable', () {
      final user = buildUser();
      final event = buildEvent(
        startTime: now.add(const Duration(days: 1)),
        bookedCount: 20,
      );

      final availability = resolveViewerEventAvailability(
        event: event,
        userProfile: user,
        now: now,
      );

      expect(
        availability.status,
        ViewerEventAvailabilityStatus.waitlistAvailable,
      );
      expect(availability.canJoinWaitlist, isTrue);
    });
  });
}
