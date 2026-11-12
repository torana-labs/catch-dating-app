import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

const _copy = CatchPickerCopy(
  title: 'Datum auswählen',
  cancelLabel: 'Abbrechen',
  doneLabel: 'Fertig',
);

void main() {
  testWidgets('shared date picker uses resolved copy and clamps its date', (
    tester,
  ) async {
    DateTime? selected;
    await tester.pumpWidget(
      _wrap((context) async {
        selected = await showCatchDatePicker(
          context: context,
          copy: _copy,
          initialDate: DateTime(2025),
          firstDate: DateTime(2026, 5, 1, 12),
          lastDate: DateTime(2026, 5, 31, 23),
        );
      }),
    );
    await tester.tap(find.text('Open'));
    await pumpFeatureUi(tester);
    expect(find.text(_copy.title), findsOneWidget);
    expect(find.text(_copy.cancelLabel), findsOneWidget);
    expect(find.text('Done'), findsNothing);
    final picker = tester.widget<CupertinoDatePicker>(
      find.byType(CupertinoDatePicker),
    );
    expect(picker.initialDateTime, DateTime(2026, 5));
    expect(picker.minimumDate, DateTime(2026, 5));
    expect(picker.maximumDate, DateTime(2026, 5, 31));
    await tester.tap(find.text(_copy.doneLabel));
    await pumpFeatureUi(tester);
    expect(selected, DateTime(2026, 5));
  }, variant: TargetPlatformVariant.only(TargetPlatform.iOS));

  testWidgets(
    'shared time picker cancels without committing its initial time',
    (tester) async {
      TimeOfDay? selected = const TimeOfDay(hour: 12, minute: 30);
      await tester.pumpWidget(
        _wrap((context) async {
          selected = await showCatchTimePicker(
            context: context,
            copy: _copy,
            title: 'Uhrzeit auswählen',
            initialTime: const TimeOfDay(hour: 7, minute: 30),
          );
        }),
      );
      await tester.tap(find.text('Open'));
      await pumpFeatureUi(tester);
      expect(find.text('Uhrzeit auswählen'), findsOneWidget);
      expect(find.text(_copy.title), findsNothing);
      await tester.tap(find.text(_copy.cancelLabel));
      await pumpFeatureUi(tester);
      expect(selected, isNull);
    },
    variant: TargetPlatformVariant.only(TargetPlatform.iOS),
  );

  testWidgets('Material date selection retains the framework picker', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap((context) async {
        await showCatchDatePicker(
          context: context,
          copy: _copy,
          initialDate: DateTime(2026, 5, 12),
          firstDate: DateTime(2026, 5),
          lastDate: DateTime(2026, 5, 31),
        );
      }),
    );
    await tester.tap(find.text('Open'));
    await pumpFeatureUi(tester);
    expect(find.byType(DatePickerDialog), findsOneWidget);
    expect(find.byType(CatchWheelPickerSheet), findsNothing);
    expect(find.text(_copy.title), findsNothing);
  }, variant: TargetPlatformVariant.only(TargetPlatform.android));

  testWidgets('shared confirmation resolves supplied defaults and overrides', (
    tester,
  ) async {
    bool? selected;
    await tester.pumpWidget(
      _wrap((context) async {
        selected = await showCatchConfirmDialog(
          context: context,
          title: 'Entwurf löschen?',
          copy: const CatchDialogCopy(
            cancelLabel: 'Abbrechen',
            confirmLabel: 'Bestätigen',
          ),
          confirmLabel: 'Löschen',
          danger: true,
        );
      }),
    );
    await tester.tap(find.text('Open'));
    await pumpFeatureUi(tester);
    expect(find.text('Abbrechen'), findsOneWidget);
    expect(find.text('Bestätigen'), findsNothing);
    expect(
      tester
          .widget<CatchButton>(find.widgetWithText(CatchButton, 'Löschen'))
          .variant,
      CatchButtonVariant.danger,
    );
    await tester.tap(find.text('Löschen'));
    await pumpFeatureUi(tester);
    expect(selected, isTrue);
  });
}

Widget _wrap(Future<void> Function(BuildContext) onOpen) => MaterialApp(
  theme: CatchTheme.light,
  localizationsDelegates: GlobalMaterialLocalizations.delegates,
  home: Scaffold(
    body: Builder(
      builder: (context) =>
          CatchButton(label: 'Open', onPressed: () => onOpen(context)),
    ),
  ),
);
