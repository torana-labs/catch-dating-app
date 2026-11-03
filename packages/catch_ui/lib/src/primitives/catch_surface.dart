import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/primitives/catch_row_press_surface.dart';
import 'package:flutter/material.dart';

/// plain: no box. tile: the grey block. spotlight: one per screen, in an event
/// colour or ink. floating: white with a shadow. band: an edge-to-edge web
/// section. `@catch/web-ui` names the same five.
enum CatchSurfaceBlock { plain, tile, spotlight, floating, band }

/// A spotlight's colour (a format or [ink]) or a band's (a format, [ink] or
/// [tile]). `@catch/web-ui` names the same seven.
enum CatchSurfaceColor {
  run,
  dinner,
  games,
  courts,
  nightsOut,
  ink,
  tile;

  /// The format this colour is, or null for [ink] and [tile].
  CatchFormat? get format => switch (this) {
    run => CatchFormat.run,
    dinner => CatchFormat.dinner,
    games => CatchFormat.games,
    courts => CatchFormat.courts,
    nightsOut => CatchFormat.nightsOut,
    ink || tile => null,
  };
}

/// Inner padding: none, 12, 16 or 20.
enum CatchSurfacePadding {
  none(CatchSpacing.s0),
  sm(CatchSpacing.s3),
  md(CatchSpacing.s4),
  lg(CatchSpacing.s5);

  const CatchSurfacePadding(this.extent);

  final double extent;
}

/// The blocks every screen is built from, and the only component that draws a
/// filled box.
///
/// A surface tells everything inside it what it sits on: a tile inside a tile
/// becomes the nested block (16 corners), inside a coloured spotlight it goes
/// translucent white, and an ink spotlight turns night. [padding] null takes
/// the block's default: none for plain, 20 for spotlight, floating and a
/// band's top and bottom, 12 for a nested tile, otherwise 16. [onPress] makes
/// the whole block a button with the shared press feedback; [aspect] holds a
/// width-over-height shape with the content at the bottom.
class CatchSurface extends StatelessWidget {
  const CatchSurface({
    super.key,
    this.block = CatchSurfaceBlock.tile,
    this.color,
    this.padding,
    this.onPress,
    this.aspect,
    this.semanticLabel,
    required this.child,
  }) : assert(aspect == null || aspect > 0);

  final CatchSurfaceBlock block;

  /// Spotlight and band only; other blocks ignore it.
  final CatchSurfaceColor? color;
  final CatchSurfacePadding? padding;
  final VoidCallback? onPress;

  /// Width over height.
  final double? aspect;

  /// The button's label when [onPress] is set.
  final String? semanticLabel;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final tokens = CatchTokens.of(context);
    final ground = CatchScope.groundOf(context);
    final look = _SurfaceLook.resolve(
      block: block,
      color: color,
      ground: ground,
      tokens: tokens,
      brightness: Theme.of(context).brightness,
    );

    final vertical = (padding ?? look.padding).extent;
    final horizontal = block == CatchSurfaceBlock.band
        ? _gutter(CatchScope.sizeClassOf(context))
        : vertical;
    Widget content = Padding(
      padding: EdgeInsets.symmetric(horizontal: horizontal, vertical: vertical),
      child: aspect == null
          ? child
          : Column(
              mainAxisAlignment: MainAxisAlignment.end,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [child],
            ),
    );

    final press = onPress;
    if (press != null) {
      content = Semantics(
        button: true,
        label: semanticLabel,
        child: ClipRRect(
          borderRadius: look.radius,
          child: CatchRowPressSurface(
            onTap: press,
            semanticButton: false,
            expandToMaxWidth: false,
            child: content,
          ),
        ),
      );
    }

    content = CatchGroundScope(
      ground: look.childGround,
      format: look.childFormat,
      theme: look.childTheme,
      child: content,
    );

    final ratio = aspect;
    if (ratio != null)
      content = AspectRatio(aspectRatio: ratio, child: content);
    if (look.fill == null) return content;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: look.fill,
        borderRadius: look.radius,
        boxShadow: look.shadow,
      ),
      child: content,
    );
  }

  static double _gutter(CatchWindowSize sizeClass) => switch (sizeClass) {
    CatchWindowSize.compact => GeneratedCatchLayoutTokens.gutterCompact,
    CatchWindowSize.medium => GeneratedCatchLayoutTokens.gutterMedium,
    CatchWindowSize.expanded => GeneratedCatchLayoutTokens.gutterExpanded,
  };
}

