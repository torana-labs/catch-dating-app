import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  testWidgets('caller accents follow theme changes and preserve precedence', (
    tester,
  ) async {
    const sectionKey = ValueKey('lead-section');
    Element? originalSection;
    Color? lightAccent;
    for (final brightness in [Brightness.light, Brightness.dark]) {
      late Color accent;
      final tokens = brightness == Brightness.light
          ? CatchTokens.editorialLight
          : CatchTokens.editorialDark;
      await tester.pumpWidget(
        MaterialApp(
          theme: brightness == Brightness.light
              ? AppTheme.light
              : AppTheme.dark,
          home: Scaffold(
            body: Builder(
              builder: (context) {
                accent = ActivityPalette.resolve(
                  context,
                  ActivityKind.socialRun,
                ).accent;
                return Column(
                  children: [
                    CatchSection.divided(
                      key: sectionKey,
                      title: 'Lead',
                      titleColor: accent,
                      first: true,
                      child: const SizedBox.shrink(),
                    ),
                    CatchSection.fieldRows(
                      title: 'Lead fields',
                      titleColor: accent,
                      first: true,
                      child: const SizedBox.shrink(),
                    ),
                    const CatchSection.divided(
                      title: 'Neutral',
                      first: true,
                      child: SizedBox.shrink(),
                    ),
                    const CatchSection.fieldRows(
                      title: 'Neutral fields',
                      first: true,
                      child: SizedBox.shrink(),
                    ),
                    const CatchSection.fieldRows(
                      title: 'No accent',
                      first: true,
                      child: SizedBox.shrink(),
                    ),
                    CatchSection.divided(
                      title: 'Override',
                      titleColor: tokens.danger,
                      first: true,
                      child: const SizedBox.shrink(),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(tester.widget<Text>(find.text('LEAD')).style?.color, accent);
      expect(
        tester.widget<Text>(find.text('LEAD FIELDS')).style?.color,
        accent,
      );
      expect(
        tester.widget<Text>(find.text('NEUTRAL')).style?.color,
        tokens.ink,
      );
      expect(
        tester.widget<Text>(find.text('NEUTRAL FIELDS')).style?.color,
        tokens.ink2,
      );
      expect(
        tester.widget<Text>(find.text('NO ACCENT')).style?.color,
        tokens.ink2,
      );
      expect(
        tester.widget<Text>(find.text('OVERRIDE')).style?.color,
        tokens.danger,
      );
      originalSection ??= tester.element(find.byKey(sectionKey));
      expect(tester.element(find.byKey(sectionKey)), same(originalSection));
      if (brightness == Brightness.light) {
        lightAccent = accent;
      } else if (lightAccent != null) {
        expect(accent, isNot(lightAccent));
      }
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets(
    'contained headings join resolved values without app localization',
    (tester) async {
      for (final (count, expected) in <(Object?, String)>[
        ('١٢', 'Équipe · ١٢'),
        (0, 'Équipe · 0'),
        (null, 'Équipe'),
      ]) {
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: CatchSection.contained(
                title: '  Équipe  ',
                count: count,
                child: const Text('Caller content'),
              ),
            ),
          ),
        );
        expect(find.text(expected), findsOneWidget);
        expect(find.text('Caller content'), findsOneWidget);
        expect(tester.takeException(), isNull);
      }
    },
  );
}
