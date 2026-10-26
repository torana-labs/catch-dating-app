import 'dart:ui' show CheckedState, Tristate;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

Widget _app(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: child),
);
CatchFieldLabelTextCopy get _copy => CatchFieldLabelTextCopy(
  optionalLabel: 'Optional',
  optionalSuffix: ' · Optional',
  optionalSemantics: (label) => '$label, optional',
);

void main() {
  for (final formRecipe in [false, true]) {
    for (final mode in CatchChipMode.values) {
      for (final allowEmpty in [false, true]) {
        testWidgets('$formRecipe $mode clear=$allowEmpty selection policy', (
          tester,
        ) async {
          var selected = <int>{1};
          final form = GlobalKey<FormState>();
          Set<int>? validated;
          await tester.pumpWidget(
            _app(
              Form(
                key: form,
                child: StatefulBuilder(
                  builder: (context, setState) {
                    void change(Set<int> next) =>
                        setState(() => selected = next);
                    return formRecipe
                        ? CatchChoiceInput<int>.form(
                            label: 'Values',
                            copy: _copy,
                            values: const [1, 2],
                            itemLabelBuilder: (value) => 'Value $value',
                            selected: selected,
                            mode: mode,
                            allowEmptySelection: allowEmpty,
                            onChanged: change,
                            onValidate: (value) {
                              validated = value;
                              return null;
                            },
                          )
                        : CatchChoiceInput<int>(
                            values: const [1, 2],
                            itemLabelBuilder: (value) => 'Value $value',
                            selected: selected,
                            mode: mode,
                            allowEmptySelection: allowEmpty,
                            onChanged: change,
                          );
                  },
                ),
              ),
            ),
          );
          await tester.tap(find.text('Value 1'));
          await tester.pump();
          expect(selected, allowEmpty ? isEmpty : {1});
          await tester.tap(find.text('Value 2'));
          await tester.pump();
          expect(
            selected,
            mode == CatchChipMode.multiple && !allowEmpty ? {1, 2} : {2},
          );
          expect(form.currentState!.validate(), isTrue);
          if (formRecipe) expect(validated, selected);
        });
      }
    }
  }

  testWidgets(
    'same-label choices keep separate value identities through reorder',
    (tester) async {
      var values = [1, 2];
      var selected = <int>{1};
      late StateSetter rebuild;
      await tester.pumpWidget(
        _app(
          StatefulBuilder(
            builder: (context, setState) {
              rebuild = setState;
              return CatchChoiceInput<int>(
                values: values,
                itemLabelBuilder: (_) => 'Mumbai',
                selected: selected,
                mode: CatchChipMode.single,
                onChanged: (next) => setState(() => selected = next),
              );
            },
          ),
        ),
      );
      Finder choice(int value) => find.descendant(
        of: find.byWidgetPredicate(
          (widget) =>
              widget is KeyedSubtree &&
              widget.key is ValueKey<int> &&
              (widget.key! as ValueKey<int>).value == value,
        ),
        matching: find.byType(CatchChip),
      );
      final firstState = tester.state(choice(1));
      final secondState = tester.state(choice(2));
      expect(find.text('Mumbai'), findsNWidgets(2));
      await tester.tap(choice(2));
      await tester.pump();
      expect(selected, {2});
      rebuild(() => values = [2, 1]);
      await tester.pump();
      expect(tester.state(choice(1)), same(firstState));
      expect(tester.state(choice(2)), same(secondState));
      expect(selected, {2});
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'one checked semantic target retains keyboard and disabled behavior',
    (tester) async {
      final semantics = tester.ensureSemantics();
      try {
        var mode = CatchChipMode.single;
        var enabled = true;
        var presses = 0;
        late StateSetter rebuild;
        const key = ValueKey('choice');
        await tester.pumpWidget(
          _app(
            StatefulBuilder(
              builder: (context, setState) {
                rebuild = setState;
                return CatchChip.choice(
                  key: key,
                  label: 'Morning',
                  selected: true,
                  mode: mode,
                  onPressed: enabled ? () => presses++ : null,
                );
              },
            ),
          ),
        );
        final state = tester.state(find.byKey(key));
        var data = tester.getSemantics(find.byKey(key)).getSemanticsData();
        expect(data.flagsCollection.isChecked != CheckedState.none, isTrue);
        expect(data.flagsCollection.isChecked == CheckedState.isTrue, isTrue);
        expect(data.flagsCollection.isInMutuallyExclusiveGroup, isTrue);
        expect(data.flagsCollection.isSelected != Tristate.none, isFalse);
        expect(find.bySemanticsLabel('Morning'), findsOneWidget);
        await tester.sendKeyEvent(LogicalKeyboardKey.tab);
        await tester.pump();
        await tester.sendKeyEvent(LogicalKeyboardKey.enter);
        await tester.pump();
        expect(presses, 1);
        rebuild(() => mode = CatchChipMode.multiple);
        await tester.pump();
        expect(tester.state(find.byKey(key)), same(state));
        data = tester.getSemantics(find.byKey(key)).getSemanticsData();
        expect(data.flagsCollection.isInMutuallyExclusiveGroup, isFalse);
        final icon = tester.widget<Icon>(find.byIcon(CatchIcons.check));
        expect(icon.size, CatchFieldTokens.chipSelectedGlyphExtent);
        rebuild(() => enabled = false);
        await pumpFeatureUi(tester);
        data = tester.getSemantics(find.byKey(key)).getSemanticsData();
        expect(data.flagsCollection.isChecked == CheckedState.isTrue, isTrue);
        expect(data.flagsCollection.isEnabled == Tristate.isTrue, isFalse);
        expect(data.hasAction(SemanticsAction.tap), isFalse);
        await tester.tap(find.byKey(key));
        await tester.sendKeyEvent(LogicalKeyboardKey.space);
        expect(presses, 1);
        expect(tester.takeException(), isNull);
      } finally {
        semantics.dispose();
      }
    },
  );

  testWidgets('form filtering, stable keys, validation and label-free recipe', (
    tester,
  ) async {
    final form = GlobalKey<FormState>();
    var selected = <int>{};
    var showLabel = true;
    late StateSetter rebuild;
    await tester.pumpWidget(
      _app(
        Form(
          key: form,
          child: StatefulBuilder(
            builder: (context, setState) {
              rebuild = setState;
              return CatchChoiceInput<int>.form(
                label: showLabel ? 'Places' : null,
                copy: _copy,
                values: const [1, 2, 3],
                selected: selected,
                itemLabelBuilder: (value) => 'Place $value',
                contractValueBuilder: (value) => '$value',
                contract: const CatchContractFieldConstraints(
                  path: 'test.choice',
                  valueTypes: ['string'],
                  enumValues: ['1', '2'],
                ),
                itemKeyBuilder: (value) => ValueKey(value),
                mode: CatchChipMode.single,
                isOptional: true,
                onValidate: (value) =>
                    value == null || value.isEmpty ? 'Choose a place' : null,
                onChanged: (value) => setState(() => selected = value),
              );
            },
          ),
        ),
      ),
    );
    expect(find.text('Place 3'), findsNothing);
    expect(form.currentState!.validate(), isFalse);
    await tester.pump();
    expect(find.text('Choose a place'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey(2)));
    await tester.pump();
    expect(selected, {2});
    expect(form.currentState!.validate(), isTrue);
    await tester.pump();
    expect(find.text('Choose a place'), findsNothing);
    // Optional copy never silently enables clearing the last choice.
    await tester.tap(find.byKey(const ValueKey(2)));
    await tester.pump();
    expect(selected, {2});
    rebuild(() => showLabel = false);
    await tester.pump();
    expect(find.byType(CatchFieldLabelText), findsNothing);
    expect(selected, {2});
    expect(tester.takeException(), isNull);
  });
}
