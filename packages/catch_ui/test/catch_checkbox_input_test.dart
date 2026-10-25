import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget host(Widget child, {double scale = 1, bool dark = false}) => MaterialApp(
  theme: dark ? CatchTheme.dark : CatchTheme.light,
  home: Scaffold(
    body: MediaQuery(
      data: MediaQueryData(textScaler: TextScaler.linear(scale)),
      child: SizedBox(width: 320, child: child),
    ),
  ),
);
void main() {
  testWidgets('label tap reports the next value without owning state', (
    tester,
  ) async {
    final values = <bool>[];
    await tester.pumpWidget(
      host(
        CatchCheckboxInput(
          value: false,
          onChanged: values.add,
          label: 'I acknowledge the rules',
        ),
      ),
    );
    await tester.tap(find.text('I acknowledge the rules'));
    expect(values, [true]);
    expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, false);
    await tester.pumpWidget(
      host(
        CatchCheckboxInput(
          value: true,
          onChanged: values.add,
          label: 'I acknowledge the rules',
        ),
      ),
    );
    await tester.tap(find.byType(Checkbox));
    expect(values, [true, false]);
  });
  for (final value in [false, true]) {
    testWidgets('null callback disables and retains value=$value', (
      tester,
    ) async {
      await tester.pumpWidget(
        host(
          CatchCheckboxInput(
            value: value,
            onChanged: null,
            label: 'Locked acknowledgement',
          ),
        ),
      );
      final control = tester.widget<Checkbox>(find.byType(Checkbox));
      expect(control.onChanged, isNull);
      expect(control.value, value);
      await tester.tap(find.text('Locked acknowledgement'));
      expect(tester.takeException(), isNull);
    });
  }
  testWidgets(
    'uses checked semantics and preserves semantic override and description',
    (tester) async {
      final semantics = tester.ensureSemantics();
      await tester.pumpWidget(
        host(
          CatchCheckboxInput(
            value: true,
            onChanged: (_) {},
            label: 'Agree',
            semanticLabel: 'Acknowledge venue rules',
            description: 'For everyone in this booking.',
          ),
        ),
      );
      expect(find.text('Agree'), findsOneWidget);
      final node = tester.getSemantics(find.byType(CheckboxListTile));
      expect(
        node,
        isSemantics(
          hasCheckedState: true,
          isChecked: true,
          hasEnabledState: true,
          isEnabled: true,
          hasTapAction: true,
        ),
      );
      expect(
        node.getSemanticsData().label.split('\n'),
        unorderedEquals([
          'Acknowledge venue rules',
          'For everyone in this booking.',
        ]),
      );
      semantics.dispose();
    },
  );
  testWidgets('keyboard space activates the checkbox', (tester) async {
    final values = <bool>[];
    await tester.pumpWidget(
      host(
        CatchCheckboxInput(
          value: false,
          onChanged: values.add,
          label: 'Checklist',
        ),
      ),
    );
    await tester.sendKeyEvent(LogicalKeyboardKey.tab);
    await tester.pump();
    await tester.sendKeyEvent(LogicalKeyboardKey.space);
    await tester.pump();
    expect(values, [true]);
  });
  for (final dark in [false, true]) {
    testWidgets('long copy wraps at double text size, dark=$dark', (
      tester,
    ) async {
      await tester.pumpWidget(
        host(
          CatchCheckboxInput(
            value: true,
            onChanged: (_) {},
            label:
                'I acknowledge the complete venue and attendee conduct requirements.',
            description:
                'The full details remain readable and are never truncated.',
          ),
          scale: 2,
          dark: dark,
        ),
      );
      expect(
        find.text('The full details remain readable and are never truncated.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });
  }
}
