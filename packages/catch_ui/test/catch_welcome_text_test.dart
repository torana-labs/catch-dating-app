import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('focus renders supplied localized copy and one spoken label', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await _pump(
      tester,
      const CatchWelcomeText.focus(
        brandLabel: 'Muse',
        catchColor: Colors.white,
        maxWidth: 320,
        phrase: 'le soleil',
        phraseColor: Colors.orange,
        underlineColor: Colors.orange,
      ),
    );
    final text = tester.widget<Text>(find.byKey(CatchWelcomeText.textKey));
    expect(text.textSpan!.toPlainText(), 'Muse le soleil.');
    expect(find.bySemanticsLabel('Muse le soleil.'), findsOneWidget);
    expect(find.byKey(CatchWelcomeText.underlineKey), findsOneWidget);
    expect(text.maxLines, 1);
    expect(
      text.style!.fontVariations,
      contains(const FontVariation('wdth', CatchFonts.archivoWidth)),
    );
    expect(tester.takeException(), isNull);
    semantics.dispose();
  });

  testWidgets('brand underscore remains paint rather than spoken copy', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await _pump(
      tester,
      const CatchWelcomeText.focus(
        brandLabel: 'Catch',
        catchColor: Colors.white,
        maxWidth: 240,
        showBrandUnderscore: true,
      ),
    );
    final text = tester.widget<Text>(find.byKey(CatchWelcomeText.textKey));
    expect(text.textSpan!.toPlainText(), 'Catch_');
    expect(find.bySemanticsLabel('Catch'), findsOneWidget);
    expect(find.byKey(CatchWelcomeText.underlineKey), findsNothing);
    semantics.dispose();
  });

  testWidgets('focus fits a narrow slot at large text without clipping', (
    tester,
  ) async {
    await _pump(
      tester,
      const CatchWelcomeText.focus(
        brandLabel: 'Catch',
        catchColor: Colors.white,
        maxWidth: 140,
        phrase: 'a very long localized phrase',
        phraseColor: Colors.orange,
        underlineColor: Colors.orange,
      ),
      scale: 2,
    );
    expect(
      tester.getSize(find.byType(CatchWelcomeText)).width,
      lessThanOrEqualTo(140),
    );
    final text = tester.widget<Text>(find.byKey(CatchWelcomeText.textKey));
    expect(text.textSpan!.toPlainText(), 'Catch a very long localized phrase.');
    expect(
      text.textScaler!.scale(1),
      CatchWelcomeTokens.welcomeReelMaxTextScale,
    );
    expect(text.overflow, TextOverflow.visible);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'reel keeps its capped scale, two-line clip and caller period color',
    (tester) async {
      await _pump(
        tester,
        SizedBox(
          width: 180,
          child: CatchWelcomeText.reel(
            phrase: 'a long phrase in the moving reel',
            phraseColor: Colors.blue,
            periodColor: Colors.blue.withValues(alpha: 0),
          ),
        ),
        scale: 2,
      );
      final text = tester.widget<Text>(find.byType(Text));
      final span = text.textSpan! as TextSpan;
      expect(span.toPlainText(), 'a long phrase in the moving reel.');
      expect((span.children!.last as TextSpan).style!.color!.a, 0);
      expect(text.maxLines, 2);
      expect(text.overflow, TextOverflow.clip);
      expect(text.softWrap, isTrue);
      expect(
        text.textScaler!.scale(1),
        CatchWelcomeTokens.welcomeReelMaxTextScale,
      );
      expect(find.byKey(CatchWelcomeText.reelUnderlineKey), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('reel owns the underline when the feature supplies its pigment', (
    tester,
  ) async {
    await _pump(
      tester,
      const SizedBox(
        width: 240,
        child: CatchWelcomeText.reel(
          phrase: 'the sunset 5K',
          phraseColor: Colors.orange,
          periodColor: Colors.orange,
          underlineColor: Colors.pink,
        ),
      ),
    );
    final underline = find.byKey(CatchWelcomeText.reelUnderlineKey);
    expect(underline, findsOneWidget);
    final paint = find.descendant(
      of: underline,
      matching: find.byType(ColoredBox),
    );
    expect(tester.widget<ColoredBox>(paint).color, Colors.pink);
    expect(
      tester.getSize(underline).height,
      CatchWelcomeTokens.welcomeReelUnderlineThickness,
    );
    expect(tester.takeException(), isNull);
  });

  test('focus phrase requires both phrase and underline colors', () {
    expect(
      () => CatchWelcomeText.focus(
        brandLabel: 'Catch',
        catchColor: Colors.white,
        maxWidth: 240,
        phrase: 'the sunset 5K',
        phraseColor: Colors.orange,
      ),
      throwsAssertionError,
    );
  });
}

Future<void> _pump(WidgetTester tester, Widget child, {double scale = 1}) =>
    tester.pumpWidget(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: ThemeData.dark(),
        home: MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(scale)),
          child: Scaffold(body: Center(child: child)),
        ),
      ),
    );
