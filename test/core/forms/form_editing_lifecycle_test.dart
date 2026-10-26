import 'dart:async';

import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _app(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: SingleChildScrollView(child: child)),
);

Future<void> _motion(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(CatchFieldTokens.reveal);
  await tester.pump();
}

void main() {
  testWidgets('range draft follows a changed authoritative value', (
    tester,
  ) async {
    var minimum = 2;
    var maximum = 4;
    late StateSetter rebuild;
    final accordion = CatchAccordionController(initialExpanded: 'range');
    addTearDown(accordion.dispose);
    await tester.pumpWidget(
      _app(
        StatefulBuilder(
          builder: (context, setState) {
            rebuild = setState;
            return CatchFormList<(int, int)>(
              fieldCopy: catchFieldCopy(AppLocalizationsEn()),
              accordion: accordion,
              rows: [
                CatchFormRangeRow<(int, int)>(
                  id: 'range',
                  icon: CatchIcons.filters,
                  label: 'Range',
                  value: '$minimum - $maximum',
                  currentMin: minimum,
                  currentMax: maximum,
                  sliderMin: 0,
                  sliderMax: 10,
                  divisions: 10,
                  labelText: (value) => value.round().toString(),
                  patchForRange: (min, max) => (min, max),
                ),
              ],
              onSave: (_) async => true,
              errorTextBuilder: (_, error) => error.toString(),
            );
          },
        ),
      ),
    );
    await _motion(tester);
    expect(
      tester.widget<RangeSlider>(find.byType(RangeSlider)).values,
      const RangeValues(2, 4),
    );
    rebuild(() {
      minimum = 5;
      maximum = 8;
    });
    await tester.pump();
    expect(
      tester.widget<RangeSlider>(find.byType(RangeSlider)).values,
      const RangeValues(5, 8),
    );
  });

  for (final multiple in [false, true]) {
    testWidgets(
      '${multiple ? "multiple" : "single"} choice keeps drafts, cancels, and retries a failed save',
      (tester) async {
        var selected = <int>[1];
        var unrelated = 0;
        late StateSetter rebuild;
        final saves = <List<int>>[];
        Completer<bool>? pending;
        final accordion = CatchAccordionController(initialExpanded: 'choice');
        addTearDown(accordion.dispose);
        await tester.pumpWidget(
          _app(
            StatefulBuilder(
              builder: (context, setState) {
                rebuild = setState;
                return CatchFormList<List<int>>(
                  key: const ValueKey('form'),
                  fieldCopy: catchFieldCopy(AppLocalizationsEn()),
                  title: 'Revision $unrelated',
                  accordion: accordion,
                  rows: [
                    if (multiple)
                      CatchFormMultiChoiceRow<List<int>, int>(
                        id: 'choice',
                        icon: CatchIcons.people,
                        label: 'Choice',
                        values: const [1, 2, 3],
                        selected: selected,
                        itemLabel: (value) => 'Option $value',
                        patchForValues: (values) => values,
                      )
                    else
                      CatchFormSingleChoiceRow<List<int>, int>(
                        id: 'choice',
                        icon: CatchIcons.people,
                        label: 'Choice',
                        values: const [1, 2, 3],
                        value: selected.firstOrNull,
                        itemLabel: (value) => 'Option $value',
                        patchForValue: (value) => [?value],
                      ),
                  ],
                  onSave: (patch) {
                    saves.add(patch);
                    pending = Completer<bool>();
                    return pending!.future;
                  },
                  errorTextBuilder: (_, error) => 'Could not save',
                );
              },
            ),
          ),
        );
        await _motion(tester);
        await tester.tap(find.text('Option 2').hitTestable());
        rebuild(() {
          unrelated++;
          selected = selected.toList();
        });
        await _motion(tester);
        await tester.tap(find.byKey(const ValueKey('catch-field-done')));
        await tester.pump();
        expect(saves, [
          multiple ? [1, 2] : [2],
        ]);
        expect(
          find.byKey(const ValueKey('catch-field-spinner')),
          findsOneWidget,
        );
        pending!.completeError(StateError('rejected'));
        await _motion(tester);
        expect(find.text('Could not save'), findsOneWidget);
        expect(accordion.isExpanded('choice'), isTrue);
        await tester.tap(find.byKey(const ValueKey('catch-field-done')));
        await tester.pump();
        expect(saves.length, 2);
        expect(find.text('Could not save'), findsNothing);
        pending!.complete(false);
        await _motion(tester);
        expect(accordion.isExpanded('choice'), isTrue);
        await tester.tap(find.byKey(const ValueKey('catch-field-cancel')));
        await _motion(tester);
        await tester.tap(find.text('Choice'));
        await _motion(tester);
        await tester.tap(find.byKey(const ValueKey('catch-field-done')));
        await _motion(tester);
        expect(
          saves.length,
          2,
          reason: 'Cancel restored the committed selection.',
        );
        expect(accordion.isExpanded('choice'), isFalse);
        accordion.toggle('choice');
        await _motion(tester);
        await tester.tap(find.text('Option 3').hitTestable());
        await tester.tap(find.byKey(const ValueKey('catch-field-done')));
        await tester.pump();
        pending!.complete(true);
        await _motion(tester);
        expect(accordion.isExpanded('choice'), isFalse);
        expect(saves.last, multiple ? [1, 3] : [3]);
        // Pending completion after removal must not update a disposed editor.
        accordion.toggle('choice');
        await _motion(tester);
        await tester.tap(find.text('Option 2').hitTestable());
        await tester.tap(find.byKey(const ValueKey('catch-field-done')));
        await tester.pump();
        await tester.pumpWidget(const SizedBox.shrink());
        pending!.completeError(StateError('late failure'));
        await tester.pump();
        expect(tester.takeException(), isNull);
      },
    );
  }
}
