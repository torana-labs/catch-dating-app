import 'dart:math' as math;

import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Activity-pigment backdrop art for event media: duotone ground, pattern and glyph.
class EventBackdropImage extends StatelessWidget {
  const EventBackdropImage({
    super.key,
    required this.visual,
    this.dense = false,
    this.iconAlignment = Alignment.bottomRight,
    this.iconSize = 132,
    this.iconOpacity = 0.2,
    this.patternOpacity = 0.22,
  });

  final EventActivityVisualSpec visual;
  final bool dense;
  final Alignment iconAlignment;
  final double iconSize;
  final double iconOpacity;
  final double patternOpacity;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        CatchSurface(
          duration: Duration.zero,
          radius: CatchRadius.none,
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            // Confident mid-tone duotone (pigment → deep), not a pastel sweep.
            colors: dense
                ? [visual.accent, visual.deep, visual.accent]
                : [visual.accent, visual.deep],
            stops: dense ? const [0, 0.6, 1] : null,
          ),
          child: const SizedBox.expand(),
        ),
        CustomPaint(
          painter: _ActivityPatternPainter(
            pattern: visual.pattern,
            color: CatchTokens.editorialWhite.withValues(alpha: patternOpacity),
          ),
        ),
        Align(
          alignment: iconAlignment,
          child: Padding(
            padding: CatchInsets.tileContent,
            child: Icon(
              visual.icon,
              size: iconSize,
              color: CatchTokens.editorialWhite.withValues(alpha: iconOpacity),
            ),
          ),
        ),
      ],
    );
  }
}

class _ActivityPatternPainter extends CustomPainter {
  const _ActivityPatternPainter({required this.pattern, required this.color});

  final EventActivityPattern pattern;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final fill = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    switch (pattern) {
      case EventActivityPattern.routeDots:
        for (var x = 16.0; x < size.width; x += 28) {
          final y = size.height * 0.52 + math.sin(x / 26) * 16;
          canvas.drawCircle(Offset(x, y), 1.8, fill);
        }
      case EventActivityPattern.routeDashes:
        for (var x = 8.0; x < size.width; x += 28) {
          final y = size.height * 0.5 + math.sin(x / 30) * 18;
          canvas.drawLine(Offset(x, y), Offset(x + 12, y + 4), paint);
        }
      case EventActivityPattern.stepDots:
        for (var x = 18.0; x < size.width; x += 32) {
          canvas
            ..drawCircle(Offset(x, size.height * 0.42), 2, fill)
            ..drawCircle(Offset(x + 12, size.height * 0.58), 2, fill);
        }
      case EventActivityPattern.courtLines:
        canvas
          ..drawRect(
            Rect.fromLTWH(18, 18, size.width - 36, size.height - 36),
            paint,
          )
          ..drawLine(
            Offset(size.width / 2, 18),
            Offset(size.width / 2, size.height - 18),
            paint,
          )
          ..drawLine(
            Offset(18, size.height / 2),
            Offset(size.width - 18, size.height / 2),
            paint,
          );
      case EventActivityPattern.glassGrid:
        for (var x = 18.0; x < size.width; x += 34) {
          canvas.drawLine(
            Offset(x, 10),
            Offset(x - 22, size.height - 10),
            paint,
          );
        }
        for (var y = 18.0; y < size.height; y += 28) {
          canvas.drawLine(
            Offset(10, y),
            Offset(size.width - 10, y + 10),
            paint,
          );
        }
      case EventActivityPattern.courtArcs:
        for (var radius = 36.0; radius < size.width; radius += 42) {
          canvas.drawArc(
            Rect.fromCircle(
              center: Offset(size.width / 2, size.height),
              radius: radius,
            ),
            math.pi,
            math.pi,
            false,
            paint,
          );
        }
      case EventActivityPattern.shuttleStrokes:
        for (var x = 22.0; x < size.width; x += 42) {
          canvas
            ..drawLine(Offset(x, 20), Offset(x + 18, size.height - 20), paint)
            ..drawLine(
              Offset(x + 10, 26),
              Offset(x + 26, size.height - 26),
              paint,
            );
        }
      case EventActivityPattern.wheelArcs:
        for (var x = 24.0; x < size.width; x += 66) {
          canvas.drawCircle(Offset(x, size.height * 0.68), 22, paint);
        }
      case EventActivityPattern.rhythmRings:
        for (var radius = 16.0; radius < size.shortestSide; radius += 22) {
          canvas.drawCircle(
            Offset(size.width * 0.22, size.height * 0.42),
            radius,
            paint,
          );
        }
      case EventActivityPattern.mandalaArcs:
        for (var i = 0; i < 5; i += 1) {
          canvas.drawArc(
            Rect.fromCircle(
              center: Offset(size.width * 0.28, size.height * 0.5),
              radius: 22.0 + i * 16,
            ),
            -math.pi / 3,
            math.pi * 1.3,
            false,
            paint,
          );
        }
      case EventActivityPattern.barMarks:
        for (var x = 20.0; x < size.width; x += 34) {
          canvas.drawLine(
            Offset(x, size.height * 0.35),
            Offset(x, size.height * 0.68),
            paint,
          );
          canvas.drawLine(
            Offset(x - 8, size.height * 0.5),
            Offset(x + 8, size.height * 0.5),
            paint,
          );
        }
      case EventActivityPattern.plateCircles:
        for (var x = 28.0; x < size.width; x += 64) {
          canvas
            ..drawCircle(Offset(x, size.height * 0.48), 18, paint)
            ..drawCircle(Offset(x, size.height * 0.48), 7, paint);
        }
      case EventActivityPattern.quizCards:
        for (var x = 16.0; x < size.width; x += 44) {
          canvas.drawRRect(
            RRect.fromRectAndRadius(
              Rect.fromLTWH(x, size.height * 0.34, 24, 18),
              const Radius.circular(CatchSpacing.micro3),
            ),
            paint,
          );
        }
      case EventActivityPattern.neonDots:
        for (var x = 16.0; x < size.width; x += 26) {
          for (var y = 18.0; y < size.height; y += 28) {
            if ((x + y).round().isEven) {
              canvas.drawCircle(Offset(x, y), 2, fill);
            }
          }
        }
      case EventActivityPattern.overlapCircles:
        for (var x = 28.0; x < size.width; x += 46) {
          canvas
            ..drawCircle(Offset(x, size.height * 0.46), 18, paint)
            ..drawCircle(Offset(x + 16, size.height * 0.46), 18, paint);
        }
      case EventActivityPattern.stampGrid:
        for (var x = 16.0; x < size.width; x += 28) {
          for (var y = 16.0; y < size.height; y += 28) {
            canvas.drawRect(
              Rect.fromCenter(
                center: Offset(x, y),
                width: CatchSpacing.micro3,
                height: CatchSpacing.micro3,
              ),
              fill,
            );
          }
        }
    }
  }

  @override
  bool shouldRepaint(covariant _ActivityPatternPainter oldDelegate) {
    return oldDelegate.pattern != pattern || oldDelegate.color != color;
  }
}
