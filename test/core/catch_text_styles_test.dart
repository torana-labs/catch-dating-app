import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('compact titles use the platform function scale', (tester) async {
    late TextStyle style;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Builder(
          builder: (context) {
            style = CatchTextStyles.titleL(context);
            return const SizedBox.shrink();
          },
        ),
      ),
    );

    expect(
      style.fontFamily,
      CatchFonts.functionFamilyForPlatform(defaultTargetPlatform, fontSize: 20),
    );
    expect(style.fontSize, 20);
    expect(style.fontWeight, CatchPlatformTokens.typography.title.fontWeight);
    expect(style.height, CatchPlatformTokens.typography.title.height);
    expect(style.letterSpacing, 0);
    expect(style.fontVariations, isNull);
  });

  test('icon raster glyph preserves icon-font metadata and art effects', () {
    final icon = CatchIcons.activityRunning;
    const shadow = Shadow(
      color: Colors.black38,
      blurRadius: 4,
      offset: Offset(0, 2),
    );

    final style = CatchTextStyles.iconRasterGlyph(
      icon: icon,
      size: 32,
      color: Colors.orange,
      shadows: const [shadow],
    );

    final package = icon.fontPackage;
    expect(
      style.fontFamily,
      package == null
          ? icon.fontFamily
          : 'packages/$package/${icon.fontFamily}',
    );
    expect(
      style.fontFamilyFallback,
      package == null
          ? icon.fontFamilyFallback
          : icon.fontFamilyFallback
                ?.map((family) => 'packages/$package/$family')
                .toList(),
    );
    expect(style.fontSize, 32);
    expect(style.height, 1);
    expect(style.color, Colors.orange);
    expect(style.shadows, const [shadow]);
  });
}
