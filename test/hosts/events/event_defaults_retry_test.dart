import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_journal.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A defaults save the phone could not confirm survives leaving the screen
/// and is sent again as the exact same request. Carried from the retired
/// organiser workspace's manager defaults controller tests.
void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  final hash = List.filled(64, 'a').join();
  ManagerEventSetupDefaults snapshot(int revision) => ManagerEventSetupDefaults(
    organizerId: 'club-1',
    cityId: null,
    marketId: null,
    timezone: null,
    organizerDefaultsRevision: null,
    basicsReviewedHash: hash,
    preferencesRevision: revision,
    preferences: const ManagerEventSetupPreferences(refundPolicy: 'flexible'),
    preferencesHash: hash,
    reviewedDefaultsHash: hash,
  );

  testWidgets('a lost answer is offered again after reopening and resends '
      'the exact request', (tester) async {
    tester.view.physicalSize = const Size(390, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final repository = _Repository(
      onUpdate: (attempt, request) => attempt == 1
          ? throw StateError('response lost')
          : ManagerEventSetupDefaultsUpdateReceipt(
              appliedRevision: 1,
              current: snapshot(1),
              replayed: true,
            ),
    );
    Future<void> open() => tester.pumpWidget(
      ProviderScope(
        key: UniqueKey(),
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          managerEventSetupDefaultsViewProvider('club-1').overrideWith(
            (ref) => Stream.value(
              ManagerEventSetupDefaultsView.complete(snapshot(0)),
            ),
          ),
          managerEventSetupDefaultsRepositoryProvider.overrideWithValue(
            repository,
          ),
        ],
        child: MaterialApp(
          theme: CatchTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          builder: (context, child) =>
              CatchNoticeOverlay(child: child ?? const SizedBox.shrink()),
          // The signed-in account is watched app-wide in the real shell.
          home: Consumer(
            builder: (context, ref, child) {
              ref.watch(uidProvider);
              return child!;
            },
            child: const HostEventDefaultsScreen(organizerId: 'club-1'),
          ),
        ),
      ),
    );

    await open();
    await _settle(tester);
    await tester.ensureVisible(find.text('No refunds'));
    await tester.tap(find.text('No refunds'));
    await _settle(tester);
    expect(repository.sent, hasLength(1));
    expect(find.text('Previous defaults save unresolved'), findsOneWidget);
    final frozen = repository.sent.single;

    // Leaving and opening the screen again keeps the same request waiting.
    await tester.pumpWidget(const SizedBox.shrink());
    await open();
    await _settle(tester);
    expect(find.text('Previous defaults save unresolved'), findsOneWidget);
    await tester.ensureVisible(find.text('No refunds'));
    await tester.tap(find.text('No refunds'));
    await pumpFeatureUi(tester);
    expect(repository.sent, hasLength(1));

    await tester.ensureVisible(find.text('Retry previous defaults save'));
    await tester.tap(find.text('Retry previous defaults save'));
    await _settle(tester);
    expect(repository.sent, [frozen, frozen]);
    expect(find.text('Previous defaults save unresolved'), findsNothing);
    expect(
      await const ManagerEventSetupDefaultsJournal().load(
        userId: 'host-1',
        organizerId: 'club-1',
      ),
      isNull,
    );
  });
}

/// Lets the journal's preference writes and the save finish between frames.
Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 3; i++) {
    await tester.runAsync(() => Future<void>.delayed(Duration.zero));
    await tester.pump();
  }
}

class _Repository extends Fake implements ManagerEventSetupDefaultsRepository {
  _Repository({required this.onUpdate});

  final ManagerEventSetupDefaultsUpdateReceipt Function(
    int attempt,
    ManagerEventSetupDefaultsUpdateRequest request,
  )
  onUpdate;
  final sent = <Map<String, Object?>>[];

  @override
  Future<ManagerEventSetupDefaultsUpdateReceipt> update(
    ManagerEventSetupDefaultsUpdateRequest request,
  ) async {
    sent.add(request.toJson());
    return onUpdate(sent.length, request);
  }
}
