import 'dart:math' as math;

import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

double _contrast(Color foreground, Color background) {
  final a = foreground.computeLuminance();
  final b = background.computeLuminance();
  return (math.max(a, b) + 0.05) / (math.min(a, b) + 0.05);
}

void main() {
  for (final dark in [false, true]) {
    testWidgets('activity chip text contrast clears 4.5:1, dark=$dark', (
      tester,
    ) async {
      final palette = dark ? ActivityPalette.dark : ActivityPalette.light;
      final cases = [
        for (final kind in ActivityPalette.activityOrder)
          for (final recipe in ['soft', 'solid', 'selected'])
            (kind: kind, recipe: recipe),
      ];
      await tester.pumpWidget(
        MaterialApp(
          theme: dark ? AppTheme.dark : AppTheme.light,
          home: Scaffold(
            body: Wrap(
              children: [
                for (final entry in cases)
                  if (entry.recipe == 'selected')
                    CatchChip.selectable(
                      key: ValueKey('${entry.kind.name}/${entry.recipe}'),
                      label: palette.getActivity(entry.kind).label,
                      selected: true,
                      accent: palette.getActivity(entry.kind).deep,
                      onChanged: (_) {},
                    )
                  else
                    CatchChip.activity(
                      key: ValueKey('${entry.kind.name}/${entry.recipe}'),
                      data: palette.getActivity(entry.kind).chipData,
                      emphasis: entry.recipe == 'soft'
                          ? CatchChipEmphasis.soft
                          : CatchChipEmphasis.solid,
                    ),
              ],
            ),
          ),
        ),
      );
      for (final entry in cases) {
        final chip = find.byKey(ValueKey('${entry.kind.name}/${entry.recipe}'));
        final label = tester.widget<Text>(
          find.descendant(of: chip, matching: find.byType(Text)),
        );
        final surface = tester.widget<AnimatedContainer>(
          find.descendant(of: chip, matching: find.byType(AnimatedContainer)),
        );
        final fill = (surface.decoration! as BoxDecoration).color!;
        final foreground = label.style!.color!;
        final data = palette.getActivity(entry.kind).chipData;
        expect(
          _contrast(foreground, fill),
          greaterThanOrEqualTo(4.5),
          reason: '${entry.kind.name}/${entry.recipe}/dark=$dark',
        );
        expect(fill, entry.recipe == 'soft' ? data.soft : data.deep);
        if (entry.recipe != 'soft') {
          expect(foreground, CatchTokens.editorialWhite);
        }
        if (entry.recipe == 'soft' && dark) {
          final context = tester.element(chip);
          expect(foreground, CatchTokens.of(context).ink);
          final icon = tester.widget<Icon>(
            find.descendant(of: chip, matching: find.byType(Icon)),
          );
          expect(icon.color, data.accent);
        }
      }
    });
  }
}
