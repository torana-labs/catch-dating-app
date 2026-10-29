import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/core/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_notice.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test/programs/program_operations_fixture.dart';

void main() {
  testWidgets(
    'review identifies saved work and dismisses only the selected change',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(460, 1000);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final storage = MemoryCommandJournalStorage();
      final journal = createProgramOperationJournal(
        storage: () async => storage,
        currentAccountId: () => 'acct',
      );
      for (final action in ['claim', 'markReady']) {
        await journal.append(
          'acct',
          ProgramOperationOutboxEntry.legObservation(
            programId: 'program-1',
            legId: 'leg-1',
            action: action,
            expectedRevision: 7,
            clientOperationId: action,
            createdAt: DateTime(2026, 2, 14, 14, 30),
          ),
        );
      }
      await journal.flush(
        'acct',
        'program-1',
        (_) async => throw const ValidationException('conflict'),
      );
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWithValue(const AsyncData('acct')),
          isObviouslyOfflineProvider.overrideWithValue(true),
          programOperationsOutboxProvider.overrideWithValue(
            ProgramOperationsOutbox(journal, FakeProgramMutator()),
          ),
          programArrivalsRosterViewProvider(
            'program-1',
            'pickup-1',
          ).overrideWithValue(
            AsyncData((
              value: ProgramArrivalsRoster(
                accessExpiresAt: null,
                programId: 'program-1',
                pickupPointId: 'pickup-1',
                generatedAt: DateTime(2026, 2, 14),
                rows: [arrivalRow()],
                vehicleClasses: const [],
              ),
              snapshotAt: null,
              snapshotExpiresAt: null,
            )),
          ),
        ],
      );
      addTearDown(container.dispose);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: const Scaffold(
              body: ProgramOperationsNotice(
                programId: 'program-1',
                pickupPointId: 'pickup-1',
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Review changes'));
      await tester.pumpAndSettle();
      expect(find.text('Demo Guest'), findsNWidgets(2));
      expect(find.text('Claim guest'), findsOneWidget);
      expect(find.text('Guest ready at curb'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await expectLater(
        find.byType(MaterialApp),
        matchesGoldenFile('program_screens/program_operations_review.png'),
      );
      await tester.tap(find.text('Dismiss this saved change').first);
      await tester.pumpAndSettle();
      expect(
        (await journal.load('acct')).single.clientOperationId,
        'markReady',
      );
      expect(find.text('Claim guest'), findsNothing);
      expect(find.text('Guest ready at curb'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
