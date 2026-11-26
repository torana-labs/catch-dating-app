import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_lodging_providers.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_test_support/programmes/program_operations_fixture.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../../programs/program_lodging_test_fixtures.dart';

Future<void> _pump(
  WidgetTester tester,
  FakeLodgingRepository repository, {
  DateTime Function()? clock,
  double textScale = 1,
  Size size = const Size(390, 2400),
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        if (clock != null)
          programProjectionClockProvider.overrideWithValue(clock),
        uidProvider.overrideWithValue(const AsyncData('actor')),
        programReadSnapshotStoreProvider.overrideWithValue(
          emptyProgramSnapshots(),
        ),
        programLodgingRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(textScale)),
          child: child!,
        ),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const HostProgrammeLodgingScreen(programId: 'program'),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

Finder _key(String value) => find.byKey(ValueKey<String>(value));

CatchButton _button(WidgetTester tester, String label) =>
    tester.widget<CatchButton>(
      find.byWidgetPredicate((w) => w is CatchButton && w.label == label),
    );

Future<void> _tapButton(WidgetTester tester, String label) async {
  final finder = find.byWidgetPredicate(
    (w) => w is CatchButton && w.label == label,
  );
  await tester.ensureVisible(finder);
  await pumpFeatureUi(tester);
  await tester.tap(finder);
  await pumpFeatureUi(tester);
}

Future<void> _chooseGuest(WidgetTester tester, String name) async {
  await tester.tap(find.text('Guest name'));
  await pumpFeatureUi(tester);
  await tester.tap(
    find.descendant(
      of: find.byKey(
        const ValueKey<String>('host-programme-lodging-member-guest'),
      ),
      matching: find.text(name),
    ),
  );
  await pumpFeatureUi(tester);
}

Future<void> _closeMode(WidgetTester tester) async {
  await tester.tap(find.byTooltip('Cancel'));
  await pumpFeatureUi(tester);
}

