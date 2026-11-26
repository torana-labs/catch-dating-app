import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_transport_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_commands.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_household_screen.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_trips_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_trip_actions_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'planner_fixtures.dart';

// A planner write that finishes after its screen is gone must not touch the
// screen's WidgetRef (Riverpod throws once its ConsumerState is disposed),
// and the programme refresh it owes still runs through the container.

const _id = plannerProgramId;

void main() {
  group('runHostProgrammeCommand', () {
    testWidgets('a write that lands after the screen closes still refreshes', (
      tester,
    ) async {
      final probe = await _Probe.start(tester);
      final write = Completer<Object?>();
      late Future<bool> result;
      await probe.show(
        _CommandButton(
          run: (_) => write.future,
          started: (future) => result = future,
        ),
      );
      await tester.tap(find.text('Run'));
      await tester.pump();

      await probe.close();
      write.complete(null);
      await tester.pump();

      expect(tester.takeException(), isNull);
      expect(await result, isTrue);
      probe.expectProgrammeRefreshed();
    });

    testWidgets('a write that fails after the screen closes is logged', (
      tester,
    ) async {
      final probe = await _Probe.start(tester);
      final write = Completer<Object?>();
      late Future<bool> result;
      await probe.show(
        _CommandButton(
          run: (_) => write.future,
          started: (future) => result = future,
        ),
      );
      await tester.tap(find.text('Run'));
      await tester.pump();

      await probe.close();
      write.completeError(StateError('offline'));
      await tester.pump();

      expect(tester.takeException(), isNull);
      expect(await result, isFalse);
      expect(probe.logger.reasons, ['test command']);
      probe.expectProgrammeNotRefreshed();
    });
  });

  group('household', () {
    Future<_Probe> openAnswers(WidgetTester tester) async {
      final probe = await _Probe.start(tester);
      await probe.show(
        const HostProgrammeHouseholdScreen(
          programId: _id,
          householdId: 'mehra',
        ),
      );
      await tester.tap(
        find.byKey(const ValueKey('host-programme-member-kamla')),
      );
      await pumpFeatureUi(tester);
      await tester.tap(
        find.byKey(const ValueKey('host-programme-answer-sangeet-declined')),
      );
      await tester.pump();
      expect(probe.writes.rsvps, 1);
      return probe;
    }

    testWidgets('an answer saved after the screen closes still refreshes', (
      tester,
    ) async {
      final probe = await openAnswers(tester);
      await probe.close();
      probe.writes.rsvp.complete(
        const ProgramMutationResult(
          entityId: 'kamla',
          revision: 2,
          alreadyApplied: false,
        ),
      );
      await tester.pump();

      expect(tester.takeException(), isNull);
      probe.expectProgrammeRefreshed();
    });

    testWidgets('an answer that fails after the screen closes is logged', (
      tester,
    ) async {
      final probe = await openAnswers(tester);
      await probe.close();
      probe.writes.rsvp.completeError(StateError('offline'));
      await tester.pump();

      expect(tester.takeException(), isNull);
      expect(probe.logger.reasons, ['record a guest answer']);
    });

    Future<_Probe> sendLink(WidgetTester tester) async {
      final probe = await _Probe.start(tester);
      await probe.show(
        const HostProgrammeHouseholdScreen(
          programId: _id,
          householdId: 'mehra',
        ),
      );
      await tester.tap(
        find.byKey(const ValueKey('host-programme-household-link')),
      );
      await tester.pump();
      expect(probe.writes.links, 1);
      return probe;
    }

    testWidgets('a link issued after the screen closes opens no share sheet', (
      tester,
    ) async {
      final probe = await sendLink(tester);
      await probe.close();
      probe.writes.link.complete((
        token: 'household-token',
        expiresAt: DateTime(2026, 12, 2),
      ));
      await tester.pump();

      expect(tester.takeException(), isNull);
      expect(probe.shared, isEmpty);
      expect(probe.logger.reasons, isEmpty);
    });

    testWidgets('a link that fails after the screen closes is logged', (
      tester,
    ) async {
      final probe = await sendLink(tester);
      await probe.close();
      probe.writes.link.completeError(StateError('offline'));
      await tester.pump();

      expect(tester.takeException(), isNull);
      expect(probe.logger.reasons, ['send a household RSVP link']);
    });
  });

  group('trips', () {
    testWidgets('an export that fails after the screen closes is logged', (
      tester,
    ) async {
      final probe = await _Probe.start(tester);
      await probe.show(const HostProgrammeTripsScreen(programId: _id));
      await tester.tap(
        find.byKey(const ValueKey('host-programme-trips-export')),
      );
      await tester.pump();
      expect(probe.writes.exports, 1);

      await probe.close();
      probe.writes.export.completeError(StateError('offline'));
      await tester.pump();

      expect(tester.takeException(), isNull);
      expect(probe.logger.reasons, ['export programme trips']);
    });

    testWidgets('a trip marked arrived after the screen closes still '
        'refreshes the ledger', (tester) async {
      final probe = await _Probe.start(tester);
      await probe.show(const HostProgrammeTripsScreen(programId: _id));
      await tester.tap(find.byKey(const ValueKey('host-programme-trip-T-045')));
      await pumpFeatureUi(tester);
      await tester.tap(
        find.byKey(const ValueKey('host-programme-trip-arrived')),
      );
      await pumpFeatureUi(tester);
      expect(probe.writes.arrivals, 1);

      await probe.close();
      probe.writes.arrival.complete(
        const ProgramMutationResult(
          entityId: 'T-045',
          revision: 2,
          alreadyApplied: false,
        ),
      );
      await tester.pump();

      expect(tester.takeException(), isNull);
      probe.expectProgrammeRefreshed();
      expect(probe.readTrips(), greaterThan(probe.tripsBefore));
    });
  });
}

