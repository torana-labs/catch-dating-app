import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

double contrast(Color foreground, Color background) {
  final text = Color.alphaBlend(foreground, background).computeLuminance();
  final fill = background.computeLuminance();
  return (math.max(text, fill) + 0.05) / (math.min(text, fill) + 0.05);
}

void main() {
  test('original small-label failures remain negative controls', () {
    final t = CatchTokens.light;
    final fill = Color.alphaBlend(
      t.success.withValues(alpha: CatchOpacity.subtleFill),
      GeneratedCatchPaletteTokens.paper,
    );
    expect(contrast(t.success, fill), lessThan(4.5));
    expect(contrast(t.gold, t.surface), lessThan(4.5));
    expect(contrast(CatchTokens.dark.ink3, CatchTokens.dark.bg), lessThan(4.5));
    expect(contrast(Colors.black, Colors.white), closeTo(21, 0.001));
  });

  for (final t in [CatchTokens.light, CatchTokens.dark]) {
    final dark = t == CatchTokens.dark;
    final grounds = {
      'page': t.bg,
      'surface': t.surface,
      'raised': t.raised,
      if (!dark) 'paper': GeneratedCatchPaletteTokens.paper,
    };
    for (final entry in grounds.entries) {
      testWidgets('AA small labels ${dark ? 'dark' : 'light'} ${entry.key}', (
        tester,
      ) async {
        final badges = <CatchBadge>[
          for (final tone in CatchBadgeTone.values) ...[
            CatchBadge(label: 'standard $tone', tone: tone),
            CatchBadge.functional(label: 'functional $tone', tone: tone),
            CatchBadge.status(label: 'status $tone', tone: tone),
          ],
          const CatchBadge.privacy(label: 'privacy', icon: Icons.lock),
          const CatchBadge.optional(label: 'optional'),
          const CatchBadge.optional(label: 'optional error', hasError: true),
          for (final pigment in [
            GeneratedCatchActivityPigmentTokens.socialRun,
            GeneratedCatchActivityPigmentTokens.walking,
            GeneratedCatchActivityPigmentTokens.pickleball,
            GeneratedCatchActivityPigmentTokens.padel,
            GeneratedCatchActivityPigmentTokens.tennis,
            GeneratedCatchActivityPigmentTokens.badminton,
            GeneratedCatchActivityPigmentTokens.cycling,
            GeneratedCatchActivityPigmentTokens.spinClass,
            GeneratedCatchActivityPigmentTokens.yoga,
            GeneratedCatchActivityPigmentTokens.strengthTraining,
            GeneratedCatchActivityPigmentTokens.dinner,
            GeneratedCatchActivityPigmentTokens.pubQuiz,
            GeneratedCatchActivityPigmentTokens.barCrawl,
            GeneratedCatchActivityPigmentTokens.singlesMixer,
            GeneratedCatchActivityPigmentTokens.openActivity,
            for (final r in [0, 128, 255])
              for (final g in [0, 128, 255])
                for (final b in [0, 128, 255]) Color.fromARGB(255, r, g, b),
          ])
            for (final alpha in [0.0, 0.5, 1.0])
              CatchBadge.ticketStatus(
                label: 'pigment ${pigment.toARGB32()} alpha $alpha',
                color: pigment.withValues(alpha: alpha),
              ),
          CatchBadge.ticketStatus(
            label: 'strong ticket',
            color: t.gold,
            emphasis: CatchBadgeEmphasis.strong,
          ),
          const CatchBadge.solid(label: 'solid'),
          const CatchBadge.live(label: 'live'),
        ];
        await tester.pumpWidget(
          MaterialApp(
            theme: ThemeData(extensions: [t]),
            home: Scaffold(
              backgroundColor: entry.value,
              body: SingleChildScrollView(child: Wrap(children: badges)),
            ),
          ),
        );
        for (final badge in badges) {
          final owner = find.byWidget(badge);
          final text = tester.widget<Text>(
            find.descendant(of: owner, matching: find.byType(Text)),
          );
          final decoration =
              tester
                      .widget<DecoratedBox>(
                        find
                            .descendant(
                              of: owner,
                              matching: find.byType(DecoratedBox),
                            )
                            .first,
                      )
                      .decoration
                  as BoxDecoration;
          if (badge.label.startsWith('pigment ')) {
            expect(
              decoration.color!.a,
              closeTo(badge.accentColor!.a * CatchOpacity.subtleFill, 0.000001),
            );
          }
          final fill = Color.alphaBlend(decoration.color!, entry.value);
          expect(
            contrast(text.style!.color!, fill),
            greaterThanOrEqualTo(4.5),
            reason: '${badge.label} on ${entry.key}',
          );
        }
        expect(tester.takeException(), isNull);
      });
    }
  }

  test('text-strength token copy and interpolation preserve both themes', () {
    final light = CatchTokens.light, dark = CatchTokens.dark;
    expect(light.copyWith().dangerText, light.dangerText);
    expect(light.copyWith().goldText, light.goldText);
    expect(light.lerp(dark, 1).dangerText, dark.dangerText);
    expect(light.lerp(dark, 1).goldText, dark.goldText);
  });
}
