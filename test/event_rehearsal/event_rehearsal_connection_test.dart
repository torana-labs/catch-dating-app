import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_runtime_adapter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'a disconnected guest retains check-in and confirmed Room placement',
    () {
      final rehearsal = _rehearsal([
        _actor(
          'present',
          EventRehearsalActorStatus.present,
          connection: EventRehearsalConnectionState.disconnected,
        ),
        _actor(
          'expected',
          EventRehearsalActorStatus.expected,
          connection: EventRehearsalConnectionState.disconnected,
        ),
        _actor(
          'no-show',
          EventRehearsalActorStatus.noShow,
          connection: EventRehearsalConnectionState.disconnected,
        ),
      ]);
      final runtime = buildEventRehearsalRuntimeProjection(
        rehearsal,
        practiceGuestLabel: 'Practice',
        latePracticeGuestLabel: 'Late',
      );
      expect(rehearsal.presentCount, 1);
      expect(rehearsal.unresolvedCount, 3);
      expect(runtime.roster.checkedInIds, ['present']);
      expect(runtime.event.checkedInCount, 1);
      final placed = runtime.assignments.singleWhere((a) => a.uid == 'present');
      expect(placed.layoutUnitId, 'table-1');
      expect(placed.confirmedLayoutUnitId, 'table-1');
      expect(
        runtime.presence.entries,
        isEmpty,
        reason: 'a disconnected phone supplies no simulated heartbeat',
      );
      expect(runtime.presence.likelyDeparted, isEmpty);
    },
  );

  test('a connected phone cannot make expected or absent guests present', () {
    final rehearsal = _rehearsal([
      _actor('expected', EventRehearsalActorStatus.expected),
      _actor('no-show', EventRehearsalActorStatus.noShow),
      _actor('departed', EventRehearsalActorStatus.departed),
    ]);
    final runtime = buildEventRehearsalRuntimeProjection(
      rehearsal,
      practiceGuestLabel: 'Practice',
      latePracticeGuestLabel: 'Late',
    );
    expect(runtime.roster.checkedInIds, isEmpty);
    expect(runtime.presence.entries.map((e) => e.state), [
      EventSuccessPresenceState.idle,
      EventSuccessPresenceState.idle,
      EventSuccessPresenceState.likelyDeparted,
    ]);
    expect(runtime.presence.likelyDeparted.single.uid, 'departed');
  });

  test(
    'legacy disconnected records do not regain attendance from a connection',
    () {
      final legacy = _actor('legacy', EventRehearsalActorStatus.disconnected);
      expect(
        legacy.connectionState,
        EventRehearsalConnectionState.disconnected,
      );
      final connected = _actor(
        'reconnected',
        EventRehearsalActorStatus.disconnected,
        connection: EventRehearsalConnectionState.connected,
      );
      final rehearsal = _rehearsal([legacy, connected]);
      final runtime = buildEventRehearsalRuntimeProjection(
        rehearsal,
        practiceGuestLabel: 'Practice',
        latePracticeGuestLabel: 'Late',
      );
      expect(runtime.roster.checkedInIds, isEmpty);
      expect(runtime.assignments, isEmpty);
      expect(
        rehearsal.unresolvedCount,
        2,
        reason: 'physical attendance is still unresolved in the legacy record',
      );
      expect(runtime.presence.entries.single.uid, 'reconnected');
      expect(
        runtime.presence.entries.single.state,
        EventSuccessPresenceState.idle,
      );
      expect(runtime.presence.likelyDeparted, isEmpty);
    },
  );

  test('wire connection state stays independent and malformed values fail', () {
    final raw = <String, Object?>{
      'actorId': 'actor',
      'displayName': 'Practice guest',
      'persona': 'firstTimer',
      'status': 'present',
      'connectionState': 'disconnected',
      'guestMoment': 'assignment',
      'optedOut': false,
      'keepApartActorIds': <String>[],
      'helpRequested': false,
      'promptCompleted': false,
    };
    final actor = EventRehearsalActor.fromMap(raw);
    expect(actor.status, EventRehearsalActorStatus.present);
    expect(actor.connectionState, EventRehearsalConnectionState.disconnected);
    raw.remove('connectionState');
    expect(
      EventRehearsalActor.fromMap(raw).connectionState,
      EventRehearsalConnectionState.connected,
    );
    raw['connectionState'] = null;
    expect(() => EventRehearsalActor.fromMap(raw), throwsFormatException);
    raw['connectionState'] = 'unknown-new-state';
    expect(() => EventRehearsalActor.fromMap(raw), throwsArgumentError);
  });
}

EventRehearsalActor _actor(
  String id,
  EventRehearsalActorStatus status, {
  EventRehearsalConnectionState? connection,
}) => EventRehearsalActor(
  actorId: id,
  displayName: id,
  persona: 'firstTimer',
  status: status,
  connectionState: connection,
  guestMoment: EventRehearsalGuestMoment.assignment,
  optedOut: false,
  keepApartActorIds: const [],
  helpRequested: false,
  promptCompleted: false,
  layoutUnitId: 'table-1',
  confirmedLayoutUnitId: 'table-1',
);

EventRehearsalBootstrap _rehearsal(List<EventRehearsalActor> actors) =>
    EventRehearsalBootstrap(
      session: EventRehearsalSession(
        id: 'connection-test',
        organizerId: 'organizer-1',
        sourceEventId: null,
        scenario: EventRehearsalScenario.lowConnectivity,
        seed: 7,
        actorCount: actors.length,
        actionCount: 1,
        status: EventRehearsalStatus.running,
        setup: const EventRehearsalSetup(
          title: 'Practice',
          locationName: 'Studio',
          durationMinutes: 90,
          hostGoal: 'Practice connectivity',
          attendeePrompt: 'Say hello',
          modules: [EventRehearsalModule.arrival],
        ),
        setupRevision: 1,
        runtimeRevision: 2,
        activeStepIndex: 1,
        virtualNow: DateTime.fromMillisecondsSinceEpoch(1000000),
        fault: EventRehearsalFault.none,
        expiresAt: DateTime.fromMillisecondsSinceEpoch(10000000),
      ),
      actors: actors,
      actions: const [],
      guestUrl: 'https://catchdates.com/rehearse/practice',
      canUseInternalFaults: false,
    );
