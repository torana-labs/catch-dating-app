part of 'catch_button.dart';

// The button's sizes and colours, by size and by variant.

class _ButtonSizeSpec {
  const _ButtonSizeSpec({
    required this.height,
    required this.padding,
    required this.textStyle,
  });

  final double height;
  final double padding;
  final TextStyle Function(BuildContext context) textStyle;

  // D20: S 32, M 40 and L 48; labels are 15/600, or 13/600 at S.
  static _ButtonSizeSpec from(CatchButtonSize size) => switch (size) {
    CatchButtonSize.sm => const _ButtonSizeSpec(
      height: CatchButtonTokens.smallHeight,
      padding: CatchButtonTokens.smallPaddingX,
      textStyle: _smallLabel,
    ),
    CatchButtonSize.md => const _ButtonSizeSpec(
      height: CatchButtonTokens.mediumHeight,
      padding: CatchButtonTokens.mediumPaddingX,
      textStyle: CatchTextStyles.buttonSm,
    ),
    CatchButtonSize.lg => const _ButtonSizeSpec(
      height: CatchButtonTokens.largeHeight,
      padding: CatchButtonTokens.largePaddingX,
      textStyle: CatchTextStyles.buttonMd,
    ),
  };
}

TextStyle _smallLabel(BuildContext context) =>
    CatchTextStyles.bodyS(context).copyWith(fontWeight: FontWeight.w600);

class _ButtonPalette {
  const _ButtonPalette({
    required this.background,
    required this.foreground,
    required this.border,
  });

  final Color background;
  final Color foreground;
  final Color border;

  _ButtonPalette copyWith({
    Color? background,
    Color? foreground,
    Color? border,
  }) {
    return _ButtonPalette(
      background: background ?? this.background,
      foreground: foreground ?? this.foreground,
      border: border ?? this.border,
    );
  }

  static bool _isDarkTheme(CatchTokens t) =>
      ThemeData.estimateBrightnessForColor(t.bg) == Brightness.dark;

  static _ButtonPalette from(CatchButtonVariant variant, CatchTokens t) {
    return switch (variant) {
      CatchButtonVariant.primary => _ButtonPalette(
        background: t.primary,
        foreground: t.primaryInk,
        border: Colors.transparent,
      ),
      CatchButtonVariant.secondary => _ButtonPalette(
        background: Colors.transparent,
        foreground: t.ink,
        border: CatchBorder.resolve(t, CatchBorderRole.control).color,
      ),
      CatchButtonVariant.quiet => _ButtonPalette(
        background: Colors.transparent,
        foreground: t.ink,
        border: Colors.transparent,
      ),
      CatchButtonVariant.danger => _ButtonPalette(
        background: t.danger,
        // White on the dark theme's lighter danger red is 3.6:1, under the
        // 4.5:1 text floor; dark ink clears it. The web twin matches.
        foreground: _isDarkTheme(t) ? t.primaryInk : CatchTokens.editorialWhite,
        border: Colors.transparent,
      ),
      CatchButtonVariant.light => _ButtonPalette(
        background: CatchTokens.editorialWhite,
        foreground: CatchTokens.editorialLight.ink,
        border: Colors.transparent,
      ),
    };
  }
}
