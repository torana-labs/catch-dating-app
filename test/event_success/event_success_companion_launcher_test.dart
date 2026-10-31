import 'dart:async';

import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/event_success/event_success_companion_launcher.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../events/events_test_helpers.dart'
    show buildEvent, buildEventParticipation;
import '../organizers/organizers_test_helpers.dart'
    show FakeOrganizersRepository, buildOrganizer;
import '../test_pump_helpers.dart';

void main() {
  group('EventSuccessCompanionLaunchRegistry', () {
    test('does not launch from an initial attended snapshot', () {
      final registry = EventSuccessCompanionLaunchRegistry();
      final event = buildEvent();
      final attended = buildEventParticipation(
        event: event,
        uid: 'runner-1',
        status: EventParticipationStatus.attended,
      );

      final transitions = registry.attendedTransitionsForUser(
        uid: 'runner-1',
        participations: [attended],
      );

      expect(transitions, isEmpty);
    });

    test('detects a signed-up to attended transition once', () {
      final registry = EventSuccessCompanionLaunchRegistry();
      final event = buildEvent();
      final signedUp = buildEventParticipation(event: event, uid: 'runner-1');
      final attended = buildEventParticipation(
        event: event,
        uid: 'runner-1',
        status: EventParticipationStatus.attended,
      );

      expect(
        registry.attendedTransitionsForUser(
          uid: 'runner-1',
          participations: [signedUp],
        ),
        isEmpty,
      );

      final transitions = registry.attendedTransitionsForUser(
        uid: 'runner-1',
        participations: [attended],
      );
      expect(transitions, [attended]);

      expect(
        registry.attendedTransitionsForUser(
          uid: 'runner-1',
          participations: [attended],
        ),
        isEmpty,
      );
    });

    test('claims a launch moment only once until reset', () {
      final registry = EventSuccessCompanionLaunchRegistry();

      expect(
        registry.claimLaunch(
          eventId: 'event-1',
          moment: EventSuccessCompanionLaunchMoment.checkedIn,
        ),
        isTrue,
      );
      expect(
        registry.claimLaunch(
          eventId: 'event-1',
          moment: EventSuccessCompanionLaunchMoment.checkedIn,
        ),
        isFalse,
      );

      registry.reset();

      expect(
        registry.claimLaunch(
          eventId: 'event-1',
          moment: EventSuccessCompanionLaunchMoment.checkedIn,
        ),
        isTrue,
      );
    });
  });

  group('launchEventSuccessCompanionIfAvailable', () {
    testWidgets('pushes the companion route when a live guide exists', (
      tester,
    ) async {
      final event = buildEvent();
      final resultCompleter = Completer<EventSuccessCompanionLaunchResult>();

      await _pumpLauncherHarness(
        tester,
        event: event,
        plan: EventSuccessPlan.defaultForEvent(event, now: event.startTime),
        resultCompleter: resultCompleter,
      );

      await tester.tap(find.text('Launch companion'));
      await tester.pump();
      await tester.pump();

      expect(
        await resultCompleter.future,
        EventSuccessCompanionLaunchResult.launched,
      );
      expect(find.text('Companion event-1'), findsOneWidget);
    });

    testWidgets('stays put when no live guide exists', (tester) async {
      final event = buildEvent();
      final resultCompleter = Completer<EventSuccessCompanionLaunchResult>();

      await _pumpLauncherHarness(
        tester,
        event: event,
        plan: null,
        resultCompleter: resultCompleter,
      );

      await tester.tap(find.text('Launch companion'));
      await tester.pump();
      await tester.pump();

      expect(
        await resultCompleter.future,
        EventSuccessCompanionLaunchResult.unavailable,
      );
      expect(find.text('Launcher home'), findsOneWidget);
      expect(find.text('Companion event-1'), findsNothing);
    });

    testWidgets('does not launch for the hosting user', (tester) async {
      final event = buildEvent();
      final resultCompleter = Completer<EventSuccessCompanionLaunchResult>();

      await _pumpLauncherHarness(
        tester,
        event: event,
        uid: 'host-1',
        plan: EventSuccessPlan.defaultForEvent(event, now: event.startTime),
        resultCompleter: resultCompleter,
      );

      await tester.tap(find.text('Launch companion'));
      await tester.pump();
      await tester.pump();

      expect(
        await resultCompleter.future,
        EventSuccessCompanionLaunchResult.unavailable,
      );
      expect(find.text('Launcher home'), findsOneWidget);
      expect(find.text('Companion event-1'), findsNothing);
    });

    testWidgets('launches ended events with always-on attendee surfaces', (
      tester,
    ) async {
      final now = DateTime.now();
      final event = buildEvent(
        startTime: now.subtract(const Duration(hours: 2)),
        endTime: now.subtract(const Duration(hours: 1)),
      );
      final plan = EventSuccessPlan.defaultForEvent(
        event,
        now: event.startTime,
      ).copyWith(selectedModuleIds: [EventSuccessModuleCatalog.hostScript.id]);
      final resultCompleter = Completer<EventSuccessCompanionLaunchResult>();

      await _pumpLauncherHarness(
        tester,
        event: event,
        plan: plan,
        resultCompleter: resultCompleter,
      );

      await tester.tap(find.text('Launch companion'));
      await tester.pump();
      await tester.pump();

      expect(
        await resultCompleter.future,
        EventSuccessCompanionLaunchResult.launched,
      );
      await pumpFeatureUi(tester);
      expect(find.text('Launcher home'), findsNothing);
      expect(find.text('Companion event-1'), findsOneWidget);
    });

    testWidgets('fetches the event for a foreground attendance transition', (
      tester,
    ) async {
      final event = buildEvent();
      final participation = buildEventParticipation(
        event: event,
        uid: 'runner-1',
        status: EventParticipationStatus.attended,
      );
      final resultCompleter = Completer<EventSuccessCompanionLaunchResult>();

      await _pumpLauncherHarness(
        tester,
        event: event,
        plan: EventSuccessPlan.defaultForEvent(event, now: event.startTime),
        resultCompleter: resultCompleter,
        participation: participation,
      );

      await tester.tap(find.text('Launch companion'));
      await tester.pump();
      await tester.pump();

      expect(
        await resultCompleter.future,
        EventSuccessCompanionLaunchResult.launched,
      );
      expect(find.text('Companion event-1'), findsOneWidget);
    });
  });
}

