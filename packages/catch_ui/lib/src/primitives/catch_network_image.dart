import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/primitives/catch_image_fallback_surface.dart';
import 'package:flutter/material.dart';

/// The corner of a system Image, from the radius scale.
enum CatchNetworkImageSize {
  none(CatchRadius.none),
  sm(CatchRadius.sm),
  md(CatchRadius.md),
  lg(CatchRadius.lg),
  xl(CatchRadius.xl);

  const CatchNetworkImageSize(this.radius);

  final double radius;
}

/// The colour a system Image shows while it loads, when it fails, or when it
/// has no picture yet: the tile grey, ink, indigo or an event format.
enum CatchNetworkImageColor {
  tile,
  ink,
  indigo,
  run,
  dinner,
  games,
  courts,
  nightsOut;

  Color resolve(CatchTokens t) => switch (this) {
    CatchNetworkImageColor.tile => t.tile,
    CatchNetworkImageColor.ink => t.ink,
    CatchNetworkImageColor.indigo => t.indigo,
    CatchNetworkImageColor.run => CatchFormat.run.accent,
    CatchNetworkImageColor.dinner => CatchFormat.dinner.accent,
    CatchNetworkImageColor.games => CatchFormat.games.accent,
    CatchNetworkImageColor.courts => CatchFormat.courts.accent,
    CatchNetworkImageColor.nightsOut => CatchFormat.nightsOut.accent,
  };
}

/// Canonical network-image primitive — the single seam every remote image in
/// the app renders through.
///
/// Drop-in for [Image.network] (same positional URL + `fit`/`width`/`height`/
/// `errorBuilder`/`loadingBuilder`), but it additionally:
/// - **decode-sizes**: derives `cacheWidth`/`cacheHeight` from the explicit
///   size or, failing that, caps decode at the screen width, so large source
///   images are not decoded at full resolution (memory + jank win);
/// - **fails gracefully**: supplies a neutral branded fallback when no
///   `errorBuilder` is given;
/// - keeps Flutter's in-memory [ImageCache] keyed by URL + decode size.
///
/// The system Image props are optional: [aspect] (width over height) sizes
/// it, [corner] rounds it, and a [placeholder] colour shows under the picture
/// while it loads, when it fails and when [url] is empty. Without them,
/// callers that need circular framing keep wrapping this in a `ClipOval`.
class CatchNetworkImage extends StatelessWidget {
  const CatchNetworkImage(
    this.url, {
    super.key,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.errorBuilder,
    this.loadingBuilder,
    this.cacheWidth,
    this.cacheHeight,
    this.semanticLabel,
    this.aspect,
    this.corner,
    this.placeholder,
  }) : assert(aspect == null || aspect > 0);

  final String url;
  final BoxFit fit;
  final double? width;
  final double? height;
  final ImageErrorWidgetBuilder? errorBuilder;
  final ImageLoadingBuilder? loadingBuilder;
  final String? semanticLabel;

  /// Width over height: 1, 4 / 3, 16 / 7.
  final double? aspect;
  final CatchNetworkImageSize? corner;
  final CatchNetworkImageColor? placeholder;

  /// Explicit decode-width override (logical px before DPR scaling).
  final int? cacheWidth;

  /// Explicit decode-height override (logical px before DPR scaling).
  final int? cacheHeight;

  @override
  Widget build(BuildContext context) {
    final aspect = this.aspect;
    final corner = this.corner;
    final fill = placeholder?.resolve(CatchTokens.of(context));
    final ImageErrorWidgetBuilder fallback =
        errorBuilder ??
        (context, error, stack) => fill == null
            ? const CatchImageFallbackSurface()
            : const SizedBox.expand();
    final media = MediaQuery.maybeOf(context);
    final dpr = media?.devicePixelRatio ?? 1.0;
    final screenWidth = media?.size.width;

    int? scaled(double? logical) =>
        (logical != null && logical.isFinite && logical > 0)
        ? (logical * dpr).round()
        : null;

    // Prefer an explicit override, then the laid-out size, then a screen-width
    // cap so a full-bleed image never decodes beyond what can be shown.
    final decodeWidth = cacheWidth ?? scaled(width) ?? scaled(screenWidth);
    final empty = url.trim().isEmpty;

    Widget result = fill != null && empty
        ? const SizedBox.expand()
        : _isBundledAsset(url)
        ? Image.asset(
            url,
            fit: fit,
            width: width,
            height: height,
            semanticLabel: semanticLabel,
            errorBuilder: fallback,
          )
        : Image.network(
            url,
            fit: fit,
            width: width,
            height: height,
            cacheWidth: decodeWidth,
            cacheHeight: cacheHeight ?? scaled(height),
            semanticLabel: semanticLabel,
            errorBuilder: fallback,
            loadingBuilder: loadingBuilder,
          );
    if (fill != null) result = ColoredBox(color: fill, child: result);
    if (aspect != null) {
      result = AspectRatio(aspectRatio: aspect, child: result);
    }
    if (corner != null && corner != CatchNetworkImageSize.none) {
      result = ClipRRect(
        borderRadius: BorderRadius.circular(corner.radius),
        child: result,
      );
    }
    if (fill != null && empty && semanticLabel != null) {
      result = Semantics(image: true, label: semanticLabel, child: result);
    }
    return result;
  }

  static bool _isBundledAsset(String url) {
    final trimmed = url.trim();
    return trimmed.startsWith('assets/') || trimmed.startsWith('packages/');
  }
}
