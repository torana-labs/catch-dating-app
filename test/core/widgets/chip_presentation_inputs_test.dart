import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  testWidgets('resolved chip data updates without replacing control state', (
    tester,
  ) async {
    const first = CatchChipData(
      label: 'First',
      icon: Icons.star,
      accent: Colors.indigo,
      deep: Colors.indigoAccent,
      soft: Colors.blueGrey,
    );
    const next = CatchChipData(
      label: 'Next',
      icon: Icons.favorite,
      accent: Colors.purple,
      deep: Colors.deepPurple,
      soft: Colors.purpleAccent,
    );
    var data = first;
    String? override;
    var enabled = true;
    var taps = 0;
    late StateSetter rebuild;
    await tester.pumpWidget(
      MaterialApp(
        theme: CatchTheme.light,
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) {
              rebuild = setState;
              return CatchChip.activity(
                data: data,
                label: override,
                enabled: enabled,
                onTap: () => taps++,
              );
            },
          ),
        ),
      ),
    );
    final chip = find.byType(CatchChip);
    final originalState = tester.state(chip);
    expect(find.text('First'), findsOneWidget);
    expect(find.byIcon(Icons.star), findsOneWidget);
    await tester.tap(chip);
    await pumpFeatureUi(tester);
    expect(taps, 1);

    rebuild(() => data = next);
    await pumpFeatureUi(tester);
    expect(tester.state(chip), same(originalState));
    expect(find.text('First'), findsNothing);
    expect(find.text('Next'), findsOneWidget);
    expect(find.byIcon(Icons.favorite), findsOneWidget);
    expect(tester.widget<Text>(find.text('Next')).style?.color, next.deep);
    expect(tester.getSemantics(chip).label, 'Next');
    final decoration =
        tester
                .widget<AnimatedContainer>(
                  find.descendant(
                    of: chip,
                    matching: find.byType(AnimatedContainer),
                  ),
                )
                .decoration!
            as BoxDecoration;
    expect(decoration.color, next.soft);

    rebuild(() {
      override = 'Caller override';
      enabled = false;
    });
    await pumpFeatureUi(tester);
    expect(find.text('Caller override'), findsOneWidget);
    expect(find.text('Next'), findsNothing);
    expect(tester.getSemantics(chip).label, 'Caller override');
    await tester.tap(chip);
    await pumpFeatureUi(tester);
    expect(taps, 1);
    expect(tester.state(chip), same(originalState));
  });

  testWidgets('app caller refreshes chip pigments when the theme changes', (
    tester,
  ) async {
    State<StatefulWidget>? originalState;
    for (final brightness in [Brightness.light, Brightness.dark]) {
      late CatchChipData data;
      await tester.pumpWidget(
        MaterialApp(
          theme: brightness == Brightness.light
              ? AppTheme.light
              : AppTheme.dark,
          home: Scaffold(
            body: Builder(
              builder: (context) {
                data = ActivityPalette.resolve(
                  context,
                  ActivityKind.socialRun,
                ).chipData;
                return CatchChip.activity(data: data);
              },
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      final chip = find.byType(CatchChip);
      originalState ??= tester.state(chip);
      expect(tester.state(chip), same(originalState));
      expect(find.text(data.label), findsOneWidget);
      expect(find.byIcon(data.icon), findsOneWidget);
      expect(
        tester.widget<Text>(find.text(data.label)).style?.color,
        brightness == Brightness.light
            ? data.deep
            : CatchTokens.of(tester.element(chip)).ink,
      );
      final decoration =
          tester
                  .widget<AnimatedContainer>(
                    find.descendant(
                      of: chip,
                      matching: find.byType(AnimatedContainer),
                    ),
                  )
                  .decoration!
              as BoxDecoration;
      expect(decoration.color, data.soft);
      expect(tester.takeException(), isNull);
    }
  });
}
