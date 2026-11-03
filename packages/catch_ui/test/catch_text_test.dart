import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) => MaterialApp(
  theme: CatchTheme.light,
  home: Scaffold(body: SizedBox(width: 120, child: child)),
);

void main() {
  testWidgets('renders every variant in its CatchTextStyles role', (
    tester,
  ) async {
    for (final variant in CatchLegacyTextVariant.values) {
      await tester.pumpWidget(
        _host(CatchLegacyText('Supper club', variant: variant)),
      );
      final context = tester.element(find.byType(CatchLegacyText));
      final text = tester.widget<Text>(find.text('Supper club'));
      expect(text.style, variant.style(context), reason: variant.name);
      expect(text.maxLines, isNull, reason: variant.name);
    }
  });

  testWidgets('recolors, clamps with an ellipsis and aligns', (tester) async {
    const color = Color(0xFF2F7D55);
    await tester.pumpWidget(
      _host(
        const CatchLegacyText(
          'A long description of the evening that wraps',
          variant: CatchLegacyTextVariant.supporting,
          color: color,
          maxLines: 1,
          textAlign: TextAlign.center,
        ),
      ),
    );
    final text = tester.widget<Text>(find.byType(Text));
    expect(text.style?.color, color);
    expect(text.maxLines, 1);
    expect(text.overflow, TextOverflow.ellipsis);
    expect(text.textAlign, TextAlign.center);
  });
}
