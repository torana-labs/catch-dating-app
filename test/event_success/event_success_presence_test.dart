import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_presence_reads.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence_derivation.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_presence_summary_provider.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:fake_async/fake_async.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  test('the summary names its likely departures', () {
    const summary = EventSuccessPresenceSummary(
      liveControlRevision: 3,
      nextRoundIndex: 2,
      policy: EventSuccessPresencePolicy(
        heartbeatIntervalSeconds: 30,
        presentWindowSeconds: 90,
        likelyDepartedAfterSeconds: 300,
      ),
      entries: [
        EventSuccessPresenceEntry(
          uid: 'present-1',
          displayName: 'Present guest',
          state: EventSuccessPresenceState.present,
          heartbeatAtMillis: 900,
        ),
        EventSuccessPresenceEntry(
          uid: 'departed-1',
          displayName: 'Departed guest',
          state: EventSuccessPresenceState.likelyDeparted,
          heartbeatAtMillis: 1,
        ),
      ],
      lateArrivals: [],
    );
    expect(summary.likelyDeparted.single.uid, 'departed-1');
  });

  test('the heartbeat response carries the catalog policy', () {
    final heartbeat = EventSuccessPresenceHeartbeat.fromJson({
      'presenceState': 'present',
      'serverTimeMillis': 10,
      'heartbeatIntervalSeconds': 30,
      'presentWindowSeconds': 90,
      'likelyDepartedAfterSeconds': 300,
    });
    expect(heartbeat.policy.heartbeatIntervalSeconds, 30);
  });

  test('late-arrival resolution requires a stated reason', () {
    expect(
      () => EventSuccessLateArrivalResolution.fromJson({
        'status': 'heldForNextRound',
        'targetRoundIndex': 2,
        'assignmentDraftRevision': 3,
        'reason': '',
      }),
      throwsFormatException,
    );
  });

  test(
    'the console summary recomputes on the clock without touching listeners',
    () {
      fakeAsync((async) {
        final start = DateTime.fromMillisecondsSinceEpoch(1000000);
        final event = buildEvent(organizerId: 'org-1');
        final plan = EventSuccessPlan.defaultForEvent(
          event,
          now: event.startTime,
        ).copyWith(liveControlRevision: 3);
        var heartbeatListens = 0;
        final heartbeats =
            StreamController<List<EventSuccessPresenceHeartbeatRow>>(
              onListen: () => heartbeatListens++,
            );
        addTearDown(heartbeats.close);
        final container = ProviderContainer(
          overrides: [
            appClockProvider.overrideWithValue(
              AppClock.custom(() => start.add(async.elapsed)),
            ),
            eventSuccessPresenceHeartbeatsProvider(
              organizerId: 'org-1',
              eventId: 'event-1',
            ).overrideWith((ref) => heartbeats.stream),
            eventSuccessLateArrivalPlacementsProvider(
              organizerId: 'org-1',
              eventId: 'event-1',
            ).overrideWith((ref) => Stream.value(const [])),
            watchEventSuccessPlanProvider(
              'event-1',
            ).overrideWith((ref) => Stream.value(plan)),
            watchEventSuccessRotationDraftsProvider('event-1').overrideWith(
              (ref) => Stream.value(const <EventSuccessAssignmentDraft>[]),
            ),
            watchEventAttendeesProvider('event-1').overrideWith(
              (ref) => Stream.value([
                EventAttendee(
                  id: 'row-1',
                  eventId: 'event-1',
                  organizerId: 'org-1',
                  displayName: 'Ari',
                  searchName: 'ari',
                  source: EventAttendeeSource.catchBooking,
                  status: EventAttendeeStatus.checkedIn,
                  linkedUid: 'guest-1',
                  checkedInAt: start,
                  createdAt: start,
                  updatedAt: start,
                ),
              ]),
            ),
          ],
        );
        addTearDown(container.dispose);
        final provider = eventSuccessPresenceSummaryProvider(
          organizerId: 'org-1',
          eventId: 'event-1',
          eventStartMillis: event.startTime.millisecondsSinceEpoch,
        );
        container.listen(provider, (_, _) {});
        async.elapse(Duration.zero);
        expect(container.read(provider).isLoading, isTrue);
        heartbeats.add([
          (uid: 'guest-1', heartbeatAtMillis: start.millisecondsSinceEpoch),
        ]);
        async.elapse(Duration.zero);
        final first = container.read(provider).requireValue;
        expect(first.liveControlRevision, 3);
        expect(first.entries.single.displayName, 'Ari');
        expect(first.entries.single.state, EventSuccessPresenceState.present);
        async.elapse(const Duration(seconds: 120));
        expect(
          container.read(provider).requireValue.entries.single.state,
          EventSuccessPresenceState.idle,
        );
        async.elapse(const Duration(seconds: 210));
        expect(
          container.read(provider).requireValue.likelyDeparted.single.uid,
          'guest-1',
        );
        expect(heartbeatListens, 1);
      });
    },
  );
}
