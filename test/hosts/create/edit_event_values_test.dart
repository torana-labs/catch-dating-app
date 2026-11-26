import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_public_details.dart';
import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/edit_event_state.dart';
import 'package:catch_dating_app/hosts/create/edit_event_values.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('EditEventRouteState maps route provider states', () {
    final event = buildEvent();
    final organizer = buildOrganizer();

    EditEventRouteStatus resolve({
      CatchAsyncState<String?> uid = const CatchAsyncState.data('host-1'),
      CatchAsyncState<Organizer?>? organizerState,
      CatchAsyncState<Event?>? saved,
      Event? initialEvent,
    }) => EditEventRouteState.resolve(
      uid: uid,
      organizer: organizerState ?? CatchAsyncState<Organizer?>.data(organizer),
      event: saved ?? CatchAsyncState<Event?>.data(event),
      initialEvent: initialEvent,
    ).status;

    expect(
      resolve(uid: const CatchAsyncState.loading()),
      EditEventRouteStatus.loading,
    );
    expect(
      resolve(
        organizerState: CatchAsyncState<Organizer?>.error(StateError('failed')),
      ),
      EditEventRouteStatus.error,
    );
    expect(
      resolve(organizerState: const CatchAsyncState<Organizer?>.data(null)),
      EditEventRouteStatus.notFound,
    );
    expect(
      resolve(uid: const CatchAsyncState.data('guest-1')),
      EditEventRouteStatus.unauthorized,
    );
    expect(resolve(), EditEventRouteStatus.ready);
    // A passed-in event stands in while the event loads.
    expect(
      resolve(saved: const CatchAsyncState.loading(), initialEvent: event),
      EditEventRouteStatus.ready,
    );
  });

  test('bookings, a start in the past and cancelling lock the edit', () {
    final start = DateTime(2026, 5, 22, 7);
    final before = start.subtract(const Duration(days: 1));
    final editable = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
    );
    final cancelled = editable.copyWith(
      status: EventLifecycleStatus.cancelled,
      cancelledAt: before,
    );

    expect(editEventScheduleLocked(editable, before), isFalse);
    expect(editEventPolicyLocked(editable, before), isFalse);
    expect(
      editEventScheduleLocked(editable.copyWith(bookedCount: 1), before),
      isTrue,
    );
    expect(
      editEventScheduleLocked(editable.copyWith(waitlistedCount: 1), before),
      isTrue,
    );
    expect(
      editEventScheduleLocked(editable.copyWith(checkedInCount: 1), before),
      isTrue,
    );
    expect(
      editEventScheduleLocked(editable, start.add(const Duration(hours: 2))),
      isTrue,
    );
    expect(editEventCanEdit(cancelled), isFalse);
    expect(editEventPolicyLocked(cancelled, before), isTrue);
  });

  test('a saved event fills every editable draft value', () {
    final start = DateTime(2026, 5, 22, 7, 15);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(minutes: 90)),
      meetingPoint: 'Old gate',
      startingPointLat: 19.076,
      startingPointLng: 72.8777,
      description: 'Old description',
      capacityLimit: 24,
      priceInPaise: 49950,
    );

    final draft = editDraftFromEvent(event, savedAt: start);

    expect(draft.name, event.name);
    expect(draft.eventLocalDate, '2026-05-22');
    expect(draft.eventLocalStartTime, '07:15');
    expect(draft.durationMinutes, 90);
    expect(draft.meetingPoint, 'Old gate');
    expect(draft.startingPointLat, 19.076);
    expect(draft.capacity, '24');
    expect(draft.price, '499.50');
    expect(draft.description, 'Old description');
    expect(editAdmissionPreset(draft), EventAdmissionPreset.openCapacity);
    expect(editStartOf(draft), start);
  });

  test('EditEventSaveRequest builds the unlocked update', () {
    final start = DateTime(2026, 5, 22, 7);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
      meetingPoint: 'Old gate',
      startingPointLat: 19.076,
      startingPointLng: 72.8777,
      description: 'Old description',
    );
    final nextStart = DateTime(2026, 5, 23, 8, 30);
    const itinerary = [
      EventItineraryItem(
        id: 'start',
        kind: EventItineraryKind.activity,
        offsetMinutes: 0,
        title: 'Start together',
      ),
    ];
    final routePlan = RouteEventPlan.socialRun.copyWith(
      version: 2,
      path: const [
        RoutePoint(latitude: 19.08, longitude: 72.88),
        RoutePoint(latitude: 19.09, longitude: 72.89),
      ],
    );

    final request = EditEventSaveRequest.fromForm(
      event: event,
      name: ' Monsoon miles ',
      itinerary: itinerary,
      routePlanChanged: true,
      routePlan: routePlan,
      scheduleLocked: false,
      policyLocked: false,
      selectedStartDateTime: nextStart,
      durationMinutes: 75,
      startingPoint: const LocationCoordinate(19.08, 72.88),
      meetingPoint: ' New gate ',
      meetingLocationAddress: ' Bandstand ',
      meetingLocationPlaceId: ' place-1 ',
      locationDetails: ' Blue gate ',
      distanceText: '7.5',
      selectedPace: PaceLevel.fast,
      description: ' Updated route notes ',
      accessibility: ' Step-free entrance ',
      included: ' Water and route guidance ',
      capacityText: '30',
      priceText: '250',
      admissionPreset: EventAdmissionPreset.inviteOnly,
      cohortCapsEnabled: false,
      dynamicPricingEnabled: false,
      minAgeText: '24',
      maxAgeText: '40',
      maxMenText: '',
      maxWomenText: '',
      dynamicPricingStepText: '',
      dynamicPricingMaxText: '',
      cancellationPolicyId: EventCancellationPolicyId.flexible,
      inviteCodeText: ' SOCIAL2026 ',
    );

    final next = request.nextEvent;
    expect(request.includePolicy, isTrue);
    expect(request.inviteCode, 'SOCIAL2026');
    expect(next.startTime, nextStart);
    expect(next.endTime, nextStart.add(const Duration(minutes: 75)));
    expect(next.name, 'Monsoon miles');
    expect(next.eventFormat.accessibilityNotes, 'Step-free entrance');
    expect(next.eventFormat.includedNotes, 'Water and route guidance');
    expect(next.itinerary, itinerary);
    expect(next.eventFormat.routePlan, routePlan);
    expect(next.meetingPoint, 'New gate');
    expect(next.meetingLocation?.address, 'Bandstand');
    expect(next.meetingLocation?.placeId, 'place-1');
    expect(next.locationDetails, 'Blue gate');
    expect(next.distanceKm, 7.5);
    expect(next.pace, PaceLevel.fast);
    expect(next.description, 'Updated route notes');
    expect(next.capacityLimit, 30);
    expect(next.constraints.minAge, 24);
    expect(next.constraints.maxAge, 40);
    expect(next.effectiveEventPolicy.usesInviteOnly, isTrue);
  });

  test('EditEventSaveRequest keeps a locked schedule and policy', () {
    final start = DateTime(2026, 5, 22, 7);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
      meetingPoint: 'Old gate',
      startingPointLat: 19.076,
      startingPointLng: 72.8777,
      capacityLimit: 18,
      priceInPaise: 50000,
    );
    final draft = editDraftFromEvent(event, savedAt: start).copyWith(
      eventLocalDate: '2026-05-23',
      durationMinutes: 90,
      meetingPoint: 'New gate',
      description: 'Updated route notes',
      capacity: '40',
      price: '900',
      inviteCode: 'LOCKED',
    );

    final request = EditEventSaveRequest.fromDraft(
      event: event,
      draft: draft,
      scheduleLocked: true,
      policyLocked: true,
    );

    expect(request.includePolicy, isFalse);
    expect(request.inviteCode, 'LOCKED');
    expect(request.nextEvent.startTime, event.startTime);
    expect(request.nextEvent.endTime, event.endTime);
    expect(request.nextEvent.capacityLimit, event.capacityLimit);
    expect(request.nextEvent.priceInPaise, event.priceInPaise);
    expect(request.nextEvent.eventPolicy, event.eventPolicy);
    expect(request.nextEvent.constraints, event.constraints);
    expect(request.nextEvent.meetingPoint, 'New gate');
    expect(request.nextEvent.description, 'Updated route notes');
  });

  test('cohort caps and demand pricing round-trip through the draft', () {
    final start = DateTime(2026, 5, 22, 7);
    final event = buildEvent(
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
      startingPointLat: 19.076,
      startingPointLng: 72.8777,
    );
    final draft = editDraftFromEvent(event, savedAt: start);

    final capped = EditEventSaveRequest.fromDraft(
      event: event,
      draft: draft.copyWith(
        admissionPreset: editFixedCohortCapsPreset,
        maxMen: '8',
        maxWomen: '9',
      ),
      scheduleLocked: false,
      policyLocked: false,
    ).nextEvent;
    expect(capped.effectiveEventPolicy.usesFixedCohortCaps, isTrue);
    expect(capped.constraints.maxMen, 8);
    expect(
      editCohortCapsEnabled(editDraftFromEvent(capped, savedAt: start)),
      isTrue,
    );

    final balanced = EditEventSaveRequest.fromDraft(
      event: event,
      draft: draft.copyWith(
        admissionPreset: EventAdmissionPreset.balancedSingles.name,
        dynamicPricingEnabled: true,
        dynamicPricingStep: '250',
        dynamicPricingMax: '1500',
      ),
      scheduleLocked: false,
      policyLocked: false,
    ).nextEvent;
    expect(balanced.effectiveEventPolicy.usesDemandPricing, isTrue);
    final reread = editDraftFromEvent(balanced, savedAt: start);
    expect(editAdmissionPreset(reread), EventAdmissionPreset.balancedSingles);
    expect(reread.dynamicPricingStep, '250');
    expect(reread.dynamicPricingMax, '1500');
  });

  test('editEventProblems checks only what is unlocked', () {
    final start = DateTime(2026, 5, 22, 7);
    final now = start.subtract(const Duration(days: 1));
    final event = buildEvent(
      name: 'Seafront social run',
      startTime: start,
      endTime: start.add(const Duration(hours: 1)),
      startingPointLat: 19.076,
      startingPointLng: 72.8777,
    );
    final draft = editDraftFromEvent(event, savedAt: now);

    Set<CreateProblem> problems(
      EventDraft Function() change, {
      bool locked = false,
    }) => editEventProblems(
      event: event,
      draft: change(),
      scheduleLocked: locked,
      policyLocked: locked,
      now: now,
    );

    expect(problems(() => draft), isEmpty);
    expect(problems(() => draft.copyWith(name: ' ', meetingPoint: '')), {
      CreateProblem.name,
      CreateProblem.placeName,
    });
    expect(problems(() => draft.copyWith(eventLocalDate: '2026-05-20')), {
      CreateProblem.schedule,
    });
    expect(problems(() => draft.copyWith(price: 'x', capacity: '0')), {
      CreateProblem.price,
      CreateProblem.capacity,
    });
    expect(
      problems(
        () => draft.copyWith(
          admissionPreset: EventAdmissionPreset.inviteOnly.name,
          inviteCode: 'abc',
        ),
      ),
      {CreateProblem.inviteCode},
    );
    expect(
      problems(
        () => draft.copyWith(
          eventLocalDate: '2026-05-20',
          price: 'x',
          admissionPreset: EventAdmissionPreset.inviteOnly.name,
        ),
        locked: true,
      ),
      isEmpty,
    );
  });
}
