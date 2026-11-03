import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_theme.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// Where a component sits: the theme, size class, format, register, ground and
/// motion preference of the nearest [CatchRoot] or [CatchGroundScope].
///
/// The system's `useCatch()`. [theme] is always the resolved value, never
/// "follow the phone".
class CatchScope extends InheritedWidget {
  const CatchScope({
    super.key,
    required this.theme,
    required this.sizeClass,
    this.format,
    this.register = CatchRegister.app,
    required this.ground,
    this.reducedMotion = false,
    required super.child,
  });

  final CatchThemeMode theme;
  final CatchWindowSize sizeClass;

  /// The event this content is about: accent parts pick up its colour.
  final CatchFormat? format;
  final CatchRegister register;

  /// What the component sits on.
  final CatchGround ground;
  final bool reducedMotion;

  /// The nearest scope. Asserts that a [CatchRoot] is above [context].
  static CatchScope of(BuildContext context) {
    final scope = maybeOf(context);
    assert(scope != null, 'No CatchRoot above this widget.');
    return scope!;
  }

  /// The nearest scope, or null outside every [CatchRoot].
  static CatchScope? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<CatchScope>();

  /// The size class components lay out for: compact outside a root.
  static CatchWindowSize sizeClassOf(BuildContext context) =>
      maybeOf(context)?.sizeClass ?? CatchWindowSize.compact;

  /// The ground components paint for. Outside a root it follows the ambient
  /// theme: the night ground under a dark theme, the white ground otherwise.
  static CatchGround groundOf(BuildContext context) =>
      maybeOf(context)?.ground ??
      (Theme.of(context).brightness == Brightness.dark
          ? CatchGround.night
          : CatchGround.ground);

  @override
  bool updateShouldNotify(CatchScope oldWidget) =>
      theme != oldWidget.theme ||
      sizeClass != oldWidget.sizeClass ||
      format != oldWidget.format ||
      register != oldWidget.register ||
      ground != oldWidget.ground ||
      reducedMotion != oldWidget.reducedMotion;
}

/// Sets the theme, size class, format and register for everything inside it,
/// and paints the ground. Wrap each screen (or the whole app) once.
///
/// [theme] null follows the phone's dark-mode setting; pass
/// [CatchThemeMode.night] only to force night (the door, the live console,
/// staff screens) and [CatchThemeMode.day] only to force white. [size] null
/// measures the root's own width. The root never scrolls, pads or constrains,
/// and it is not a [Scaffold].
class CatchRoot extends StatelessWidget {
  const CatchRoot({
    super.key,
    this.theme,
    this.size,
    this.format,
    this.register = CatchRegister.app,
    required this.child,
  });

  final CatchThemeMode? theme;
  final CatchWindowSize? size;
  final CatchFormat? format;
  final CatchRegister register;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final resolved =
        theme ??
        (MediaQuery.maybePlatformBrightnessOf(context) == Brightness.dark
            ? CatchThemeMode.night
            : CatchThemeMode.day);
    final reducedMotion = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    final ground = resolved == CatchThemeMode.night
        ? CatchGround.night
        : CatchGround.ground;

    Widget scoped(CatchWindowSize sizeClass) => CatchScope(
      theme: resolved,
      sizeClass: sizeClass,
      format: format,
      register: register,
      ground: ground,
      reducedMotion: reducedMotion,
      child: _CatchGroundPaint(
        ground: ground,
        format: format,
        sizeClass: sizeClass,
        child: child,
      ),
    );

    final fixed = size;
    return Theme(
      data: catchThemeData(resolved),
      child: fixed != null
          ? scoped(fixed)
          : LayoutBuilder(
              builder: (context, constraints) =>
                  scoped(CatchWindowSize.fromWidth(constraints.maxWidth)),
            ),
    );
  }
}

/// Re-publishes the scope with a new [ground] (and optionally a [format] or a
/// [theme]), and resets the inherited text and icon colour to that ground's
/// ink. A theme change re-installs [Theme]. [CatchSurface] uses it for its
/// children; so will Chip, Button and Field.
class CatchGroundScope extends StatelessWidget {
  const CatchGroundScope({
    super.key,
    required this.ground,
    this.format,
    this.theme,
    required this.child,
  });

  final CatchGround ground;
  final CatchFormat? format;
  final CatchThemeMode? theme;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final parent = CatchScope.maybeOf(context);
    final parentTheme =
        parent?.theme ??
        (Theme.of(context).brightness == Brightness.dark
            ? CatchThemeMode.night
            : CatchThemeMode.day);
    final resolvedTheme = theme ?? parentTheme;
    final resolvedFormat = format ?? parent?.format;
    Widget scoped = CatchScope(
      theme: resolvedTheme,
      sizeClass: parent?.sizeClass ?? CatchWindowSize.compact,
      format: resolvedFormat,
      register: parent?.register ?? CatchRegister.app,
      ground: ground,
      reducedMotion:
          parent?.reducedMotion ??
          MediaQuery.maybeDisableAnimationsOf(context) ??
          false,
      child: Builder(
        builder: (context) {
          final ink = catchGroundInk(
            CatchTokens.of(context),
            ground,
            resolvedFormat,
          );
          return DefaultTextStyle.merge(
            style: TextStyle(color: ink),
            child: IconTheme.merge(
              data: IconThemeData(color: ink),
              child: child,
            ),
          );
        },
      ),
    );
    if (resolvedTheme != parentTheme) {
      scoped = Theme(data: catchThemeData(resolvedTheme), child: scoped);
    }
    return scoped;
  }
}

/// The Catch theme for a resolved [CatchThemeMode].
ThemeData catchThemeData(CatchThemeMode theme) =>
    theme == CatchThemeMode.night ? CatchTheme.dark : CatchTheme.light;

/// Text and icon colour on [ground]: the theme's ink on the day grounds, the
/// night ink on the night grounds, and the format's ink on a colour.
Color catchGroundInk(
  CatchTokens tokens,
  CatchGround ground,
  CatchFormat? format,
) => switch (ground) {
  CatchGround.ground || CatchGround.tile || CatchGround.nested => tokens.ink,
  CatchGround.night || CatchGround.nightTile => CatchTokens.dark.ink,
  CatchGround.colour => format?.ink ?? tokens.onFormat,
};

/// The root's paint: the ground fill, body text and 20px icons in its ink.
class _CatchGroundPaint extends StatelessWidget {
  const _CatchGroundPaint({
    required this.ground,
    required this.format,
    required this.sizeClass,
    required this.child,
  });

  final CatchGround ground;
  final CatchFormat? format;
  final CatchWindowSize sizeClass;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final tokens = CatchTokens.of(context);
    final ink = catchGroundInk(tokens, ground, format);
    return ColoredBox(
      color: tokens.ground,
      child: DefaultTextStyle(
        style: CatchTextVariant.body.style(sizeClass).copyWith(color: ink),
        child: IconTheme(
          data: IconThemeData(color: ink, size: CatchIconSize.control),
          child: child,
        ),
      ),
    );
  }
}
