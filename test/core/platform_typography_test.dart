import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final platform in [TargetPlatform.iOS, TargetPlatform.android]) {
    testWidgets(
      'every reading/control style consumes selected metrics on $platform',
      (tester) async {
        debugDefaultTargetPlatformOverride = platform;
        addTearDown(() => debugDefaultTargetPlatformOverride = null);
        final profile = CatchPlatformTokens.typography;
        final pairs = <(String, TextStyle, TextStyle)>[];
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: Builder(
              builder: (context) {
                pairs.addAll([
                  (
                    'sectionTitle',
                    CatchTextStyles.sectionTitle(context),
                    profile.name,
                  ),
                  ('bodyL', CatchTextStyles.bodyL(context), profile.body),
                  ('bodyM', CatchTextStyles.bodyM(context), profile.secondary),
                  (
                    'bodyLead',
                    CatchTextStyles.bodyLead(context),
                    profile.fieldValue,
                  ),
                  (
                    'menuSupporting',
                    CatchTextStyles.bodyS(context),
                    profile.context,
                  ),
                  (
                    'labelM',
                    CatchTextStyles.statusLabel(context),
                    profile.status,
                  ),
                  (
                    'labelS',
                    CatchTextStyles.statusLabel(context),
                    profile.status,
                  ),
                  (
                    'navigationLabel',
                    CatchTextStyles.navigationLabel(context),
                    profile.navigationLabel,
                  ),
                  (
                    'buttonSm',
                    CatchTextStyles.buttonSm(context),
                    profile.control,
                  ),
                  (
                    'buttonMd',
                    CatchTextStyles.buttonMd(context),
                    profile.control,
                  ),
                  ('buttonLg', CatchTextStyles.buttonLg(context), profile.body),
                  ('bodyL', CatchTextStyles.bodyL(context), profile.body),
                  (
                    'supporting',
                    CatchTextStyles.supporting(context),
                    profile.secondary,
                  ),
                  (
                    'supportingStrong',
                    CatchTextStyles.supportingStrong(context),
                    profile.secondary,
                  ),
                  (
                    'statCompact',
                    CatchTextStyles.statCompact(context),
                    profile.secondary,
                  ),
                ]);
                return const SizedBox.shrink();
              },
            ),
          ),
        );
        expect(pairs, hasLength(15));
        for (final (name, actual, expected) in pairs) {
          expect(actual.fontSize, expected.fontSize, reason: name);
          expect(actual.height, expected.height, reason: name);
          expect(actual.letterSpacing, expected.letterSpacing, reason: name);
          expect(
            actual.fontFamily,
            CatchFonts.functionFamilyForPlatform(
              platform,
              fontSize: expected.fontSize,
            ),
            reason: name,
          );
        }
        debugDefaultTargetPlatformOverride = null;
      },
    );

    testWidgets(
      'floating navigation keeps its approved typography on $platform',
      (tester) async {
        debugDefaultTargetPlatformOverride = platform;
        addTearDown(() => debugDefaultTargetPlatformOverride = null);
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: Builder(
              builder: (context) {
                final style = CatchTextStyles.navigationLabel(context);
                expect(style.fontSize, 13);
                expect(style.height, 1);
                expect(style.fontWeight, FontWeight.w600);
                expect(style.letterSpacing, 0);
                expect(
                  style.fontFamily,
                  CatchFonts.functionFamilyForPlatform(platform, fontSize: 13),
                );
                expect(
                  CatchTextStyles.buttonSm(context).fontSize,
                  platform == TargetPlatform.iOS ? 15 : 14,
                );
                return const SizedBox.shrink();
              },
            ),
          ),
        );
        debugDefaultTargetPlatformOverride = null;
      },
    );

    testWidgets(
      'Material fallback is an adapter, not a separate scale on $platform',
      (tester) async {
        debugDefaultTargetPlatformOverride = platform;
        addTearDown(() => debugDefaultTargetPlatformOverride = null);
        final profile = CatchPlatformTokens.typography;
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: Builder(
              builder: (context) {
                final fallback = CatchTextStyles.materialTextTheme(
                  const TextTheme(),
                  CatchTokens.of(context),
                );
                final pairs = <(TextStyle?, TextStyle)>[
                  (fallback.displayLarge, profile.displayLarge),
                  (fallback.displayMedium, profile.displayMedium),
                  (fallback.displaySmall, profile.displaySmall),
                  (fallback.headlineLarge, profile.displayMedium),
                  (fallback.headlineMedium, profile.headline),
                  (fallback.headlineSmall, profile.title),
                  (fallback.titleLarge, profile.title),
                  (fallback.titleMedium, profile.name),
                  (fallback.titleSmall, profile.secondary),
                  (fallback.bodyLarge, profile.body),
                  (fallback.bodyMedium, profile.secondary),
                  (fallback.bodySmall, profile.context),
                  (fallback.labelLarge, profile.control),
                  (fallback.labelMedium, profile.status),
                  (fallback.labelSmall, profile.context),
                ];
                for (final (actual, expected) in pairs) {
                  expect(actual!.fontSize, expected.fontSize);
                  expect(actual.height, expected.height);
                  expect(actual.letterSpacing, expected.letterSpacing);
                }
                return const SizedBox.shrink();
              },
            ),
          ),
        );
        debugDefaultTargetPlatformOverride = null;
      },
    );

    testWidgets('reading roles retain complete text at 2x on $platform', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = platform;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: const MediaQueryData(
              textScaler: TextScaler.linear(
                GeneratedCatchAccessibilityTokens.minimumTextScaleTest,
              ),
            ),
            child: Builder(
              builder: (context) => SingleChildScrollView(
                child: SizedBox(
                  width: 320,
                  child: Column(
                    children: [
                      Text(
                        'A complete message with a long venue name and its final sentence must remain readable.',
                        style: CatchTextStyles.bodyL(context),
                      ),
                      Text(
                        'Secondary context and its final sentence stay visible.',
                        style: CatchTextStyles.supporting(context),
                      ),
                      Text(
                        'Long form description with multiple clauses and a readable last word.',
                        style: CatchTextStyles.bodyL(context),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      final paragraphs = find
          .byType(RichText)
          .evaluate()
          .map((element) => element.renderObject! as RenderParagraph)
          .toList();
      expect(paragraphs, hasLength(3));
      for (final paragraph in paragraphs) {
        expect(paragraph.didExceedMaxLines, isFalse);
      }
      expect(tester.takeException(), isNull);
      debugDefaultTargetPlatformOverride = null;
    });
  }

  test('shared spacing and motion are generated semantic dependencies', () {
    expect(CatchSpacing.screenPx, GeneratedCatchLayoutTokens.pageGutter);
    expect(CatchSpacing.screenPt, GeneratedCatchLayoutTokens.pageBodyStart);
    expect(CatchMotion.base, GeneratedCatchMotionTokens.base);
    expect(CatchMotion.standardCurve, GeneratedCatchMotionTokens.standardCurve);
    expect(GeneratedCatchAccessibilityTokens.minimumTextContrast, 4.5);
    expect(GeneratedCatchAccessibilityTokens.largeTextContrast, 3);
  });
}