void main() {
  testWidgets('the proposal shows its decisions and parties, writing nothing', (
    tester,
  ) async {
    final repository = FakeLodgingRepository();
    await _pump(tester, repository);
    expect(find.text('Stay planner'), findsOneWidget);
    expect(find.text('Publish rooms to guests'), findsOneWidget);
    expect(_key('host-programme-lodging-party-party'), findsOneWidget);
    await tester.tap(_key('host-programme-lodging-board'));
    await pumpFeatureUi(tester);
    expect(_key('host-programme-lodging-room-unit'), findsOneWidget);
    expect(repository.commands, isEmpty);
    expect(tester.takeException(), isNull);
  });

  testWidgets('the proposal lays out at desktop width and text scale 2', (
    tester,
  ) async {
    await _pump(
      tester,
      FakeLodgingRepository(),
      size: const Size(1440, 1200),
      textScale: 2,
    );
    expect(find.text('Approve proposal'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a missing setup offers setup and membership review only', (
    tester,
  ) async {
    final repository = FakeLodgingRepository()..hasSetup = false;
    await _pump(tester, repository);
    expect(find.textContaining('Add lodging dates'), findsOneWidget);
    expect(_key('host-programme-lodging-start-setup'), findsOneWidget);
    expect(_key('host-programme-lodging-start-membership'), findsOneWidget);
    expect(find.text('Publish rooms to guests'), findsNothing);
    expect(repository.commands, isEmpty);
  });

  testWidgets('an uncertain decision disables refresh but keeps its retry', (
    tester,
  ) async {
    final repository = FakeLodgingRepository()
      ..transitionFailure = TimeoutException('Uncertain transport');
    await _pump(tester, repository);
    await _tapButton(tester, 'Publish rooms to guests');
    expect(_button(tester, 'Refresh rooms').onPressed, isNull);
    expect(_button(tester, 'Publish rooms to guests').onPressed, isNotNull);
    expect(_button(tester, 'Approve proposal').onPressed, isNull);
    expect(_key('host-programme-lodging-error'), findsOneWidget);
    expect(repository.commands, hasLength(1));
  });

  testWidgets('a hotel confirmation retries with its exact identity', (
    tester,
  ) async {
    final repository = FakeLodgingRepository()
      ..transitionFailure = TimeoutException('Uncertain confirmation');
    await _pump(tester, repository);
    await _tapButton(tester, 'Record hotel confirmation: Hotel');
    final first = Map.of(repository.commands.single);
    expect(first['action'], 'confirmHotel');
    expect(first['hotelId'], 'hotel');
    expect(_button(tester, 'Publish rooms to guests').onPressed, isNull);
    repository.transitionFailure = null;
    await _tapButton(tester, 'Record hotel confirmation: Hotel');
    expect(repository.commands.last, first);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a hotel shows confirmed only for the exact approved proposal', (
    tester,
  ) async {
    final repository = FakeLodgingRepository();
    final json = lodgingReviewJson();
    final context = json['context']! as Map<String, Object?>;
    final workflow = context['workflow']! as Map<String, Object?>;
    workflow['confirmedHotelIds'] = ['hotel'];
    repository.current = ProgramLodgingReview.fromCallableData(json);
    await _pump(tester, repository);
    expect(_button(tester, 'Hotel confirmed: Hotel').onPressed, isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    workflow['approvedProposalId'] = List.filled(64, 'b').join();
    repository.current = ProgramLodgingReview.fromCallableData(json);
    await _pump(tester, repository);
    expect(find.text('Hotel confirmed: Hotel'), findsNothing);
    expect(
      _button(tester, 'Record hotel confirmation: Hotel').onPressed,
      isNull,
    );
    expect(_button(tester, 'Approve proposal').onPressed, isNotNull);
    expect(_button(tester, 'Publish rooms to guests').onPressed, isNull);
  });

  testWidgets('membership review records explicit choices, then returns', (
    tester,
  ) async {
    final repository = FakeLodgingRepository();
    await _pump(tester, repository, textScale: 2);
    await _tapButton(tester, 'Review social memberships');
    await _chooseGuest(tester, 'Local guest');
    expect(find.textContaining('Suggestion awaiting review'), findsOneWidget);
    expect(find.textContaining('Family contributor list'), findsOneWidget);
    await tester.tap(find.text('Groups'));
    await pumpFeatureUi(tester);
    await tester.tap(
      find.descendant(
        of: find.byKey(
          const ValueKey<String>('host-programme-lodging-member-groups'),
        ),
        matching: find.text('Friends'),
      ),
    );
    await pumpFeatureUi(tester);
    await _tapButton(tester, 'Save membership choices');
    expect(repository.membershipSaves, 1);
    expect(repository.savedMembershipRevision, 7);
    expect(repository.savedMembershipGroups, ['friends']);
    expect(find.text('Publish rooms to guests'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('membership review can clear an existing inclusion', (
    tester,
  ) async {
    final json = lodgingMembershipJson();
    json['groupIds'] = ['friends'];
    final row = (json['evidence']! as List).single as Map;
    row['selected'] = true;
    row['sourceKind'] = 'manualEntry';
    row['sourceLabel'] = 'Host membership choice';
    final repository = FakeLodgingRepository()
      ..pendingMembershipRead = Future.value(
        ProgramLodgingMembership.fromMap(
          json,
          programId: 'program',
          guestId: 'guest',
        ),
      );
    await _pump(tester, repository);
    await _tapButton(tester, 'Review social memberships');
    await _chooseGuest(tester, 'Guest');
    await tester.tap(find.text('Groups'));
    await pumpFeatureUi(tester);
    await tester.tap(
      find.ancestor(of: find.text('Friends'), matching: find.byType(CatchChip)),
    );
    await pumpFeatureUi(tester);
    await _tapButton(tester, 'Save membership choices');
    expect(repository.savedMembershipGroups, isEmpty);
    expect(repository.membershipSaves, 1);
  });

  testWidgets('closing membership review writes nothing', (tester) async {
    final repository = FakeLodgingRepository();
    await _pump(tester, repository);
    await _tapButton(tester, 'Review social memberships');
    await _chooseGuest(tester, 'Local guest');
    await _closeMode(tester);
    expect(find.text('Publish rooms to guests'), findsOneWidget);
    expect(repository.membershipSaves, 0);
    expect(repository.commands, isEmpty);
  });

  testWidgets('an uncertain membership save offers a fresh read only', (
    tester,
  ) async {
    final repository = FakeLodgingRepository()
      ..membershipFailure = TimeoutException('Unknown result');
    await _pump(tester, repository);
    await _tapButton(tester, 'Review social memberships');
    await _chooseGuest(tester, 'Guest');
    await _tapButton(tester, 'Save membership choices');
    expect(find.text('Save membership choices'), findsNothing);
    expect(find.byType(CatchLocalizedErrorState), findsOneWidget);
    tester
        .widget<CatchLocalizedErrorState>(find.byType(CatchLocalizedErrorState))
        .onRetry!();
    await pumpFeatureUi(tester);
    expect(repository.membershipSaves, 1);
  });

  testWidgets('expired setup access hides the private membership chooser', (
    tester,
  ) async {
    var clock = DateTime.utc(2027);
    final repository = FakeLodgingRepository();
    await _pump(tester, repository, clock: () => clock);
    repository.setupAccessExpiresAt = clock.add(const Duration(minutes: 1));
    await _tapButton(tester, 'Review social memberships');
    expect(find.text('Guest name'), findsOneWidget);
    clock = clock.add(const Duration(minutes: 2));
    await pumpFeatureUiFor(tester, const Duration(minutes: 2));
    await pumpFeatureUi(tester);
    expect(find.text('Guest name'), findsNothing);
    expect(_key('host-programme-lodging-expired'), findsOneWidget);
  });

  testWidgets('expired membership evidence hides the whole editor', (
    tester,
  ) async {
    var clock = DateTime.utc(2027);
    final repository = FakeLodgingRepository();
    await _pump(tester, repository, clock: () => clock);
    repository.setupAccessExpiresAt = clock.add(const Duration(minutes: 3));
    repository.membershipAccessExpiresAt = clock.add(
      const Duration(minutes: 1),
    );
    await _tapButton(tester, 'Review social memberships');
    await _chooseGuest(tester, 'Local guest');
    expect(find.text('Save membership choices'), findsOneWidget);
    clock = clock.add(const Duration(minutes: 2));
    await pumpFeatureUiFor(tester, const Duration(minutes: 2));
    await pumpFeatureUi(tester);
    expect(find.textContaining('Family contributor list'), findsNothing);
    expect(find.text('Save membership choices'), findsNothing);
  });

  testWidgets('expired refresh keeps an uncertain publication fence', (
    tester,
  ) async {
    var clock = DateTime.utc(2027);
    final repository = FakeLodgingRepository();
    await _pump(tester, repository, clock: () => clock);
    repository.setupAccessExpiresAt = clock.add(const Duration(minutes: 1));
    await _tapButton(tester, 'Review social memberships');
    await _closeMode(tester);
    repository.transitionFailure = TimeoutException('Uncertain publication');
    await _tapButton(tester, 'Publish rooms to guests');
    expect(repository.commands, hasLength(1));
    clock = clock.add(const Duration(minutes: 2));
    await pumpFeatureUiFor(tester, const Duration(minutes: 2));
    await pumpFeatureUi(tester);
    expect(_key('host-programme-lodging-expired'), findsOneWidget);
    expect(_button(tester, 'Refresh rooms').onPressed, isNull);
    expect(repository.commands, hasLength(1));
  });

  testWidgets('setup saves the reviewed revision without inventing sharing', (
    tester,
  ) async {
    final repository = FakeLodgingRepository();
    await _pump(tester, repository);
    await _tapButton(tester, 'Edit dates, sharing and inventory');
    await _tapButton(tester, 'Save setup and plan rooms');
    expect(repository.setupSaves, 1);
    expect(repository.savedConfigurationRevision, 1);
    expect(
      ((repository.savedSetup!['parties']! as List).single
          as Map<Object?, Object?>)['guestIds'],
      ['guest'],
    );
    expect(find.text('Save setup and plan rooms'), findsNothing);
    expect(find.text('Publish rooms to guests'), findsOneWidget);
  });

  testWidgets('a failed reload after a saved setup hides the stale form', (
    tester,
  ) async {
    final repository = FakeLodgingRepository();
    await _pump(tester, repository);
    await _tapButton(tester, 'Edit dates, sharing and inventory');
    repository.previewFailure = TimeoutException('Reload failed');
    await _tapButton(tester, 'Save setup and plan rooms');
    expect(repository.setupSaves, 1);
    expect(find.text('Save setup and plan rooms'), findsNothing);
    expect(find.byType(CatchLocalizedErrorState), findsOneWidget);
    repository.previewFailure = null;
    tester
        .widget<CatchLocalizedErrorState>(find.byType(CatchLocalizedErrorState))
        .onRetry!();
    await pumpFeatureUi(tester);
    expect(repository.setupSaves, 1);
    expect(find.text('Publish rooms to guests'), findsOneWidget);
  });

  testWidgets('a stale setup rejection offers a fresh read, never a repeat', (
    tester,
  ) async {
    final repository = FakeLodgingRepository();
    await _pump(tester, repository);
    await _tapButton(tester, 'Edit dates, sharing and inventory');
    repository.setupFailure = normalizeBackendError(
      FirebaseFunctionsException(
        code: 'aborted',
        message: 'Record changed since you loaded it. Reload and retry.',
      ),
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'manage hotel rooms',
        resource: 'manageProgramLodging',
      ),
    );
    await _tapButton(tester, 'Save setup and plan rooms');
    expect(find.text('Save setup and plan rooms'), findsNothing);
    expect(find.byType(CatchLocalizedErrorState), findsOneWidget);
    repository.setupFailure = null;
    tester
        .widget<CatchLocalizedErrorState>(find.byType(CatchLocalizedErrorState))
        .onRetry!();
    await pumpFeatureUi(tester);
    expect(repository.setupSaves, 1);
    expect(find.text('Edit dates, sharing and inventory'), findsOneWidget);
  });

  testWidgets('a session change discards the private setup draft', (
    tester,
  ) async {
    final repository = FakeLodgingRepository();
    await _pump(tester, repository);
    await _tapButton(tester, 'Edit dates, sharing and inventory');
    expect(find.text('Save setup and plan rooms'), findsOneWidget);
    repository.hasSetup = false;
    final container = ProviderScope.containerOf(
      tester.element(find.byType(HostProgrammeLodgingScreen)),
    );
    container.updateOverrides([
      uidProvider.overrideWithValue(const AsyncData('other')),
      programReadSnapshotStoreProvider.overrideWithValue(
        emptyProgramSnapshots(),
      ),
      programLodgingRepositoryProvider.overrideWithValue(repository),
    ]);
    await pumpFeatureUi(tester);
    expect(find.text('Save setup and plan rooms'), findsNothing);
    expect(find.textContaining('Add lodging dates'), findsOneWidget);
    expect(repository.setupSaves, 0);
  });

  testWidgets('closing the setup form refreshes without saving', (
    tester,
  ) async {
    final repository = FakeLodgingRepository();
    await _pump(tester, repository);
    await _tapButton(tester, 'Edit dates, sharing and inventory');
    await _closeMode(tester);
    expect(find.text('Publish rooms to guests'), findsOneWidget);
    expect(repository.setupSaves, 0);
  });
}
