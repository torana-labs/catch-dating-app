import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

enum CatchPosterVariant { editorial, photo, split, minimal }

enum CatchPosterTone { paper, ink, signal }

/// Canonical organizer material.
///
/// The component owns the poster canvas and its four approved layouts. Host
/// tools can later persist a small recipe that selects these variants without
/// letting arbitrary typography or positioning leak into consumer surfaces.
class CatchPoster extends StatelessWidget {
  const CatchPoster({
    super.key,
    required this.media,
    required this.kicker,
    required this.title,
    this.tagline,
    this.meta,
    this.footer,
    this.mediaOverlay,
    this.onTap,
    this.variant = CatchPosterVariant.editorial,
    this.tone = CatchPosterTone.paper,
    this.radius = CatchLayout.posterRadius,
    this.titleMaxLines = 1,
    this.showArrow = true,
  });

  final Widget media;
  final String kicker;
  final String title;
  final String? tagline;
  final String? meta;
  final Widget? footer;
  final Widget? mediaOverlay;
  final VoidCallback? onTap;
  final CatchPosterVariant variant;
  final CatchPosterTone tone;
  final double radius;
  final int titleMaxLines;
  final bool showArrow;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final colors = _PosterColors.resolve(t, tone);
    final image = CatchPosterImage(media: media, mediaOverlay: mediaOverlay);
    final header = CatchPosterHeader(
      kicker: kicker,
      title: title,
      tagline: tagline,
      meta: meta,
      footer: footer,
      tone: tone,
      mode: switch (variant) {
        CatchPosterVariant.editorial => CatchPosterHeaderMode.regular,
        CatchPosterVariant.photo => CatchPosterHeaderMode.onPhoto,
        CatchPosterVariant.split => CatchPosterHeaderMode.compact,
        CatchPosterVariant.minimal => CatchPosterHeaderMode.roomy,
      },
      titleMaxLines: titleMaxLines,
      showArrow: showArrow,
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final poster = CatchSurface(
          key: const ValueKey('organizer-poster-canvas'),
          onTap: onTap,
          borderSpec: CatchBorder.resolve(
            t,
            CatchBorderRole.boundary,
            color: colors.border,
          ),
          radius: radius,
          emphasis: CatchSurfaceEmphasis.subtle,
          backgroundColor: colors.paper,
          padding: EdgeInsets.zero,
          clipBehavior: Clip.antiAlias,
          child: switch (variant) {
            // The copy keeps its 42% share and grows past it at large text
            // sizes, so the image yields space instead of the copy clipping.
            CatchPosterVariant.editorial => LayoutBuilder(
              builder: (context, box) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: image),
                  ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: box.maxHeight * 42 / 100,
                    ),
                    child: ColoredBox(color: colors.copyPlane, child: header),
                  ),
                ],
              ),
            ),
            CatchPosterVariant.photo => Stack(
              fit: StackFit.expand,
              children: [
                CatchPosterImage(
                  media: media,
                  mediaOverlay: mediaOverlay,
                  radius: 0,
                ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, colors.photoScrim],
                      stops: const [0.38, 1],
                    ),
                  ),
                ),
                Align(alignment: Alignment.bottomCenter, child: header),
              ],
            ),
            CatchPosterVariant.split => Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: CatchPosterImage(
                    media: media,
                    mediaOverlay: mediaOverlay,
                    radius: 0,
                  ),
                ),
                Expanded(
                  child: ColoredBox(color: colors.copyPlane, child: header),
                ),
              ],
            ),
            CatchPosterVariant.minimal => Padding(
              padding: CatchInsets.content,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: header),
                  SizedBox(
                    height: CatchLayout.posterMinimalMediaHeight,
                    child: image,
                  ),
                ],
              ),
            ),
          },
        );

        if (constraints.hasBoundedHeight && constraints.maxHeight.isFinite) {
          return SizedBox(height: constraints.maxHeight, child: poster);
        }
        return AspectRatio(aspectRatio: CatchAspectRatio.poster, child: poster);
      },
    );
  }
}

/// How [CatchPosterHeader] sits in its layout.
enum CatchPosterHeaderMode { regular, compact, roomy, onPhoto }

/// Poster media framed with the poster radius and an optional overlay.
class CatchPosterImage extends StatelessWidget {
  const CatchPosterImage({
    super.key,
    required this.media,
    this.mediaOverlay,
    this.radius,
  });

  final Widget media;
  final Widget? mediaOverlay;
  final double? radius;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(
        radius ?? CatchLayout.posterMediaRadius,
      ),
      child: Stack(fit: StackFit.expand, children: [media, ?mediaOverlay]),
    );
  }
}