/// One block's paint and the ground it gives its children, transcribed from
/// the system's `Surface.tsx` and `catch.css`.
@immutable
class _SurfaceLook {
  const _SurfaceLook({
    required this.fill,
    required this.radius,
    required this.childGround,
    required this.padding,
    this.shadow,
    this.childFormat,
    this.childTheme,
  });

  factory _SurfaceLook.resolve({
    required CatchSurfaceBlock block,
    required CatchSurfaceColor? color,
    required CatchGround ground,
    required CatchTokens tokens,
    required Brightness brightness,
  }) {
    final xl = BorderRadius.circular(CatchRadius.xl);
    switch (block) {
      case CatchSurfaceBlock.plain:
        return _SurfaceLook(
          fill: null,
          radius: BorderRadius.zero,
          childGround: ground,
          padding: CatchSurfacePadding.none,
        );
      case CatchSurfaceBlock.tile:
        final nested =
            ground == CatchGround.tile ||
            ground == CatchGround.colour ||
            ground == CatchGround.nightTile;
        if (nested) {
          return _SurfaceLook(
            fill: ground == CatchGround.colour
                ? CatchTokens.editorialWhite.withValues(
                    alpha: GeneratedCatchOpacityTokens.onColour,
                  )
                : tokens.nested,
            radius: BorderRadius.circular(CatchRadius.md),
            childGround: ground.isNight
                ? CatchGround.night
                : CatchGround.nested,
            padding: CatchSurfacePadding.sm,
          );
        }
        return _SurfaceLook(
          fill: tokens.tile,
          radius: BorderRadius.circular(CatchRadius.lg),
          childGround: ground.isNight
              ? CatchGround.nightTile
              : CatchGround.tile,
          padding: CatchSurfacePadding.md,
        );
      case CatchSurfaceBlock.spotlight:
        final format = color?.format;
        if (format != null) {
          return _SurfaceLook(
            fill: format.accent,
            radius: xl,
            childGround: CatchGround.colour,
            childFormat: format,
            childTheme: CatchThemeMode.day,
            padding: CatchSurfacePadding.lg,
          );
        }
        return _SurfaceLook(
          fill: ground.isNight ? tokens.tile : CatchTokens.light.ink,
          radius: xl,
          childGround: CatchGround.night,
          childTheme: CatchThemeMode.night,
          padding: CatchSurfacePadding.lg,
        );
      case CatchSurfaceBlock.floating:
        return _SurfaceLook(
          fill: ground.isNight ? tokens.tile : tokens.ground,
          radius: xl,
          shadow: CatchElevation.float(brightness),
          childGround: ground.isNight
              ? CatchGround.nightTile
              : CatchGround.ground,
          padding: CatchSurfacePadding.lg,
        );
      case CatchSurfaceBlock.band:
        final format = color?.format;
        return switch (color) {
          null => _SurfaceLook(
            fill: tokens.ground,
            radius: BorderRadius.zero,
            childGround: ground,
            padding: CatchSurfacePadding.lg,
          ),
          CatchSurfaceColor.ink => _SurfaceLook(
            fill: CatchTokens.dark.ground,
            radius: BorderRadius.zero,
            childGround: CatchGround.night,
            childTheme: CatchThemeMode.night,
            padding: CatchSurfacePadding.lg,
          ),
          CatchSurfaceColor.tile => _SurfaceLook(
            fill: tokens.tile,
            radius: BorderRadius.zero,
            childGround: CatchGround.tile,
            padding: CatchSurfacePadding.lg,
          ),
          _ => _SurfaceLook(
            fill: format!.accent,
            radius: BorderRadius.zero,
            childGround: CatchGround.colour,
            childFormat: format,
            childTheme: CatchThemeMode.day,
            padding: CatchSurfacePadding.lg,
          ),
        };
    }
  }

  final Color? fill;
  final BorderRadius radius;
  final List<BoxShadow>? shadow;
  final CatchGround childGround;
  final CatchFormat? childFormat;
  final CatchThemeMode? childTheme;
  final CatchSurfacePadding padding;
}
