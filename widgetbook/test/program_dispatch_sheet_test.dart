import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_dispatch_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test/programs/program_operations_fixture.dart';
import '../../test/test_pump_helpers.dart';

void main() {
  for (final change in ['deadline', 'authority']) {
    testWidgets('a rejected departure stays reviewable until $change changes', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(460, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final snapshots = emptyProgramSnapshots();
      final storage = MemoryCommandJournalStorage();
      final journal = createProgramOperationJournal(
        storage: () async => storage,
        currentAccountId: () => 'acct',
      );
      final mutator = FakeProgramMutator()
        ..error = const ValidationException('conflict');
      var accepted = false;
      var now = DateTime.now();
      final expiry = now.add(const Duration(seconds: 10));
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            programReadSnapshotStoreProvider.overrideWithValue(snapshots),
            programProjectionClockProvider.overrideWithValue(() => now),
            uidProvider.overrideWithValue(const AsyncData('acct')),
            isObviouslyOfflineProvider.overrideWithValue(false),
            programOperationsOutboxProvider.overrideWithValue(
              ProgramOperationsOutbox(journal, mutator),
            ),
            programTransportVendorsProvider(
              'org-1',
              'program-1',
            ).overrideWithValue(
              const AsyncData([
                ProgramVendorOption(
                  vendorId: 'vendor-1',
                  name: 'Demo fleet',
                  active: true,
                  boundToProgram: true,
                ),
              ]),
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
                  generatedAt: now,
                  rows: [arrivalRow(readiness: TravelLegReadiness.ready)],
                  vehicleClasses: const [],
                ),
                snapshotAt: null,
                snapshotExpiresAt: null,
              )),
            ),
          ],
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(
              body: ProgramDispatchSheet(
                accessExpiresAt: expiry,
                authorityGeneration: 0,
                programId: 'program-1',
                pickupPointId: 'pickup-1',
                organizerId: 'org-1',
                accountId: 'acct',
                group: TransportGroupSuggestion(
                  legIds: const ['leg-1'],
                  partyIds: const [],
                  destinationHotelId: 'hotel-1',
                  destinationLabel: 'Demo Hotel',
                  readiness: TransportGroupReadiness.ready,
                  vehicleClassId: 'sedan',
                  vehicleClassLabel: 'Sedan',
                  passengers: 1,
                  luggageUnits: 1,
                  earliestCurbAt: now,
                  latestCurbAt: now,
                  dispatchBy: null,
                  waitOverdue: false,
                ),
                holdCandidates: [
                  TransportGroupSuggestion(
                    legIds: const ['held-leg'],
                    partyIds: const [],
                    destinationHotelId: 'hotel-1',
                    destinationLabel: 'Demo Hotel',
                    readiness: TransportGroupReadiness.expected,
                    vehicleClassId: 'sedan',
                    vehicleClassLabel: 'Sedan',
                    passengers: 2,
                    luggageUnits: 1,
                    earliestCurbAt: DateTime(2026, 9, 23, 12),
                    latestCurbAt: DateTime(2026, 9, 23, 12),
                    dispatchBy: null,
                    waitOverdue: false,
                  ),
                ],
                vehicleClasses: const [
                  ProgramVehicleClass(
                    id: 'sedan',
                    label: 'Sedan',
                    passengerCapacity: 3,
                    luggageCapacity: 3,
                    capabilities: {},
                    sortOrder: 0,
                  ),
                  ProgramVehicleClass(
                    id: 'van',
                    label: 'Van',
                    passengerCapacity: 6,
                    luggageCapacity: 6,
                    capabilities: {},
                    sortOrder: 1,
                  ),
                ],
                onDispatched: (_, _) => accepted = true,
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      final hold = find.byType(CatchChoiceInput<int>);
      final holdLabel = tester
          .widget<CatchChoiceInput<int>>(hold)
          .itemLabelBuilder(0);
      await tester.tap(find.text(holdLabel));
      await pumpFeatureUi(tester);
      expect(tester.widget<CatchChoiceInput<int>>(hold).selected, {0});
      await tester.tap(find.text(holdLabel));
      await pumpFeatureUi(tester);
      expect(tester.widget<CatchChoiceInput<int>>(hold).selected, isEmpty);
      await tester.tap(find.text('Van'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Demo fleet'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Demo fleet'));
      await pumpFeatureUi(tester);
      expect(
        tester
            .widgetList<CatchChoiceInput<String>>(
              find.byType(CatchChoiceInput<String>),
            )
            .last
            .selected,
        isEmpty,
      );
      await tester.tap(find.text('Demo fleet'));
      await pumpFeatureUi(tester);
      await tester.enterText(find.byType(EditableText), 'DL 1 A 1234');
      await pumpFeatureUi(tester);
      if (change == 'deadline') {
        await expectLater(
          find.byType(MaterialApp),
          matchesGoldenFile('program_screens/program_dispatch_choices.png'),
        );
      }
      await tester.ensureVisible(find.text('Dispatch now'));
      await tester.tap(find.text('Dispatch now'));
      await pumpFeatureUi(tester);
      expect(accepted, isFalse);
      expect(find.byType(ProgramDispatchSheet), findsOneWidget);
      expect(find.text('DL 1 A 1234'), findsOneWidget);
      expect(
        find.text(
          'This saved change needs review. Check the current journey and trip records before recording more work.',
        ),
        findsOneWidget,
      );
      expect(
        (await journal.load('acct')).single.status,
        ProgramOperationOutboxStatus.needsReview,
      );
      final saved = (await journal.load('acct')).single;
      expect(saved.payload['vehicleClassId'], 'van');
      expect(saved.payload['vendorId'], 'vendor-1');
      expect(saved.payload['legIds'], ['leg-1']);
      final calls = mutator.calls.length;
      if (change == 'deadline') {
        now = expiry;
        await pumpFeatureUiFor(tester, const Duration(seconds: 10));
      } else {
        await tester.runAsync(
          () => snapshots.clearProgram('acct', 'program-1'),
        );
      }
      await pumpFeatureUi(tester);
      expect(find.text('DL 1 A 1234'), findsNothing);
      expect(find.textContaining('Demo Hotel'), findsNothing);
      expect(find.text('Dispatch now'), findsNothing);
      expect(mutator.calls.length, calls);
      expect(tester.takeException(), isNull);
    });
  }
}
