// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.

import 'dart:async';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import '../../../events/events_test_helpers.dart';
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import 'capture_fixtures.dart';
import 'capture_viewer.dart';
import 'marketing_host_organizer.dart';

final marketingHostLiveEvent = hostMarketingIndiaScenario.event(
  captureFixtures,
  'hostLiveConsole',
);
final marketingHostParticipationRepository = FakeEventParticipationRepository()
  ..eventParticipations[marketingHostLiveEvent.id] = const [];
final marketingHostPublicProfileRepository = FakePublicProfileRepository();
final marketingHostLiveAttendees = [
  for (final (index, guest)
      in hostMarketingIndiaScenario.guestsAt('live').indexed)
    EventAttendee(
      id: 'marketing-india-attendee-$index',
      eventId: marketingHostLiveEvent.id,
      organizerId: marketingHostOrganizer.id,
      displayName: captureFixtures.publicProfile(guest.personaId).name,
      searchName: captureFixtures
          .publicProfile(guest.personaId)
          .name
          .toLowerCase(),
      source: EventAttendeeSource.catchBooking,
      status: guest.checkedInAt != null
          ? EventAttendeeStatus.checkedIn
          : EventAttendeeStatus.registered,
      createdAt: guest.bookedAt,
      updatedAt: guest.checkedInAt ?? guest.bookedAt,
      checkedInAt: guest.checkedInAt,
    ),
];
EventSuccessPlan marketingHostPlan(Event event, {bool complete = false}) =>
    EventSuccessPlan.fromDraft(
      id: event.id,
      eventId: event.id,
      organizerId: event.organizerId,
      draft: hostMarketingIndiaScenario.guideDefaults.toDraft(
        targetAttendeeCount: event.capacityLimit,
      ),
      createdAt: hostMarketingIndiaScenario.clock('planning'),
      updatedAt: hostMarketingIndiaScenario.clock(
        complete ? 'followUp' : 'live',
      ),
      activeStepIndex: 1,
      status: complete
          ? EventSuccessPlanStatus.complete
          : EventSuccessPlanStatus.live,
      frozenAt: hostMarketingIndiaScenario.clock('live'),
      completedAt: complete ? event.endTime : null,
    );

List<Object> marketingHostManageOverrides(
  Event event, {
  bool complete = false,
}) => [
  uidProvider.overrideWith((ref) => Stream.value(captureViewerUid)),
  watchUserProfileProvider.overrideWith((ref) => Stream.value(captureViewer)),
  watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
  watchReviewsForEventProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(const <Review>[])),
  eventParticipationRepositoryProvider.overrideWithValue(
    marketingHostParticipationRepository,
  ),
  watchEventAttendeesProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(marketingHostLiveAttendees)),
  publicProfileRepositoryProvider.overrideWithValue(
    marketingHostPublicProfileRepository,
  ),
  watchEventSuccessPlanProvider(event.id).overrideWith(
    (ref) => Stream.value(marketingHostPlan(event, complete: complete)),
  ),
  watchEventSuccessScorecardProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(null)),
  watchEventSuccessAssignmentsProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(const <EventSuccessAssignment>[])),
  watchEventSuccessRotationAssignmentsProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(const <EventSuccessAssignment>[])),
  watchEventSuccessPreferencesProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(const <EventSuccessPreference>[])),
  watchEventSuccessWingmanRequestsProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(const <EventSuccessWingmanRequest>[])),
];
