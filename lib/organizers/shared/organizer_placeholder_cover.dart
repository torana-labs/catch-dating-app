import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class OrganizerPlaceholderCover extends StatelessWidget {
  const OrganizerPlaceholderCover({
    super.key,
    required this.organizer,
    this.compact = false,
  });

  final Organizer organizer;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final palette = OrganizerCoverVisualPalette.forOrganizer(context, organizer);

    return CatchSurface(
      duration: Duration.zero,
      radius: CatchRadius.none,
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [palette.start, palette.end],
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          CustomPaint(painter: _OrganizerCoverPatternPainter(palette)),
          Align(
            child: CatchIconTile(
              icon: CatchIcons.location,
              iconColor: palette.icon,
              backgroundColor: palette.iconFill,
              borderColor: palette.iconBorder,
              size: compact ? 42 : 62,
              iconSize: compact ? 23 : 32,
              radius: compact ? 16 : 22,
            ),
          ),
          CatchSurface(
            duration: Duration.zero,
            radius: CatchRadius.none,
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                CatchTokens.editorialWhite.withValues(
                  alpha: CatchOpacity.organizerCoverHighlightOverlay,
                ),
                CatchTokens.editorialBlack.withValues(
                  alpha: CatchOpacity.organizerCoverLowScrim,
                ),
              ],
            ),
            child: const SizedBox.expand(),
          ),
        ],
      ),
    );
  }
}

class OrganizerCoverVisualPalette {
  const OrganizerCoverVisualPalette({
    required this.start,
    required this.end,
    required this.line,
    required this.block,
    required this.accent,
    required this.iconFill,
    required this.iconBorder,
    required this.icon,
    required this.text,
  });

  final Color start;
  final Color end;
  final Color line;
  final Color block;
  final Color accent;
  final Color iconFill;
  final Color iconBorder;
  final Color icon;
  final Color text;

  static OrganizerCoverVisualPalette forOrganizer(BuildContext context, Organizer organizer) =>
      forSeed('${organizer.id}:${organizer.name}', context: context);

  static OrganizerCoverVisualPalette forSeed(String seed, {BuildContext? context}) {
    final t = context != null
        ? CatchTokens.of(context)
        : CatchTokens.editorialLight;
    final palette = context != null
        ? ActivityPalette.of(context)
        : ActivityPalette.light;

    final kinds = ActivityKind.values;
    final i1 = seed.codeUnits.fold<int>(0, (sum, unit) => sum + unit);
    final i2 = (i1 * 7) % kinds.length;
    final swatch = palette.forKind(kinds[i1 % kinds.length]);
    final mixer = palette.forKind(kinds[i2]);

    final accent = Color.alphaBlend(
      mixer.accent.withValues(alpha: CatchOpacity.organizerCoverAccentBlend),
      swatch.accent,
    );
    final deep = Color.alphaBlend(
      mixer.deep.withValues(alpha: CatchOpacity.organizerCoverDeepBlend),
      swatch.deep,
    );

    return OrganizerCoverVisualPalette(
      start: Color.alphaBlend(
        accent.withValues(alpha: CatchOpacity.organizerCoverHighlightOverlay),
        t.surface,
      ),
      end: Color.alphaBlend(
        deep.withValues(alpha: CatchOpacity.controlOverlayPressed),
        t.surface,
      ),
      line: accent.withValues(alpha: CatchOpacity.organizerCoverPaletteLine),
      block: accent.withValues(alpha: CatchOpacity.organizerCoverPaletteBlock),
      accent: accent,
      iconFill: t.surface.withValues(alpha: CatchOpacity.organizerCoverChipFill),
      iconBorder: accent.withValues(alpha: CatchOpacity.organizerCoverPatternLine),
      icon: accent,
      text: t.ink2,
    );
  }
}

class _OrganizerCoverPatternPainter extends CustomPainter {
  const _OrganizerCoverPatternPainter(this.palette);

  final OrganizerCoverVisualPalette palette;

  @override
  void paint(Canvas canvas, Size size) {
    final blockPaint = Paint()
      ..color = palette.block
      ..style = PaintingStyle.fill;

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          size.width * -0.08,
          size.height * 0.52,
          size.width * 0.72,
          size.height * 0.56,
        ),
        Radius.circular(size.shortestSide * 0.18),
      ),
      blockPaint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          size.width * 0.50,
          size.height * -0.12,
          size.width * 0.62,
          size.height * 0.42,
        ),
        Radius.circular(size.shortestSide * 0.16),
      ),
      blockPaint
        ..color = palette.block.withValues(
          alpha: CatchOpacity.organizerCoverPatternBlock,
        ),
    );

    final gridPaint = Paint()
      ..color = palette.line.withValues(
        alpha: CatchOpacity.organizerCoverPatternLine,
      )
      ..style = PaintingStyle.stroke
      ..strokeWidth = CatchStroke.hairline;
    final gap = size.shortestSide * 0.18;
    for (var x = -size.height; x < size.width + size.height; x += gap) {
      canvas.drawLine(
        Offset(x, size.height),
        Offset(x + size.height, 0),
        gridPaint,
      );
    }

    final routePaint = Paint()
      ..color = palette.line
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.shortestSide * 0.026
      ..strokeCap = StrokeCap.round;

    final path = Path()
      ..moveTo(size.width * -0.06, size.height * 0.70)
      ..cubicTo(
        size.width * 0.22,
        size.height * 0.58,
        size.width * 0.34,
        size.height * 0.84,
        size.width * 0.58,
        size.height * 0.62,
      )
      ..cubicTo(
        size.width * 0.75,
        size.height * 0.46,
        size.width * 0.90,
        size.height * 0.58,
        size.width * 1.08,
        size.height * 0.42,
      );

    canvas.drawPath(path, routePaint);

    final dotPaint = Paint()
      ..color = palette.accent.withValues(
        alpha: CatchOpacity.organizerCoverPatternDot,
      );
    canvas.drawCircle(
      Offset(size.width * 0.18, size.height * 0.60),
      size.shortestSide * 0.025,
      dotPaint,
    );
    canvas.drawCircle(
      Offset(size.width * 0.74, size.height * 0.54),
      size.shortestSide * 0.022,
      dotPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _OrganizerCoverPatternPainter oldDelegate) =>
      oldDelegate.palette != palette;
}
