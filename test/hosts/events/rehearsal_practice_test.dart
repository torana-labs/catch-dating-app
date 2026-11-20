import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_guest_link_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_simulator_body.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_controller.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_screen.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_state.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_tools_screen.dart';
import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_controller.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../event_rehearsal/event_rehearsal_accountability_fixtures.dart';
import '../../event_rehearsal/event_rehearsal_assistance_fixtures.dart';
import '../../support/catch_test_fonts.dart';
import '../../test_pump_helpers.dart';

void main() {
  setUpAll(loadCatchTestFonts);

  group('hostRehearsalPracticeState', () {
    test('a one-room rehearsal runs on the live console, without boards', () {
      final state = hostRehearsalPracticeState(practiceVisitSnapshot());
      expect(state.status, HostRehearsalPracticeStatus.ready);
      expect(state.console, HostRehearsalPracticeConsole.live);
      expect(state.live.steps, isNotEmpty);
      // Both made-up guests are present.
      expect(state.live.checkedIn, 2);
      // The room and the format's board read a real event's guests.
      expect(state.live.formatView, isNull);
      expect(state.live.units, isEmpty);
      expect(state.now, state.rehearsal!.session.virtualNow);
    });

    test('a pace-pod rehearsal runs on the run console', () {
      final state = hostRehearsalPracticeState(
        _withFormat({'activityKind': 'run', 'interactionModel': 'pacePods'}),
      );
      expect(state.console, HostRehearsalPracticeConsole.run);
      expect(state.run.stepCount, greaterThan(0));
      expect(state.run.sweep.checkedIn, 2);
    });

    test('a late guest is a need the host can place', () {
      final wire = practiceBootstrap(
        actors: [
          {...practiceActor(), 'status': 'late'},
          {...practiceActor(), 'actorId': 'actor-02', 'status': 'present'},
        ],
      );
      final state = hostRehearsalPracticeState(
        EventRehearsalBootstrap.fromCallableData(wire),
      );
      expect(state.live.needs.single.id, 'arrival-actor-01');
    });

    test('a paused rehearsal pauses the console', () {
      final wire = practiceBootstrap(status: 'paused');
      final state = hostRehearsalPracticeState(
        EventRehearsalBootstrap.fromCallableData(wire),
      );
      expect(state.live.paused, isTrue);
    });
  });

  group('practice console', () {
    Future<_Repository> mount(
      WidgetTester tester,
      Widget Function(EventRehearsalBootstrap) screen, {
      EventRehearsalBootstrap? snapshot,
    }) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 1600);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final repository = _Repository(snapshot ?? practiceSnapshot());
      // Only rehearsal reads are overridden: a read of a real event would
      // reach Firebase and fail the test.
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
            eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
            eventRehearsalProvider(
              repository.snapshot.session.id,
            ).overrideWith((ref) => repository.watch('')),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: screen(repository.snapshot),
          ),
        ),
      );
      // The console's step meter keeps scheduling frames, so wait for the
      // console itself rather than for idle.
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 100));
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 100));
      return repository;
    }

    Widget console(EventRehearsalBootstrap snapshot) =>
        HostRehearsalPracticeScreen(
          organizerId: snapshot.session.organizerId,
          sessionId: snapshot.session.id,
        );

    testWidgets('renders the rebuilt live console on the virtual clock', (
      tester,
    ) async {
      await mount(tester, console);
      expect(find.byType(HostLiveBody), findsOneWidget);
      expect(find.textContaining('Practice ·'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('finish completes the rehearsal, not a real event', (
      tester,
    ) async {
      final repository = await mount(tester, console);
      final finish = find.text('Finish the night');
      await tester.ensureVisible(finish);
      await tester.tap(finish);
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 100));
      expect(repository.controls, [EventRehearsalControlAction.complete]);
      expect(tester.takeException(), isNull);
    });

    testWidgets('message everyone says practice sends nothing', (tester) async {
      final repository = await mount(tester, console);
      final message = find.text('Message everyone in the room');
      await tester.ensureVisible(message);
      await tester.tap(message);
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 100));
      final container = ProviderScope.containerOf(
        tester.element(find.byType(HostLiveBody)),
      );
      expect(
        container.read(catchNoticeControllerProvider).notices.single.title,
        'Practice sends nothing. On the night, this messages your guests.',
      );
      expect(repository.controls, isEmpty);
    });

    testWidgets('practice tools carry the rehearsal clock and recap', (
      tester,
    ) async {
      await mount(
        tester,
        (snapshot) => HostRehearsalPracticeToolsScreen(
          organizerId: snapshot.session.organizerId,
          sessionId: snapshot.session.id,
        ),
      );
      expect(find.text('Practice tools'), findsOneWidget);
      expect(find.byType(EventRehearsalRunSection), findsOneWidget);
      expect(find.byType(EventRehearsalRecapSection), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}

EventRehearsalBootstrap _withFormat(Map<String, Object?> format) {
  final wire = practiceVisitBootstrap();
  ((wire['session']! as Map)['setup'] as Map)['eventFormat'] = format;
  return EventRehearsalBootstrap.fromCallableData(wire);
}

/// Records each rehearsal control and publishes nothing new.
class _Repository extends Fake implements EventRehearsalRepository {
  _Repository(this.snapshot);
  final EventRehearsalBootstrap snapshot;
  final controls = <EventRehearsalControlAction>[];

  @override
  Stream<EventRehearsalBootstrap> watch(String sessionId) =>
      Stream.value(snapshot);

  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async => snapshot;

  @override
  Future<EventRehearsalBootstrap> control({
    required EventRehearsalSession session,
    required EventRehearsalControlAction action,
    required String clientActionId,
    int? minutes,
  }) async {
    controls.add(action);
    return snapshot;
  }
}
