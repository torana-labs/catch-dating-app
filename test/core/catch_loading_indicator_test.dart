import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';

void main() {
  testWidgets('inline activity keeps its dimensions and fixed cadence', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(
        const CatchLoadingIndicator.inline(
          size: CatchFieldTokens.actionSpinnerExtent,
          color: Colors.blue,
        ),
      ),
    );
    final glyph = tester.widget<Icon>(find.byIcon(CatchIcons.loading));
    expect(glyph.size, CatchFieldTokens.actionSpinnerExtent);
    expect(glyph.color, Colors.blue);
    expect(
      tester.getSize(find.byType(CatchLoadingIndicator)),
      const Size.square(CatchFieldTokens.actionSpinnerExtent),
    );
    final rotation = tester.widget<RotationTransition>(
      find.byKey(const ValueKey('catch-field-spinner')),
    );
    expect(
      (rotation.turns as AnimationController).duration,
      CatchFieldTokens.spinnerPeriod,
    );
    await tester.pump(CatchFieldTokens.spinnerPeriod ~/ 4);
    expect(rotation.turns.value, closeTo(0.25, 0.001));
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    expect(tester.binding.hasScheduledFrame, isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets('keyed recipe changes dispose and recreate only inline motion', (
    tester,
  ) async {
    const indicatorKey = ValueKey('activity');
    const dots = CatchLoadingIndicator.dots(
      key: indicatorKey,
      color: Colors.blue,
    );
    const inline = CatchLoadingIndicator.inline(
      key: indicatorKey,
      color: Colors.blue,
    );
    await tester.pumpWidget(_wrap(dots));
    await pumpFeatureUi(tester);
    final identity = tester.state(find.byType(CatchLoadingIndicator));
    expect(find.byKey(const ValueKey('catch-field-spinner')), findsNothing);
    expect(tester.binding.hasScheduledFrame, isFalse);

    // Entering inline a second time catches controllers that incorrectly use
    // a single-use ticker provider or retain a disposed animation.
    for (var cycle = 0; cycle < 2; cycle++) {
      await tester.pumpWidget(_wrap(inline));
      expect(tester.state(find.byType(CatchLoadingIndicator)), same(identity));
      await tester.pump(CatchFieldTokens.spinnerPeriod ~/ 4);
      final rotation = tester.widget<RotationTransition>(
        find.byKey(const ValueKey('catch-field-spinner')),
      );
      expect(rotation.turns.value, closeTo(0.25, 0.001));
      await tester.pumpWidget(_wrap(dots));
      await tester.pump();
      expect(find.byKey(const ValueKey('catch-field-spinner')), findsNothing);
      expect(tester.binding.hasScheduledFrame, isFalse);
    }

    await tester.pumpWidget(
      _wrap(const CatchLoadingIndicator(key: indicatorKey)),
    );
    expect(tester.state(find.byType(CatchLoadingIndicator)), same(identity));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.byKey(const ValueKey('catch-field-spinner')), findsNothing);
    await tester.pumpWidget(_wrap(inline));
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.byKey(const ValueKey('catch-field-spinner')), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    expect(tester.binding.hasScheduledFrame, isFalse);
    expect(tester.takeException(), isNull);
  });
}

Widget _wrap(Widget child) => MaterialApp(
  home: Scaffold(body: Center(child: child)),
);
