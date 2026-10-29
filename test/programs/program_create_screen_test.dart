import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_create_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_create_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'full form validates, shows loading and confirms the retained retry draft dark=$dark scale=$scale',
        (tester) async {
          tester.view.physicalSize = const Size(390, 812);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final pending = Completer<ProgramMutationResult>();
          final detail = Completer<OrganizerProgramSettings>();
          final inventory = Completer<List<OrganizerProgramListRow>>();
          final commands = <(ProgramCreateValues, String)>[];
          final detailIds = <String>[];
          final inventoryIds = <String>[];
          final savedIds = <String>[];
          const receipt = ProgramMutationResult(
            entityId: 'saved-id',
            revision: 1,
            alreadyApplied: true,
          );
          final start = DateTime(2026, 10, 5);
          final end = DateTime(2026, 10, 8);
          final controller = ProgramCreateController(
            organizerId: 'org',
            requestId: 'screen-request-key',
            isActorCurrent: () => true,
            create: (values, key) {
              commands.add((values, key));
              return commands.length == 1
                  ? pending.future
                  : Future.value(receipt);
            },
            readSaved: (id) {
              detailIds.add(id);
              return detail.future;
            },
            refreshPrograms: (id) {
              inventoryIds.add(id);
              return inventory.future;
            },
          );
          addTearDown(controller.dispose);
          await tester.pumpWidget(
            MaterialApp(
              theme: dark ? AppTheme.dark : AppTheme.light,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              supportedLocales: AppLocalizations.supportedLocales,
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(
                  context,
                ).copyWith(textScaler: TextScaler.linear(scale)),
                child: child!,
              ),
              home: CatchScaffold.stepFlow(
                body: ProgramCreatePageBody(
                  organizerName: 'Kapoor Family',
                  controller: controller,
                  onSaved: savedIds.add,
                ),
              ),
            ),
          );
          final submit = find.byKey(const ValueKey('program-create-submit'));
          await tester.tap(submit);
          await tester.pump();
          expect(controller.showErrors, isTrue);
          expect(controller.values.errors.length, 5);
          expect(commands, isEmpty);
          for (final field in {
            'program-create-title': 'Program title',
            'program-create-kind': 'Program type',
            'program-create-timezone': 'Timezone',
            'program-create-start': 'Start date',
            'program-create-end': 'End date',
          }.entries) {
            final row = find.byKey(ValueKey(field.key));
            await tester.ensureVisible(row);
            await tester.pump();
            expect(
              find.descendant(of: row, matching: find.text(field.value)),
              findsOneWidget,
            );
            expect(
              find.descendant(of: row, matching: find.text('Required')),
              findsOneWidget,
            );
          }
          final title = find.descendant(
            of: find.byKey(const ValueKey('program-create-title')),
            matching: find.byType(TextField),
          );
          final timezone = find.byKey(
            const ValueKey('program-create-timezone'),
          );
          await tester.ensureVisible(title);
          await tester.enterText(title, 'Wedding weekend');
          await tester.ensureVisible(timezone);
          await tester.tap(
            find.descendant(of: timezone, matching: find.text('Timezone')),
          );
          await pumpFeatureUi(tester);
          final timezoneSearch = find.descendant(
            of: find.byKey(const ValueKey('program-timezone-search')),
            matching: find.byType(TextField),
          );
          await tester.enterText(timezoneSearch, 'New Delhi');
          await pumpFeatureUi(tester);
          final timezoneChoice = find.byKey(
            const ValueKey('program-timezone-option-Asia/Kolkata'),
          );
          await tester.ensureVisible(timezoneChoice);
          await pumpFeatureUi(tester);
          await tester.tap(timezoneChoice);
          await pumpFeatureUi(tester);
          controller.edit(
            controller.values.copyWith(
              kind: ProgramKind.wedding,
              startsAt: start,
              endsAt: start,
            ),
          );
          await tester.pump();
          await tester.tap(submit);
          await tester.pump();
          final endField = find.byKey(const ValueKey('program-create-end'));
          await tester.ensureVisible(endField);
          await tester.pump();
          expect(
            find.descendant(
              of: endField,
              matching: find.text('End date must be after start date.'),
            ),
            findsOneWidget,
          );
          expect(commands, isEmpty);
          controller.edit(controller.values.copyWith(endsAt: end));
          await tester.pump();
          await tester.tap(submit);
          await tester.pump();
          expect(
            tester.widget<CatchButton>(submit).status,
            CatchButtonStatus.loading,
          );
          expect(tester.widget<CatchButton>(submit).onPressed, isNull);
          expect(commands.length, 1);
          expect(savedIds, isEmpty);
          pending.completeError(StateError('Network interrupted'));
          await tester.pump();
          await tester.pump();
          expect(controller.commandPending, isTrue);
          expect(
            tester.widget<CatchButton>(submit).status,
            CatchButtonStatus.idle,
          );
          expect(find.text('Retry and confirm program'), findsOneWidget);
          expect(find.byType(CatchBanner), findsWidgets);
          await tester.ensureVisible(title);
          expect(
            tester.widget<TextField>(title).controller!.text,
            'Wedding weekend',
          );
          await tester.ensureVisible(timezone);
          expect(
            find.descendant(
              of: timezone,
              matching: find.text('India Standard Time · UTC+05:30'),
            ),
            findsOneWidget,
          );
          expect(controller.values.kind, ProgramKind.wedding);
          expect(controller.values.startsAt, start);
          expect(controller.values.endsAt, end);

          await tester.tap(submit);
          await tester.pump();
          expect(commands.length, 2);
          expect(commands[1].$1, same(commands[0].$1));
          expect(
            commands.map((command) => command.$2),
            everyElement('screen-request-key'),
          );
          expect(
            tester.widget<CatchButton>(submit).status,
            CatchButtonStatus.loading,
          );
          expect(detailIds, ['saved-id']);
          expect(savedIds, isEmpty);
          detail.complete(
            OrganizerProgramSettings(
              programId: 'saved-id',
              organizerId: 'org',
              kind: ProgramKind.wedding,
              title: 'Wedding weekend',
              timezone: 'Asia/Kolkata',
              status: ProgramStatus.draft,
              startsAt: start,
              endsAt: end,
              capabilities: const ['arrivalsTransport'],
              revision: 1,
            ),
          );
          await tester.pump();
          expect(inventoryIds, ['saved-id']);
          expect(savedIds, isEmpty);
          inventory.complete([
            OrganizerProgramListRow(
              programId: 'saved-id',
              title: 'Wedding weekend',
              kind: 'wedding',
              status: 'draft',
              timezone: 'Asia/Kolkata',
              revision: 1,
              startsAt: start,
              endsAt: end,
              functionCount: 0,
            ),
          ]);
          await tester.pump();
          await tester.pump();
          expect(savedIds, ['saved-id']);
          expect(controller.confirmedRow!.programId, 'saved-id');
          expect(
            tester.widget<CatchButton>(submit).status,
            CatchButtonStatus.idle,
          );
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox.shrink());
        },
      );
    }
  }
}
