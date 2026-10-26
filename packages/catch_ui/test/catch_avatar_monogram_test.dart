import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: Center(child: child)),
);

void main() {
  testWidgets('a monogram fills with its ground and sets initials in its ink', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(
        const CatchAvatar.monogram(
          size: 36,
          name: 'Riya Sharma',
          ground: CatchGround.pink,
        ),
      ),
    );
    final fill = tester.widget<ColoredBox>(
      find.descendant(
        of: find.byType(CatchAvatar),
        matching: find.byType(ColoredBox),
      ),
    );
    expect(fill.color, CatchGround.pink.fillColor);
    final initials = tester.widget<Text>(find.text('RS'));
    expect(initials.style?.color, CatchGround.pink.inkColor);
    expect(
      initials.style?.fontSize,
      closeTo(36 * CatchLayout.personAvatarInitialsScale, 0.001),
    );
  });

  testWidgets('initials of 24px and up take the display voice', (tester) async {
    await tester.pumpWidget(
      _host(
        const CatchAvatar.monogram(
          size: 88,
          initials: 'CR',
          ground: CatchGround.coral,
          borderWidth: 4,
          borderColor: CatchTokens.editorialWhite,
        ),
      ),
    );
    final small = CatchTextStyles.avatarInitials(
      tester.element(find.byType(CatchAvatar)),
      size: 12,
    );
    final display = tester.widget<Text>(find.text('CR')).style!;
    expect(display.fontFamily, isNot(small.fontFamily));
    expect(display.fontWeight, const FontWeight(760));
    expect(tester.getSize(find.byType(CatchAvatar)), const Size.square(88));
  });

  test('grounds follow the generated palette tokens', () {
    expect(CatchGround.values.map((ground) => ground.name), [
      'white',
      'paper',
      'ink',
      'coral',
      'pink',
      'yellow',
      'mint',
      'indigo',
      'magenta',
    ]);
    expect(CatchGround.ink.isDark, isTrue);
    expect(CatchGround.coral.isDark, isFalse);
    expect(
      CatchGround.mint.secondaryInkColor,
      GeneratedCatchGroundTokens.mintInkSecondary,
    );
  });
}