/// Poster copy: kicker, title with optional arrow, tagline, meta and footer.
class CatchPosterHeader extends StatelessWidget {
  const CatchPosterHeader({
    super.key,
    required this.kicker,
    required this.title,
    this.tagline,
    this.meta,
    this.footer,
    this.tone = CatchPosterTone.paper,
    this.mode = CatchPosterHeaderMode.regular,
    this.titleMaxLines = 1,
    this.showArrow = true,
  });

  final String kicker;
  final String title;
  final String? tagline;
  final String? meta;
  final Widget? footer;
  final CatchPosterTone tone;
  final CatchPosterHeaderMode mode;
  final int titleMaxLines;
  final bool showArrow;

  @override
  Widget build(BuildContext context) {
    final resolved = _PosterColors.resolve(CatchTokens.of(context), tone);
    final colors = mode == CatchPosterHeaderMode.onPhoto
        ? resolved.copyWith(
            ink: CatchTokens.editorialWhite,
            ink2: CatchTokens.editorialWhite.withValues(alpha: 0.86),
          )
        : resolved;
    final compact = mode == CatchPosterHeaderMode.compact;
    final taglineText = tagline?.trim();
    final metaText = meta?.trim();
    return Padding(
      key: const ValueKey('organizer-poster-copy'),
      padding: compact ? CatchInsets.contentDense : CatchInsets.content,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: mode == CatchPosterHeaderMode.roomy
            ? MainAxisAlignment.center
            : MainAxisAlignment.start,
        children: [
          Text(
            kicker.toUpperCase(),
            maxLines: compact ? 2 : 1,
            overflow: TextOverflow.ellipsis,
            style: CatchTextStyles.kicker(context, color: colors.accent),
          ),
          gapH6,
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  maxLines: titleMaxLines,
                  overflow: TextOverflow.ellipsis,
                  style: CatchTextStyles.clubDisplay(
                    context,
                    step: compact
                        ? CatchTextStylesSize.s
                        : CatchTextStylesSize.m,
                    height: 0.94,
                    color: colors.ink,
                  ),
                ),
              ),
              if (showArrow) ...[
                gapW8,
                Icon(
                  CatchIcons.forwardArrow,
                  size: CatchIcon.sm,
                  color: colors.ink2,
                ),
              ],
            ],
          ),
          if (taglineText != null && taglineText.isNotEmpty) ...[
            gapH6,
            Text(
              taglineText,
              maxLines: compact ? 3 : 2,
              overflow: TextOverflow.ellipsis,
              style: CatchTextStyles.bodyM(context, color: colors.ink2),
            ),
          ],
          if (metaText != null && metaText.isNotEmpty) ...[
            gapH8,
            Text(
              metaText,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: CatchTextStyles.numericMeta(context, color: colors.ink2),
            ),
          ],
          if (footer != null) ...[gapH10, footer!],
        ],
      ),
    );
  }
}

class _PosterColors {
  const _PosterColors({
    required this.paper,
    required this.copyPlane,
    required this.ink,
    required this.ink2,
    required this.accent,
    required this.border,
    required this.photoScrim,
  });

  final Color paper;
  final Color copyPlane;
  final Color ink;
  final Color ink2;
  final Color accent;
  final Color border;
  final Color photoScrim;

  _PosterColors copyWith({Color? ink, Color? ink2}) {
    return _PosterColors(
      paper: paper,
      copyPlane: copyPlane,
      ink: ink ?? this.ink,
      ink2: ink2 ?? this.ink2,
      accent: accent,
      border: border,
      photoScrim: photoScrim,
    );
  }

  static _PosterColors resolve(CatchTokens t, CatchPosterTone tone) {
    return switch (tone) {
      CatchPosterTone.paper => _PosterColors(
        paper: t.surface,
        copyPlane: t.raised,
        ink: t.ink,
        ink2: t.ink2,
        accent: t.primary,
        border: t.line,
        photoScrim: CatchTokens.editorialBlack.withValues(alpha: 0.82),
      ),
      CatchPosterTone.ink => _PosterColors(
        paper: t.ink,
        copyPlane: t.ink,
        ink: t.surface,
        ink2: t.surface.withValues(alpha: 0.78),
        accent: t.primary,
        border: t.ink,
        photoScrim: CatchTokens.editorialBlack.withValues(alpha: 0.88),
      ),
      CatchPosterTone.signal => _PosterColors(
        paper: t.primary,
        copyPlane: t.primary,
        ink: t.primaryInk,
        ink2: t.primaryInk.withValues(alpha: 0.78),
        accent: t.primaryInk,
        border: t.primary,
        photoScrim: CatchTokens.editorialBlack.withValues(alpha: 0.82),
      ),
    };
  }
}
