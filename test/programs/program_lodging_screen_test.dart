import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_lodging_providers.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_lodging_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/programs/presentation/program_lodging_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'program_lodging_test_fixtures.dart';
import 'program_operations_fixture.dart';

Future<void> _pump(
  WidgetTester tester,
  FakeLodgingRepository repository, {
  DateTime Function()? clock,
  double textScale = 1,
}) async {
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
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const ProgramLodgingScreen(programId: 'program'),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

void main() {
  testWidgets(
    'membership editor scrolls at double text size without overflow',
    (tester) async {
      final repository = FakeLodgingRepository();
      await _pump(tester, repository, textScale: 2);
      await tester.tap(find.text('Review social memberships'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Guest name'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Local guest'));
      await pumpFeatureUi(tester);
      expect(tester.takeException(), isNull);
      expect(find.textContaining('Family contributor list'), findsOneWidget);
      final cancel = find.text('Cancel');
      await tester.ensureVisible(cancel);
      await pumpFeatureUi(tester);
      expect(cancel.hitTestable(), findsOneWidget);
      expect(tester.takeException(), isNull);
      expect(repository.membershipSaves, 0);
      expect(repository.commands, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets('expired refresh retains uncertain publication receipt fence', (
    tester,
  ) async {
    var clock = DateTime.utc(2027);
    final repository = FakeLodgingRepository();
    await _pump(tester, repository, clock: () => clock);
    repository.setupAccessExpiresAt = clock.add(const Duration(minutes: 1));
    await tester.tap(find.text('Review social memberships'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Cancel'));
    await pumpFeatureUi(tester);
    repository.transitionFailure = TimeoutException('Uncertain publication');
    await tester.tap(find.text('Publish rooms to guests'));
    await pumpFeatureUi(tester);
    expect(repository.commands, hasLength(1));
    clock = clock.add(const Duration(minutes: 2));
    await pumpFeatureUiFor(tester, const Duration(minutes: 2));
    final refresh = tester.widget<CatchButton>(
      find.byWidgetPredicate(
        (w) => w is CatchButton && w.label == 'Refresh rooms',
      ),
    );
    expect(refresh.onPressed, isNull);
    expect(repository.commands, hasLength(1));
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('membership chooser can explicitly clear an existing inclusion', (
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
    await tester.tap(find.text('Review social memberships'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Guest name'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Guest'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Groups'));
    await pumpFeatureUi(tester);
    await tester.tap(
      find.ancestor(of: find.text('Friends'), matching: find.byType(CatchChip)),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Save membership choices'));
    await pumpFeatureUi(tester);
    expect(repository.savedMembershipGroups, isEmpty);
    expect(repository.membershipSaves, 1);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'membership setup expiry hides private chooser before selection',
    (tester) async {
      var clock = DateTime.utc(2027);
      final repository = FakeLodgingRepository();
      await _pump(tester, repository, clock: () => clock);
      repository.setupAccessExpiresAt = clock.add(const Duration(minutes: 1));
      await tester.tap(find.text('Review social memberships'));
      await pumpFeatureUi(tester);
      expect(find.text('Guest name'), findsOneWidget);
      clock = clock.add(const Duration(minutes: 2));
      await pumpFeatureUiFor(tester, const Duration(minutes: 2));
      await pumpFeatureUi(tester);
      expect(find.text('Guest name'), findsNothing);
      expect(find.text('Local guest'), findsNothing);
      expect(
        find.text(
          'Access expired. Return and refresh before reviewing memberships.',
        ),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets('membership evidence expiry hides the complete private editor', (
    tester,
  ) async {
    var clock = DateTime.utc(2027);
    final repository = FakeLodgingRepository();
    await _pump(tester, repository, clock: () => clock);
    repository.setupAccessExpiresAt = clock.add(const Duration(minutes: 3));
    repository.membershipAccessExpiresAt = clock.add(
      const Duration(minutes: 1),
    );
    await tester.tap(find.text('Review social memberships'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Guest name'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Local guest'));
    await pumpFeatureUi(tester);
    expect(find.text('Save membership choices'), findsOneWidget);
    clock = clock.add(const Duration(minutes: 2));
    await pumpFeatureUiFor(tester, const Duration(minutes: 2));
    await pumpFeatureUi(tester);
    expect(find.text('Guest name'), findsNothing);
    expect(find.textContaining('Family contributor list'), findsNothing);
    expect(find.text('Save membership choices'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'routed membership review includes no-travel guests and records explicit choices',
    (tester) async {
      final repository = FakeLodgingRepository();
      await _pump(tester, repository);
      await tester.tap(find.text('Review social memberships'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Guest name'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Local guest'));
      await pumpFeatureUi(tester);
      expect(find.textContaining('Suggestion awaiting review'), findsOneWidget);
      expect(find.textContaining('Family contributor list'), findsOneWidget);
      await tester.tap(find.text('Groups'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Friends'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Save membership choices'));
      await pumpFeatureUi(tester);
      expect(repository.membershipSaves, 1);
      expect(repository.savedMembershipRevision, 7);
      expect(repository.savedMembershipGroups, ['friends']);
      expect(find.text('Publish rooms to guests'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets(
    'uncertain membership save offers fresh read without old save controls',
    (tester) async {
      final repository = FakeLodgingRepository()
        ..membershipFailure = TimeoutException('Unknown result');
      await _pump(tester, repository);
      await tester.tap(find.text('Review social memberships'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Guest name'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Guest'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Save membership choices'));
      await pumpFeatureUi(tester);
      expect(find.text('Save membership choices'), findsNothing);
      expect(find.byType(CatchLocalizedErrorState), findsOneWidget);
      tester
          .widget<CatchLocalizedErrorState>(
            find.byType(CatchLocalizedErrorState),
          )
          .onRetry!();
      await pumpFeatureUi(tester);
      expect(repository.membershipSaves, 1);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'route renders current private proposal with explicit publication',
    (tester) async {
      final repository = FakeLodgingRepository();
      await _pump(tester, repository);
      expect(find.text('Stay planner'), findsOneWidget);
      expect(find.text('Publish rooms to guests'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('ROOM-SHARING PARTIES'),
        250,
        scrollable: findVerticalScrollable(
          within: find.byType(ProgramLodgingScreen),
        ),
      );
      expect(find.text('ROOM-SHARING PARTIES'), findsOneWidget);
      expect(repository.commands, isEmpty);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
  testWidgets('missing setup renders an empty state without mutating', (
    tester,
  ) async {
    final repository = FakeLodgingRepository()..hasSetup = false;
    await _pump(tester, repository);
    expect(find.textContaining('Add lodging dates'), findsOneWidget);
    expect(find.text('Publish rooms to guests'), findsNothing);
    expect(repository.commands, isEmpty);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets('pending decision disables refresh without losing retry', (
    tester,
  ) async {
    final repository = FakeLodgingRepository()
      ..transitionFailure = TimeoutException('Uncertain transport');
    await _pump(tester, repository);
    await tester.tap(find.text('Publish rooms to guests'));
    await pumpFeatureUi(tester);
    final refresh = tester.widget<CatchButton>(
      find.byWidgetPredicate(
        (widget) => widget is CatchButton && widget.label == 'Refresh rooms',
      ),
    );
    expect(refresh.onPressed, isNull);
    expect(repository.commands, hasLength(1));
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'routed setup saves the reviewed revision without inventing sharing',
    (tester) async {
      final repository = FakeLodgingRepository();
      await _pump(tester, repository);
      await tester.tap(find.text('Edit dates, sharing and inventory'));
      await pumpFeatureUi(tester);
      await tester.scrollUntilVisible(
        find.text('Save setup and plan rooms'),
        500,
        scrollable: findVerticalScrollable(
          within: find.byType(ProgramLodgingScreen),
        ),
      );
      await tester.tap(find.text('Save setup and plan rooms'));
      await pumpFeatureUi(tester);
      expect(repository.setupSaves, 1);
      expect(repository.savedConfigurationRevision, 1);
      expect(
        ((repository.savedSetup!['parties']! as List).single
            as Map<Object?, Object?>)['guestIds'],
        ['guest'],
      );
      expect(find.text('Save setup and plan rooms'), findsNothing);
      expect(find.text('Publish rooms to guests'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'routed acknowledged setup reload failure hides stale save controls',
    (tester) async {
      final repository = FakeLodgingRepository();
      await _pump(tester, repository);
      await tester.tap(find.text('Edit dates, sharing and inventory'));
      await pumpFeatureUi(tester);
      repository.previewFailure = TimeoutException(
        'Reload after acknowledged setup failed',
      );
      await tester.scrollUntilVisible(
        find.text('Save setup and plan rooms'),
        500,
        scrollable: findVerticalScrollable(
          within: find.byType(ProgramLodgingScreen),
        ),
      );
      await tester.tap(find.text('Save setup and plan rooms'));
      await pumpFeatureUi(tester);
      expect(repository.setupSaves, 1);
      expect(find.text('Save setup and plan rooms'), findsNothing);
      expect(find.byType(CatchLocalizedErrorState), findsOneWidget);
      repository.previewFailure = null;
      tester
          .widget<CatchLocalizedErrorState>(
            find.byType(CatchLocalizedErrorState),
          )
          .onRetry!();
      await pumpFeatureUi(tester);
      expect(repository.setupSaves, 1);
      expect(find.text('Publish rooms to guests'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'routed stale setup rejection offers a fresh read without repeating write',
    (tester) async {
      final repository = FakeLodgingRepository();
      await _pump(tester, repository);
      await tester.tap(find.text('Edit dates, sharing and inventory'));
      await pumpFeatureUi(tester);
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
      await tester.scrollUntilVisible(
        find.text('Save setup and plan rooms'),
        500,
        scrollable: findVerticalScrollable(
          within: find.byType(ProgramLodgingScreen),
        ),
      );
      await tester.tap(find.text('Save setup and plan rooms'));
      await pumpFeatureUi(tester);
      expect(find.text('Save setup and plan rooms'), findsNothing);
      expect(find.byType(CatchLocalizedErrorState), findsOneWidget);
      repository.setupFailure = null;
      tester
          .widget<CatchLocalizedErrorState>(
            find.byType(CatchLocalizedErrorState),
          )
          .onRetry!();
      await pumpFeatureUi(tester);
      expect(repository.setupSaves, 1);
      expect(find.text('Edit dates, sharing and inventory'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets('session change discards the private routed setup draft', (
    tester,
  ) async {
    final repository = FakeLodgingRepository();
    await _pump(tester, repository);
    await tester.tap(find.text('Edit dates, sharing and inventory'));
    await pumpFeatureUi(tester);
    await tester.scrollUntilVisible(
      find.text('Save setup and plan rooms'),
      500,
      scrollable: findVerticalScrollable(
        within: find.byType(ProgramLodgingScreen),
      ),
    );
    expect(find.text('Save setup and plan rooms'), findsOneWidget);
    repository.hasSetup = false;
    final container = ProviderScope.containerOf(
      tester.element(find.byType(ProgramLodgingScreen)),
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
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets(
    'recording hotel confirmation is separate from guest publication',
    (tester) async {
      final repository = FakeLodgingRepository()
        ..transitionFailure = TimeoutException('Uncertain confirmation');
      await _pump(tester, repository);
      await tester.tap(find.text('Record hotel confirmation: Hotel'));
      await pumpFeatureUi(tester);
      final first = Map.of(repository.commands.single);
      expect(first['action'], 'confirmHotel');
      expect(first['hotelId'], 'hotel');
      final publish = tester.widget<CatchButton>(
        find.byWidgetPredicate(
          (w) => w is CatchButton && w.label == 'Publish rooms to guests',
        ),
      );
      expect(publish.onPressed, isNull);
      repository.transitionFailure = null;
      await tester.tap(find.text('Record hotel confirmation: Hotel'));
      await pumpFeatureUi(tester);
      expect(repository.commands.last, first);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'hotel confirmation is displayed only for the exact approved proposal',
    (tester) async {
      final repository = FakeLodgingRepository();
      final json = lodgingReviewJson();
      final context = json['context']! as Map<String, Object?>;
      final workflow = context['workflow']! as Map<String, Object?>;
      workflow['confirmedHotelIds'] = ['hotel'];
      repository.current = ProgramLodgingReview.fromCallableData(json);
      await _pump(tester, repository);
      final confirmed = tester.widget<CatchButton>(
        find.byWidgetPredicate(
          (w) => w is CatchButton && w.label == 'Hotel confirmed: Hotel',
        ),
      );
      expect(confirmed.onPressed, isNull);
      expect(repository.commands, isEmpty);
      await tester.pumpWidget(const SizedBox.shrink());
      workflow['approvedProposalId'] = List.filled(64, 'b').join();
      repository.current = ProgramLodgingReview.fromCallableData(json);
      await _pump(tester, repository);
      expect(find.text('Hotel confirmed: Hotel'), findsNothing);
      final record = tester.widget<CatchButton>(
        find.byWidgetPredicate(
          (w) =>
              w is CatchButton && w.label == 'Record hotel confirmation: Hotel',
        ),
      );
      expect(record.onPressed, isNull);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
