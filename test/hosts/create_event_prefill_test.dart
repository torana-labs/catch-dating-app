import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_constraints.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_prefill.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  test('repeat prefill copies safe form values and requires a new date', () {
    final createdAt = DateTime(2026, 7, 10, 12);
    final event = buildEvent(
      id: 'trivia-42',
      name: 'Friday trivia',
      organizerId: 'club-7',
      startTime: DateTime(2026, 7, 3, 20, 15),
      endTime: DateTime(2026, 7, 3, 22),
      eventFormat: EventFormatSnapshot.custom(
        label: 'Trivia',
        interactionModel: EventInteractionModel.teamRotations,
        activityDetails: const {
          'publicDetails': {'accessibility': 'Step-free', 'included': 'Dinner'},
        },
      ),
      distanceKm: 0,
      pace: PaceLevel.moderate,
      capacityLimit: 30,
      description: 'A hosted team trivia night.',
      priceInPaise: 125000,
      meetingLocation: const EventMeetingLocation(
        name: 'The Daily Bar',
        address: 'Bandra West, Mumbai',
        placeId: 'place-7',
        latitude: 19.06,
        longitude: 72.83,
        notes: 'Ask for the upstairs room.',
      ),
      constraints: const EventConstraints(minAge: 23, maxAge: 39),
      eventPolicy: EventPolicyBundle.inviteOnlyEvent(
        capacityLimit: 30,
        basePriceInPaise: 125000,
        inviteCodeHint: 'TR...42',
        cancellationPolicy: const EventCancellationPolicy.strict(),
      ),
    ).copyWith(sourceVenueId: 'venue-7');

    final prefill = CreateEventPrefill.repeat(
      event: event,
      createdAt: createdAt,
    );
    final values = prefill.values;

    expect(prefill.sourceEventId, event.id);
    expect(values.organizerId, event.organizerId);
    expect(values.name, 'Friday trivia');
    expect(values.savedAt, createdAt);
    expect(values.activityKind, ActivityKind.openActivity.name);
    expect(values.customActivityLabel, 'Trivia');
    expect(values.interactionModel, EventInteractionModel.teamRotations.name);
    expect(values.description, event.description);
    expect(values.accessibility, 'Step-free');
    expect(values.included, 'Dinner');
    expect(values.meetingPoint, 'The Daily Bar');
    expect(values.meetingLocationAddress, 'Bandra West, Mumbai');
    expect(values.sourceVenueId, isNull);
    expect(values.selectedDateMillis, isNull);
    expect(values.selectedStartHour, 20);
    expect(values.selectedStartMinute, 15);
    expect(values.durationMinutes, 105);
    expect(values.admissionPreset, 'inviteOnly');
    expect(values.inviteCode, isNull);
    expect(values.cancellationPolicy, EventCancellationPolicyId.strict.name);
    expect(values.eventSuccessDefaults.enabled, isFalse);
  });

  test('repeat preserves the explicit member review exemption', () {
    final event = buildEvent(
      eventPolicy: EventPolicyBundle.requestToJoinEvent(
        capacityLimit: 20,
        basePriceInPaise: 0,
        approvedMembersSkipReview: true,
      ),
    );
    expect(CreateEventPrefill.canRepeat(event), isTrue);
    expect(
      CreateEventPrefill.repeat(
        event: event,
        createdAt: DateTime(2026),
      ).values.admissionPreset,
      'requestToJoinMembersExempt',
    );
  });

  test('members-only source is not exposed as repeatable', () {
    final event = buildEvent(
      eventPolicy: EventPolicyBundle(
        admissionPolicy: const EventAdmissionPolicy.membersOnly(
          capacityLimit: 20,
        ),
        pricingPolicy: const EventPricingPolicy.fixed(MoneyAmount.inPaise(0)),
      ),
    );

    expect(CreateEventPrefill.canRepeat(event), isFalse);
  });

  test(
    'repeating an imported event preserves mode but not the old guest source',
    () {
      final event = buildEvent(name: 'Friday supper').copyWith(
        eventOrigin: const EventOrigin(
          mode: EventOriginMode.externalCompanion,
          bookingAuthority: EventBookingAuthority.external,
          rosterAuthority: EventRosterAuthority.hostImport,
          provider: ExternalBookingProvider.luma,
          externalEventId: 'old-booking',
          externalEventUrl: 'https://lu.ma/old-event',
        ),
        runtimeAccess: const EventRuntimeAccess(
          enabled: true,
          publicRuntimeId: 'old-room',
          walkInPolicy: EventRuntimeWalkInPolicy.deny,
          termsVersion: 'v1',
        ),
      );
      final values = CreateEventPrefill.repeat(
        event: event,
        createdAt: DateTime(2026, 9, 4),
      ).values;
      expect(values.name, event.name);
      expect(values.externalBookingMode, isTrue);
      expect(values.externalBookingProvider, 'luma');
      expect(values.runtimeWalkInPolicy, 'deny');
      expect(values.eventSuccessDefaults.enabled, isTrue);
      expect(values.externalEventId, isNull);
      expect(values.externalEventUrl, isNull);
      expect(values.rosterFileFingerprint, isNull);
      expect(values.selectedDateMillis, isNull);
    },
  );

  test('repeat prefill preserves composable route operations', () {
    final event = buildEvent(
      eventFormat: EventFormatSnapshot.fromActivityKind(
        ActivityKind.barCrawl,
        activityDetails: {'routePlan': RouteEventPlan.hostedWalk.toJson()},
      ),
    );

    final values = CreateEventPrefill.repeat(
      event: event,
      createdAt: DateTime(2026, 7, 10),
    ).values;

    expect(
      RouteEventPlan.tryFromJson(values.routePlan),
      RouteEventPlan.hostedWalk,
    );
  });

  test('lossy custom pricing policy is not exposed as repeatable', () {
    final event = buildEvent(
      eventPolicy: EventPolicyBundle(
        admissionPolicy: const EventAdmissionPolicy.balancedRatio(
          capacityLimit: 20,
          waitlistPolicy: EventWaitlistPolicy.rankedOffer(),
          balancedRatioPolicy: BalancedRatioPolicy(
            leftCohortId: EventCohortIds.menInterestedInWomen,
            rightCohortId: EventCohortIds.womenInterestedInMen,
            outOfRatioCohortPolicy:
                EventOutOfRatioCohortPolicy.admitWithinGeneralCapacity,
          ),
        ),
        pricingPolicy: const EventPricingPolicy(
          basePrice: MoneyAmount.inPaise(10000),
          demandPricingRules: [
            EventDemandPricingRule(
              pricedCohortId: EventCohortIds.menInterestedInWomen,
              balancingCohortId: EventCohortIds.womenInterestedInMen,
              stepAdjustment: MoneyAmount.inPaise(1000),
              maxAdjustment: MoneyAmount.inPaise(5000),
              freeSkew: 2,
            ),
          ],
        ),
      ),
    );

    expect(CreateEventPrefill.canRepeat(event), isFalse);
    expect(
      () => CreateEventPrefill.repeat(event: event, createdAt: DateTime(2026)),
      throwsStateError,
    );
  });
}
