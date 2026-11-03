import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_theme.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// What a [CatchRootScope] publishes: the theme, size class, format,
/// register, ground and motion preference a component reads to draw itself.
///
/// The system's `useCatch()` value. [theme] is always the resolved value,
/// never "follow the phone".
@immutable
class CatchRootScopeData {
  const CatchRootScopeData({
    required this.theme,
    required this.sizeClass,
    this.format,
    this.register = CatchRegister.app,
    required this.ground,
    this.reducedMotion = false,
  });

  final CatchThemeMode theme;
  final CatchWindowSize sizeClass;

  /// The event this content is about: accent parts pick up its colour.
  final CatchFormat? format;
  final CatchRegister register;

  /// What the component sits on.
  final CatchGround ground;
  final bool reducedMotion;

  @override
  bool operator ==(Object other) =>
      other is CatchRootScopeData &&
      other.theme == theme &&
      other.sizeClass == sizeClass &&
      other.format == format &&
      other.register == register &&
      other.ground == ground &&
      other.reducedMotion == reducedMotion;

  @override
  int get hashCode =>
      Object.hash(theme, sizeClass, format, register, ground, reducedMotion);
}

/// Publishes where a component sits, as [CatchRootScopeData]. [CatchRoot]
/// puts the first one at the top of a screen and `CatchSurface` publishes one
/// with its children's ground; read it with [CatchRootScope.of].
class CatchRootScope extends InheritedWidget {
  const CatchRootScope({super.key, required this.data, required super.child});

  final CatchRootScopeData data;

  /// The nearest scope's values. Asserts that a [CatchRoot] is above
  /// [context].
  static CatchRootScopeData of(BuildContext context) {
    final data = maybeOf(context);
    assert(data != null, 'No CatchRoot above this widget.');
    return data!;
  }

  /// The nearest scope's values, or null outside every [CatchRoot].
  static CatchRootScopeData? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<CatchRootScope>()?.data;

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
  bool updateShouldNotify(CatchRootScope oldWidget) => data != oldWidget.data;
}

/// Sets the theme, size class, format and register for everything inside it,
/// and paints the ground. Wrap each screen (or the whole app) once.
///
/// [theme] null follows the phone's dark-mode setting; pass
/// [CatchThemeMode.night] only to force night (the door, the live console,
/// staff screens) and [CatchThemeMode.day] only to force white. [size] null
/// measures the root's own width. The root installs `CatchTheme.light` or
/// `.dark`, so [CatchTokens.of] and `Theme.of` resolve inside it, publishes a
/// [CatchRootScope], and paints the ground with body text and 20px icons in
/// the ground's ink. It never scrolls, pads or constrains, and it is not a
/// [Scaffold].
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
    final painted = Builder(
      builder: (context) {
        final tokens = CatchTokens.of(context);
        final ink = catchGroundInk(tokens, ground, format);
        return ColoredBox(
          color: tokens.ground,
          child: DefaultTextStyle(
            // The body role has one size at every size class.
            style: CatchTextVariant.body
                .style(CatchWindowSize.compact)
                .copyWith(color: ink),
            child: IconTheme(
              data: IconThemeData(color: ink, size: CatchIconSize.control),
              child: child,
            ),
          ),
        );
      },
    );
    CatchRootScopeData data(CatchWindowSize sizeClass) => CatchRootScopeData(
      theme: resolved,
      sizeClass: sizeClass,
      format: format,
      register: register,
      ground: ground,
      reducedMotion: reducedMotion,
    );
    final fixed = size;
    return Theme(
      data: catchThemeData(resolved),
      child: fixed != null
          ? CatchRootScope(data: data(fixed), child: painted)
          : LayoutBuilder(
              builder: (context, constraints) => CatchRootScope(
                data: data(CatchWindowSize.fromWidth(constraints.maxWidth)),
                child: painted,
              ),
            ),
    );
  }
}

/// The Catch theme for a resolved [CatchThemeMode].
ThemeData catchThemeData(CatchThemeMode theme) =>
    theme == CatchThemeMode.night ? CatchTheme.dark : CatchTheme.light;

/// The theme a context resolves to: its root scope's, or the ambient theme's
/// brightness outside a root.
CatchThemeMode catchThemeOf(BuildContext context) =>
    CatchRootScope.maybeOf(context)?.theme ??
    (Theme.of(context).brightness == Brightness.dark
        ? CatchThemeMode.night
        : CatchThemeMode.day);

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