Future<void> _pumpLauncherHarness(
  WidgetTester tester, {
  required Event event,
  required EventSuccessPlan? plan,
  required Completer<EventSuccessCompanionLaunchResult> resultCompleter,
  String uid = 'runner-1',
  EventParticipation? participation,
}) async {
  final organizersRepository = FakeOrganizersRepository()
    ..organizersById[event.organizerId] = buildOrganizer(id: event.organizerId);
  final eventSuccessRepository = _FakeEventSuccessRepository(plan: plan);
  late final GoRouter router;
  router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => _LauncherHome(
          event: event,
          uid: uid,
          participation: participation,
          onResult: resultCompleter.complete,
        ),
      ),
      GoRoute(
        path: Routes.eventSuccessCompanionScreen.path,
        name: Routes.eventSuccessCompanionScreen.name,
        builder: (context, state) =>
            Text('Companion ${state.pathParameters['eventId']}'),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        organizersRepositoryProvider.overrideWithValue(organizersRepository),
        eventRepositoryProvider.overrideWithValue(
          _FakeEventRepository(event: event),
        ),
        eventSuccessRepositoryProvider.overrideWithValue(
          eventSuccessRepository,
        ),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pump();
}

class _LauncherHome extends ConsumerWidget {
  const _LauncherHome({
    required this.event,
    required this.uid,
    this.participation,
    required this.onResult,
  });

  final Event event;
  final String uid;
  final EventParticipation? participation;
  final ValueChanged<EventSuccessCompanionLaunchResult> onResult;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Column(
        children: [
          const Text('Launcher home'),
          TextButton(
            onPressed: () async {
              final result = participation == null
                  ? await launchEventSuccessCompanionIfAvailable(
                      context: context,
                      ref: ref,
                      uid: uid,
                      event: event,
                    )
                  : await launchEventSuccessCompanionForParticipation(
                      context: context,
                      ref: ref,
                      uid: uid,
                      participation: participation!,
                    );
              onResult(result);
            },
            child: const Text('Launch companion'),
          ),
        ],
      ),
    );
  }
}

class _FakeEventSuccessRepository extends Fake
    implements EventSuccessRepository {
  _FakeEventSuccessRepository({required this.plan});

  final EventSuccessPlan? plan;

  @override
  Future<EventSuccessPlan?> fetchPlan(String eventId) async => plan;
}

class _FakeEventRepository extends Fake implements EventRepository {
  _FakeEventRepository({required this.event});

  final Event event;

  @override
  Future<Event?> fetchEvent(String id) async => id == event.id ? event : null;
}
