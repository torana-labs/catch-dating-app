import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Design-system `CoverStory` (`components/explore/CoverStory`): the dark "wow"
/// cover that opens Explore — tonight's headline event as a magazine cover. A
/// near-black ground, an activity-pigment radial glow, a faint diagonal scrim, a
/// giant ghosted activity glyph, a condensed Archivo headline, and a paper CTA +
/// mono data block. Also serves as a neutral masthead (omit [activityKind] for
/// the brand glow, set [showGhostGlyph] false, pass [body] for a hook line).
///
/// Dark is reserved for wow surfaces — never use this as a list row. The app
/// shell owns the real status bar. The background remains full-bleed, while
/// chrome controls stay below the top safe area.
class FeaturedEventPoster extends StatelessWidget {
  const FeaturedEventPoster({
    super.key,
    this.activityKind,
    this.kicker,
    required this.title,
    this.body,
    this.cta,
    this.onCta,
    this.data,
    this.data2,
    this.showGhostGlyph = true,
    this.location,
    this.onLocation,
    this.showSearch = false,
    this.onSearch,
    this.chrome,
    this.radius = 0,
  });

  final ActivityKind? activityKind;
  final String? kicker;
  final String title;
  final String? body;
  final String? cta;
  final VoidCallback? onCta;
  final String? data;

  /// Optional second mono data line, stacked under [data] (design-system cover
  /// shows `time · price` over `going · left`).
  final String? data2;
  final bool showGhostGlyph;
  final String? location;
  final VoidCallback? onLocation;
  final bool showSearch;
  final VoidCallback? onSearch;
  final Widget? chrome;
  final double radius;

  @override
  Widget build(BuildContext context) {
    const d = CatchTokens.dark;
    final paper = d.ink;
    final activity = activityKind == null
        ? null
        : ActivityPalette.resolve(context, activityKind!);
    final accent = activity?.accent ?? d.primary;
    final deep = activity?.deep ?? d.primary;
    final hasChrome =
        chrome != null ||
        (location != null && location!.isNotEmpty) ||
        showSearch;

    return CatchSurface(
      backgroundColor: d.bg,
      radius: radius,
      padding: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(
            child: CatchSurface(
              tone: CatchSurfaceTone.transparent,
              radius: 0,
              padding: EdgeInsets.zero,
              duration: Duration.zero,
              gradient: RadialGradient(
                center: CatchLayout.coverStoryGlowCenter,
                radius: CatchLayout.coverStoryGlowRadius,
                colors: [
                  deep.withValues(alpha: CatchOpacity.coverStoryGlow),
                  deep.withValues(alpha: CatchOpacity.none),
                ],
                stops: CatchLayout.coverStoryGlowStops,
              ),
              child: const SizedBox.expand(),
            ),
          ),
          Positioned.fill(
            child: CatchSurface(
              tone: CatchSurfaceTone.transparent,
              radius: 0,
              padding: EdgeInsets.zero,
              duration: Duration.zero,
              gradient: LinearGradient(
                colors: [
                  CatchTokens.editorialBlack.withValues(
                    alpha: CatchOpacity.coverStoryContrastScrim,
                  ),
                  CatchTokens.editorialBlack.withValues(
                    alpha: CatchOpacity.coverStoryContrastScrimMid,
                  ),
                  CatchTokens.editorialBlack.withValues(
                    alpha: CatchOpacity.none,
                  ),
                ],
                stops: CatchLayout.coverStoryContrastStops,
              ),
              child: const SizedBox.expand(),
            ),
          ),
          Positioned.fill(
            child: CustomPaint(
              painter: _DiagonalScrimPainter(
                color: paper.withValues(alpha: CatchOpacity.coverStoryScrim),
              ),
            ),
          ),
          if (showGhostGlyph && activity != null)
            Positioned(
              right: -CatchLayout.coverStoryGhostRightInset,
              bottom: -CatchLayout.coverStoryGhostBottomInset,
              child: Icon(
                activity.glyph,
                size: CatchLayout.coverStoryGhostGlyphSize,
                color: paper.withValues(
                  alpha: CatchOpacity.coverStoryGhostGlyph,
                ),
              ),
            ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (chrome != null)
                chrome!
              else if (hasChrome)
                FeaturedEventTopBar(paper: paper, story: this),
              Padding(
                padding: CatchInsets.pageBody.copyWith(
                  top: CatchSpacing.s11,
                  bottom: CatchSpacing.s6,
                ),
                child: FeaturedEventBody(
                  paper: paper,
                  accent: accent,
                  story: this,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class FeaturedEventTopBar extends StatelessWidget {
  const FeaturedEventTopBar({
    super.key,
    required this.paper,
    required this.story,
  });

  final Color paper;
  final FeaturedEventPoster story;

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;

    return Padding(
      padding: CatchInsets.pageBody.copyWith(
        top: topInset + CatchSpacing.s3,
        bottom: CatchSpacing.s0,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          if (story.location != null && story.location!.isNotEmpty)
            Builder(
              builder: (context) {
                final location = story.location!;
                final label = Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      location.toUpperCase(),
                      style: CatchTextStyles.kicker(
                        context,
                        color: paper.withValues(
                          alpha: CatchOpacity.coverStoryLocation,
                        ),
                      ),
                    ),
                    const SizedBox(width: CatchSpacing.micro6),
                    Icon(
                      CatchIcons.expandMoreRounded,
                      size: CatchIcon.xs,
                      color: paper.withValues(
                        alpha: CatchOpacity.coverStoryLocation,
                      ),
                    ),
                  ],
                );
                final onLocation = story.onLocation;
                if (onLocation == null) return label;
                return Tooltip(
                  message:
                      context.l10n.exploreCatchCoverStoryMessageChangeLocation,
                  excludeFromSemantics: true,
                  child: Semantics(
                    container: true,
                    button: true,
                    label: context.l10n
                        .exploreCatchCoverStoryLabelChangeLocationLocation(
                          location: location,
                        ),
                    child: ExcludeSemantics(
                      child: CatchSurface(
                        height: CatchIconAction.defaultSize,
                        radius: CatchRadius.sm,
                        backgroundColor: Colors.transparent,
                        onTap: onLocation,
                        child: label,
                      ),
                    ),
                  ),
                );
              },
            )
          else
            const SizedBox.shrink(),
          if (story.showSearch)
            CatchIconAction(
              onPressed: story.onSearch,
              variant: CatchIconActionVariant.plain,
              backgroundColor: Colors.transparent,
              borderColor: paper.withValues(
                alpha: CatchOpacity.coverStorySearchBorder,
              ),
              tooltip: context.l10n.exploreCatchCoverStoryTooltipSearch,
              child: Icon(
                CatchIcons.searchRounded,
                size: CatchIcon.control,
                color: paper,
              ),
            ),
        ],
      ),
    );
  }
}

class FeaturedEventBody extends StatelessWidget {
  const FeaturedEventBody({
    super.key,
    required this.paper,
    required this.accent,
    required this.story,
  });

