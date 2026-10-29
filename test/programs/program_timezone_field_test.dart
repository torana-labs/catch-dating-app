import 'dart:io';

import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_timezone.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/presentation/program_create_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_create_state.dart';
import 'package:catch_dating_app/programs/presentation/program_timezone_field.dart';
import 'package:catch_dating_app/programs/presentation/program_timezone_providers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';
import '../ui_captures/support/capture_device.dart';
import '../ui_captures/support/capture_pump.dart';

void main() {
  setUpAll(loadCatchTestFonts);
  for (final scale in [1.0, 2.0]) {
    testWidgets(
      'search selects a named zone and never submits query scale=$scale',
      (tester) async {
        var selected = 'Europe/London';
        var query = '';
        var open = false;
        var enabled = true;
        late StateSetter rebuild;
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(
              body: MediaQuery(
                data: MediaQueryData(
                  size: const Size(800, 600),
                  textScaler: TextScaler.linear(scale),
                ),
                child: StatefulBuilder(
                  builder: (context, setState) {
                    rebuild = setState;
                    return ListView(
                      children: [
                        CatchSection.fieldRows(
                          first: true,
                          children: [
                            ProgramTimezoneField(
                              fieldCopy: catchFieldCopy(context.l10n),
                              searchCopy: catchSearchFieldCopy(context.l10n),
                              title: 'Timezone',
                              placeholder: 'Choose a timezone',
                              searchPlaceholder: 'Search city or timezone',
                              emptyMessage: 'No matching timezones',
                              indiaLabel: 'India Standard Time',
                              helperText: 'Suggested from organizer city.',
                              selected: selected,
                              query: query,
                              date: DateTime(2026, 10, 16),
                              open: open,
                              enabled: enabled,
                              onOpenChanged: (value) =>
                                  setState(() => open = value),
                              onQueryChanged: (value) =>
                                  setState(() => query = value),
                              onSelected: (value) => setState(() {
                                selected = value;
                                open = false;
                              }),
                            ),
                          ],
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
        );
        await tester.tap(find.text('Timezone'));
        await pumpFeatureUi(tester);
        final search = find.descendant(
          of: find.byKey(const ValueKey('program-timezone-search')),
          matching: find.byType(TextField),
        );
        await tester.enterText(search, 'new delhi');
        await tester.pump();
        expect(selected, 'Europe/London');
        final choice = find.byKey(
          const ValueKey('program-timezone-option-Asia/Kolkata'),
        );
        await tester.ensureVisible(choice);
        await tester.tap(choice);
        await pumpFeatureUi(tester);
        expect(selected, 'Asia/Kolkata');
        expect(open, isFalse);
        expect(find.text('India Standard Time · UTC+05:30'), findsOneWidget);
        rebuild(() {
          selected = 'india/new_delhi';
        });
        await pumpFeatureUi(tester);
        expect(find.text('Choose a timezone'), findsOneWidget);
        expect(selected, 'india/new_delhi');
        rebuild(() {
          enabled = false;
        });
        await tester.pump();
        expect(
          tester
              .widget<CatchField>(
                find.byKey(const ValueKey('program-create-timezone')),
              )
              .states,
          contains(WidgetState.disabled),
        );
        expect(open, isFalse);
        expect(tester.takeException(), isNull);
      },
    );
  }
  for (final expanded in [false, true]) {
    testWidgets('render organizer default expanded=$expanded', (tester) async {
      await captureCatchWidget(
        tester,
        id: expanded ? 'program-timezone-picker' : 'program-timezone-default',
        outputDirectory: Directory('build/reports/program-timezone'),
        device: CaptureDevice.iphone17Pro,
        builder: (_) {
          final controller = ProgramCreateController(
            organizerId: 'organizer',
            requestId: 'timezone-capture-request',
            initialValues: ProgramCreateValues(
              title: 'Saket weekend',
              kind: ProgramKind.social,
              timezone: 'Asia/Kolkata',
              startsAt: DateTime(2026, 10, 16),
              endsAt: DateTime(2026, 10, 18),
            ),
            create: (_, _) async => throw StateError('Read-only render'),
            readSaved: (_) async => throw StateError('Read-only render'),
            refreshPrograms: (_) async => throw StateError('Read-only render'),
            isActorCurrent: () => true,
          );
          addTearDown(controller.dispose);
          return CatchScaffold.stepFlow(
            body: ProgramCreatePageBody(
              organizerName: 'Saket Run Club',
              controller: controller,
              onSaved: (_) {},
              timezoneSuggestion: const ProgramTimezoneSuggestion(
                ProgramTimezoneDefault(
                  'Asia/Kolkata',
                  ProgramTimezoneSource.organizer,
                ),
              ),
            ),
          );
        },
        drive: expanded
            ? (tester) async {
                await tester.tap(find.text('Timezone'));
                await pumpFeatureUi(tester);
                final search = find.descendant(
                  of: find.byKey(const ValueKey('program-timezone-search')),
                  matching: find.byType(TextField),
                );
                await tester.ensureVisible(search);
                await tester.enterText(search, 'New Delhi');
                await pumpFeatureUi(tester);
              }
            : null,
      );
    });
  }
}
