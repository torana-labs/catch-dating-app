import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_import_sheet.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets('overflow rows cannot submit a partial import', (tester) async {
    final rows = List.generate(
      251,
      (index) => ['Guest $index', '+919${index.toString().padLeft(9, '0')}'],
    );
    final table = HostRosterTable(
      fileName: 'large.csv',
      format: EventAttendeeImportFormat.csv,
      headers: const ['Name', 'Phone'],
      rows: rows,
      suggestedMapping: const {
        HostRosterField.displayName: 0,
        HostRosterField.phone: 1,
      },
      adapter: const HostRosterAdapterDetection(
        adapterId: HostRosterAdapterId.genericV1,
        support: HostRosterAdapterSupport.generic,
        confidence: 1,
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: HostRosterImportSheet(table: table)),
      ),
    );
    await pumpFeatureUi(tester);
    final button = tester.widget<CatchButton>(
      find.widgetWithText(CatchButton, 'Review 250 ready guests'),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('duplicate buyer emails continue to explicit saved review', (
    tester,
  ) async {
    const table = HostRosterTable(
      fileName: 'tickets.csv',
      format: EventAttendeeImportFormat.csv,
      headers: ['Name', 'Email'],
      rows: [
        ['Asha', 'buyer@example.com'],
        ['Ravi', 'buyer@example.com'],
      ],
      suggestedMapping: {
        HostRosterField.displayName: 0,
        HostRosterField.email: 1,
      },
      adapter: HostRosterAdapterDetection(
        adapterId: HostRosterAdapterId.genericV1,
        support: HostRosterAdapterSupport.generic,
        confidence: 1,
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(body: HostRosterImportSheet(table: table)),
      ),
    );
    await pumpFeatureUi(tester);
    final button = tester.widget<CatchButton>(
      find.widgetWithText(CatchButton, 'Review 1 ready guests'),
    );
    expect(button.onPressed, isNotNull);
  });

  testWidgets('an all-exception file can enter saved review', (tester) async {
    const table = HostRosterTable(
      fileName: 'names-only.csv',
      format: EventAttendeeImportFormat.csv,
      headers: ['Name'],
      rows: [
        ['Asha'],
      ],
      suggestedMapping: {HostRosterField.displayName: 0},
      adapter: HostRosterAdapterDetection(
        adapterId: HostRosterAdapterId.genericV1,
        support: HostRosterAdapterSupport.generic,
        confidence: 1,
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(body: HostRosterImportSheet(table: table)),
      ),
    );
    await pumpFeatureUi(tester);
    final button = tester.widget<CatchButton>(
      find.widgetWithText(CatchButton, 'Review 0 ready guests'),
    );
    expect(button.onPressed, isNotNull);
  });

  for (final scale in [1.0, 2.0]) {
    testWidgets('phone import footer is reachable at text scale $scale', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 760);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      HostRosterImportPlan? imported;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(scale)),
            child: child!,
          ),
          home: Builder(
            builder: (context) => Scaffold(
              body: Center(
                child: CatchButton(
                  label: 'Open guest import',
                  onPressed: () async {
                    imported = await showHostRosterMapping(context, _table);
                  },
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open guest import'));
      await pumpFeatureUi(tester);
      expect(tester.takeException(), isNull);
      final importAction = find.text('Review 2 ready guests');
      expect(importAction.hitTestable(), findsNothing);
      await tester.ensureVisible(importAction);
      await pumpFeatureUi(tester);
      await tester.tap(importAction);
      await pumpFeatureUi(tester);
      expect(imported?.rows.map((row) => row.displayName), ['Asha', 'Ravi']);
      expect(find.byType(HostRosterImportSheet), findsNothing);
      expect(tester.takeException(), isNull);
    });
  }
}

const _table = HostRosterTable(
  fileName: 'guests.csv',
  format: EventAttendeeImportFormat.csv,
  headers: ['Guest', 'Email'],
  rows: [
    ['Asha', 'asha@example.com'],
    ['Ravi', 'ravi@example.com'],
  ],
  suggestedMapping: {HostRosterField.displayName: 0, HostRosterField.email: 1},
  adapter: HostRosterAdapterDetection(
    adapterId: HostRosterAdapterId.genericV1,
    support: HostRosterAdapterSupport.generic,
    confidence: 1,
  ),
);