/// The container a test screen runs in: counted programme reads kept
/// alive by listeners (so an invalidation shows as a rebuild once the
/// screen is gone), controlled writes and a recording logger.
class _Probe {
  _Probe._(this.tester);

  final WidgetTester tester;
  final writes = _Writes();
  final logger = _RecordingLogger();
  final shared = <String>[];
  late final ProviderContainer container;
  var _details = 0;
  var _guests = 0;
  var _trips = 0;
  var _detailsBefore = 0;
  var _guestsBefore = 0;
  var tripsBefore = 0;

  static Future<_Probe> start(WidgetTester tester) async {
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final probe = _Probe._(tester);
    probe.container = ProviderContainer(
      overrides: [
        organizerProgramDetailProvider(_id).overrideWith((ref) async {
          probe._details++;
          return plannerDetail;
        }),
        programGuestListProvider(_id).overrideWith((ref) async {
          probe._guests++;
          return plannerGuests;
        }),
        programTripsStreamProvider(_id).overrideWith((ref) {
          probe._trips++;
          return Stream.value(plannerTrips);
        }),
        programWorkspaceControllerProvider.overrideWith(
          () => _Workspace(probe.writes),
        ),
        programTripActionsProvider.overrideWith(
          () => _TripActions(probe.writes),
        ),
        externalShareControllerProvider.overrideWithValue(
          ExternalShareController((params) async {
            probe.shared.add(params.text ?? '');
          }),
        ),
        errorLoggerProvider.overrideWithValue(probe.logger),
      ],
    );
    addTearDown(probe.container.dispose);
    for (final subscription in [
      probe.container.listen(organizerProgramDetailProvider(_id), (_, _) {}),
      probe.container.listen(programGuestListProvider(_id), (_, _) {}),
      probe.container.listen(programTripsStreamProvider(_id), (_, _) {}),
    ]) {
      addTearDown(subscription.close);
    }
    return probe;
  }

  Future<void> show(Widget home) async {
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: home,
        ),
      ),
    );
    await pumpFeatureUi(tester);
  }

  /// Leaves the screen while its write is still in flight.
  Future<void> close() async {
    _detailsBefore = _readDetails();
    _guestsBefore = _readGuests();
    tripsBefore = readTrips();
    await tester.pumpWidget(
      UncontrolledProviderScope(container: container, child: const SizedBox()),
    );
  }

  // Reading an invalidated provider rebuilds it; reading a clean one does not.
  int _readDetails() {
    container.read(organizerProgramDetailProvider(_id));
    return _details;
  }

  int _readGuests() {
    container.read(programGuestListProvider(_id));
    return _guests;
  }

  int readTrips() {
    container.read(programTripsStreamProvider(_id));
    return _trips;
  }

  void expectProgrammeRefreshed() {
    expect(_readDetails(), greaterThan(_detailsBefore));
    expect(_readGuests(), greaterThan(_guestsBefore));
  }

  void expectProgrammeNotRefreshed() {
    expect(_readDetails(), _detailsBefore);
    expect(_readGuests(), _guestsBefore);
  }
}

/// Writes the test completes by hand.
class _Writes {
  var rsvps = 0;
  var links = 0;
  var exports = 0;
  var arrivals = 0;
  final rsvp = Completer<ProgramMutationResult>();
  final link = Completer<({String token, DateTime expiresAt})>();
  final export = Completer<void>();
  final arrival = Completer<ProgramMutationResult>();
}

class _Workspace extends ProgramWorkspaceController {
  _Workspace(this.writes);

  final _Writes writes;

  @override
  Future<ProgramMutationResult> recordFunctionRsvp({
    required String programId,
    required String functionId,
    required String guestId,
    required String rsvpStatus,
    int? partySize,
    bool allowUninvited = false,
  }) {
    writes.rsvps++;
    return writes.rsvp.future;
  }

  @override
  Future<({String token, DateTime expiresAt})> issueHouseholdRsvpLink({
    required String programId,
    required String householdId,
  }) {
    writes.links++;
    return writes.link.future;
  }
}

class _TripActions extends ProgramTripActions {
  _TripActions(this.writes);

  final _Writes writes;

  @override
  Future<void> exportLedger({
    required String programId,
    required String programTitle,
    required String subject,
  }) {
    writes.exports++;
    return writes.export.future;
  }

  @override
  Future<ProgramMutationResult> markArrived({
    required String programId,
    required String tripId,
    required int expectedRevision,
    required String clientOperationId,
  }) {
    writes.arrivals++;
    return writes.arrival.future;
  }
}

class _RecordingLogger extends ErrorLogger {
  _RecordingLogger() : super.silent();

  final reasons = <String?>[];

  @override
  void logError(
    Object error,
    StackTrace? stackTrace, {
    bool fatal = false,
    String? reason,
  }) => reasons.add(reason);
}

/// A screen that runs one planner command when tapped.
class _CommandButton extends ConsumerStatefulWidget {
  const _CommandButton({required this.run, required this.started});

  final Future<Object?> Function(ProgramWorkspaceController controller) run;
  final ValueChanged<Future<bool>> started;

  @override
  ConsumerState<_CommandButton> createState() => _CommandButtonState();
}

class _CommandButtonState extends ConsumerState<_CommandButton> {
  @override
  Widget build(BuildContext context) => TextButton(
    onPressed: () => widget.started(
      runHostProgrammeCommand(
        context,
        ref,
        programId: _id,
        reason: 'test command',
        run: widget.run,
      ),
    ),
    child: const Text('Run'),
  );
}