  final Color paper;
  final Color accent;
  final FeaturedEventPoster story;

  @override
  Widget build(BuildContext context) {
    final dataLines = [
      if (story.data != null && story.data!.isNotEmpty) story.data!,
      if (story.data2 != null && story.data2!.isNotEmpty) story.data2!,
    ];
    final hasData = dataLines.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (story.kicker != null && story.kicker!.isNotEmpty) ...[
          Text(
            story.kicker!.toUpperCase(),
            style: CatchTextStyles.kickerLg(
              context,
              color: Color.lerp(
                paper,
                accent,
                CatchOpacity.coverStoryKickerMix,
              ),
            ),
          ),
          const SizedBox(height: CatchSpacing.s3),
        ],
        Text(
          story.title,
          style: CatchTextStyles.eventTitle(context, color: paper),
        ),
        if (story.body != null && story.body!.isNotEmpty) ...[
          const SizedBox(height: CatchSpacing.micro14),
          ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: CatchLayout.coverStoryContentMaxWidth,
            ),
            child: CatchText(
              story.body!,
              variant: CatchTextVariant.bodyM,
              color: paper.withValues(alpha: CatchOpacity.coverStoryBody),
            ),
          ),
        ],
        if (story.cta != null || hasData) ...[
          const SizedBox(height: CatchSpacing.s5),
          Row(
            children: [
              if (story.cta != null)
                Expanded(
                  child: CatchButton(
                    label: story.cta!,
                    onPressed: story.onCta,
                    backgroundColor: paper,
                    foregroundColor: CatchTokens.light.ink,
                    fullWidth: true,
                    size: CatchButtonSize.lg,
                  ),
                ),
              if (hasData) ...[
                if (story.cta != null)
                  const SizedBox(width: CatchSpacing.micro14),
                // Flexible + single-line ellipsis so the data block yields to
                // the Expanded CTA on narrow widths / large text scales.
                Flexible(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (var i = 0; i < dataLines.length; i++) ...[
                        if (i > 0) const SizedBox(height: CatchSpacing.micro3),
                        Text(
                          dataLines[i],
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.end,
                          style: CatchTextStyles.monoLabel(
                            context,
                            color: paper.withValues(
                              alpha: CatchOpacity.coverStoryData,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        ],
      ],
    );
  }
}

/// Faint repeating diagonal hairlines (135°) for the cover's paper texture.
class _DiagonalScrimPainter extends CustomPainter {
  const _DiagonalScrimPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = CatchStroke.underline;
    for (
      double x = -size.height;
      x < size.width;
      x += CatchLayout.coverStoryScrimStride
    ) {
      canvas.drawLine(
        Offset(x, size.height),
        Offset(x + size.height, 0),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _DiagonalScrimPainter oldDelegate) =>
      oldDelegate.color != color;
}
