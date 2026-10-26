import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  for (final sample in [
    (value: 0.9, step: 0.005, expected: 0.905),
    (value: 0.1, step: 0.2, expected: 0.3),
    (value: 1e-7, step: 2e-7, expected: 3e-7),
  ]) {
    testWidgets('numeric steps preserve caller precision: $sample', (
      tester,
    ) async {
      num? result;
      await tester.pumpWidget(
        _wrap(
          CatchStepper(
            value: sample.value,
            step: sample.step,
            decreaseSemanticLabel: 'Decrease',
            increaseSemanticLabel: 'Increase',
            onChanged: (next) => result = next,
          ),
        ),
      );
      await tester.tap(find.byTooltip('Increase'));
      expect(result, sample.expected);
    });
  }

  testWidgets('numeric steps clamp a partial endpoint and stop there', (
    tester,
  ) async {
    num value = 0.9;
    final changes = <num>[];
    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) => CatchStepper(
            value: value,
            min: 0,
            max: 1,
            step: 0.3,
            decreaseSemanticLabel: 'Decrease',
            increaseSemanticLabel: 'Increase',
            valueLabelBuilder: (value) => '$value km',
            onChanged: (next) => setState(() {
              value = next;
              changes.add(next);
            }),
          ),
        ),
      ),
    );
    await tester.tap(find.byTooltip('Increase'));
    await tester.pump();
    expect(changes, [1]);
    await tester.tap(find.byTooltip('Increase'));
    await tester.pump();
    expect(changes, [1]);
    await tester.tap(find.byTooltip('Decrease'));
    await tester.pump();
    expect(changes, [1, 0.7]);
    expect(find.text('0.7 km'), findsOneWidget);
  });

  testWidgets('explicit actions use the same repeat and disable lifecycle', (
    tester,
  ) async {
    var increases = 0;
    var enabled = true;
    late StateSetter update;
    await tester.pumpWidget(
      _wrap(
        StatefulBuilder(
          builder: (context, setState) {
            update = setState;
            return CatchStepper.actions(
              value: 75,
              unit: 'min',
              decreaseSemanticLabel: 'Decrease',
              increaseSemanticLabel: 'Increase',
              onDecrease: null,
              onIncrease: () => increases++,
              enabled: enabled,
            );
          },
        ),
      ),
    );
    expect(find.text('75 min'), findsOneWidget);
    expect(find.byType(CatchStepperRepeatButton), findsNWidgets(2));
    expect(
      tester
          .widget<CatchStepperRepeatButton>(
            find.widgetWithIcon(CatchStepperRepeatButton, CatchIcons.remove),
          )
          .enabled,
      isFalse,
    );
    final gesture = await tester.startGesture(
      tester.getCenter(find.byTooltip('Increase')),
    );
    await tester.pump();
    expect(increases, 1);
    await tester.pump(CatchFieldTokens.repeatDelay);
    expect(increases, 2);
    update(() => enabled = false);
    await tester.pump();
    await pumpFeatureUiFor(tester, const Duration(seconds: 1));
    expect(increases, 2);
    await gesture.up();
    await tester.pumpWidget(const SizedBox.shrink());
    await pumpFeatureUiFor(tester, const Duration(seconds: 1));
    expect(increases, 2);
    expect(tester.takeException(), isNull);
  });

  test(
    'bounded construction rejects nonpositive steps and inverted bounds',
    () {
      CatchStepper stepper({num step = 1, num? min, num? max}) => CatchStepper(
        value: 1,
        step: step,
        min: min,
        max: max,
        decreaseSemanticLabel: 'Decrease',
        increaseSemanticLabel: 'Increase',
        onChanged: (_) {},
      );
      expect(() => stepper(step: 0), throwsAssertionError);
      expect(() => stepper(step: -1), throwsAssertionError);
      expect(() => stepper(min: 2, max: 1), throwsAssertionError);
    },
  );
}

Widget _wrap(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: Center(child: child)),
);
