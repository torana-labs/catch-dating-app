import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_notice.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test/programs/program_operations_fixture.dart';
import '../../test/test_pump_helpers.dart';

Widget _app(ProviderContainer container) => UncontrolledProviderScope(
  container: container,
  child: MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: AppTheme.light,
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: const Scaffold(
      body: ProgramOperationsNotice(programId: 'p', pickupPointId: 'station'),
    ),
  ),
);

void main() {
  testWidgets(
    'quarantined work exports only after explicit action and remains intact',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(460, 1000);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final storage = MemoryCommandJournalStorage();
      final journal = createProgramOperationJournal(
        storage: () async => storage,
        currentAccountId: () => 'account',
        loadLegacy: (_) async => 'unparseable original record',
      );
      final shared = <({String raw, Rect? origin})>[];
      var shareFails = true;
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData('account')),
          isObviouslyOfflineProvider.overrideWithValue(true),
          programOperationsOutboxProvider.overrideWithValue(
            ProgramOperationsOutbox(journal, FakeProgramMutator()),
          ),
          externalShareLauncherProvider.overrideWithValue((params) async {
            shared.add((
              raw: await params.files!.single.readAsString(),
              origin: params.sharePositionOrigin,
            ));
            if (shareFails) throw StateError('Share unavailable');
          }),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(_app(container));
      await pumpFeatureUi(tester);
      expect(
        find.text(
          'Some saved operations need recovery. Keep the app’s saved data and contact support.',
        ),
        findsOneWidget,
      );
      await tester.tap(find.text('Recover saved work'));
      await pumpFeatureUi(tester);
      expect(find.text('Saved work recovery'), findsOneWidget);
      expect(shared, isEmpty);
      expect(find.textContaining('across all programs'), findsOneWidget);
      await expectLater(
        find.byType(MaterialApp),
        matchesGoldenFile('program_screens/program_journal_recovery.png'),
      );
      await tester.tap(find.text('Export recovery file'));
      await pumpFeatureUi(tester);
      expect(shared, hasLength(1));
      expect(shared.single.origin, isNotNull);
      expect(find.text('Saved work recovery'), findsOneWidget);
      shareFails = false;
      await tester.tap(find.text('Export recovery file'));
      await pumpFeatureUi(tester);
      expect(shared, hasLength(2));
      final result = jsonDecode(shared.last.raw) as Map;
      expect(result['legacyRaw'], 'unparseable original record');
      expect(
        (jsonDecode(result['journalRaw'] as String) as Map)['quarantine'],
        ['unparseable original record'],
      );
      final after = jsonDecode(await journal.exportRecovery('account')) as Map;
      expect(after['journalRaw'], result['journalRaw']);
      expect(after['legacyRaw'], result['legacyRaw']);
      await expectLater(
        journal.load('account'),
        throwsA(isA<ValidationException>()),
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'an account change while preparing recovery never opens sharing',
    (tester) async {
      final response = Completer<String>();
      final outbox = _PausedOutbox(response.future);
      var shared = false;
      final container = ProviderContainer(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData('account')),
          isObviouslyOfflineProvider.overrideWithValue(true),
          programOperationsOutboxProvider.overrideWithValue(outbox),
          externalShareLauncherProvider.overrideWithValue((_) async {
            shared = true;
          }),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(_app(container));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Recover saved work'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Export recovery file'));
      await tester.pump();
      container.updateOverrides([
        uidProvider.overrideWithValue(const AsyncData('other')),
        isObviouslyOfflineProvider.overrideWithValue(true),
        programOperationsOutboxProvider.overrideWithValue(outbox),
        externalShareLauncherProvider.overrideWithValue((_) async {
          shared = true;
        }),
      ]);
      await tester.pump();
      response.complete('{"private":"prior account"}');
      await pumpFeatureUi(tester);
      expect(shared, isFalse);
      expect(tester.takeException(), isNull);
    },
  );
}

class _PausedOutbox extends Fake implements ProgramOperationsOutbox {
  _PausedOutbox(this.response);
  final Future<String> response;
  @override
  Future<ProgramOperationOutboxSummary> loadForProgram({
    required String accountId,
    required String programId,
    DateTime? now,
  }) async => throw const ValidationException(
    'Damaged journal',
    code: 'local-journal-quarantined',
  );
  @override
  Future<String> exportRecovery(String accountId) => response;
}
