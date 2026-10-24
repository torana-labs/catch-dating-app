import 'dart:math' as math;

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessCountdownIndicator extends StatelessWidget {
  const EventSuccessCountdownIndicator({
    super.key,
    required this.seconds,
    required this.progress,
    required this.intensity,
  });

  final int seconds;
  final double progress;
  final double intensity;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Center(
      child: FractionallySizedBox(
        widthFactor: CatchLayout.eventSuccessCountdownDialWidthFactor,
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            minWidth: CatchLayout.eventSuccessCountdownDialMinExtent,
            maxWidth: CatchLayout.eventSuccessCountdownDialMaxExtent,
          ),
          child: AspectRatio(
            aspectRatio: 1,
            child: TweenAnimationBuilder<double>(
              tween: Tween<double>(end: progress.clamp(0, 1).toDouble()),
              duration: CatchMotion.revealDrop,
              curve: CatchMotion.easeOutCubicCurve,
              builder: (context, animatedProgress, _) => Stack(
                fit: StackFit.expand,
                alignment: Alignment.center,
                children: [
                  CustomPaint(
                    painter: _CountdownDialPainter(
                      progress: animatedProgress,
                      intensity: intensity,
                      accent: CatchTokens.of(context).gold,
                      foreground: t.ink,
                    ),
                  ),
                  Center(
                    child: FractionallySizedBox(
                      widthFactor:
                          CatchLayout.eventSuccessCountdownNumberWidthFactor,
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: AnimatedScale(
                          scale: seconds <= 3
                              ? 1.08
                              : seconds.isEven
                              ? 0.96
                              : 1.0,
                          duration: CatchMotion.fast,
                          curve: CatchMotion.springCurve,
                          child: AnimatedSwitcher(
                            duration: CatchMotion.fast,
                            switchInCurve: CatchMotion.easeOutBackCurve,
                            switchOutCurve: CatchMotion.easeInCubicCurve,
                            transitionBuilder: (child, animation) {
                              final slide = Tween<Offset>(
                                begin: const Offset(0, -0.16),
                                end: Offset.zero,
                              ).animate(animation);
                              return FadeTransition(
                                opacity: animation,
                                child: SlideTransition(
                                  position: slide,
                                  child: ScaleTransition(
                                    scale: Tween<double>(
                                      begin: 0.86,
                                      end: 1,
                                    ).animate(animation),
                                    child: child,
                                  ),
                                ),
                              );
                            },
                            child: Text(
                              context.l10n
                                  .eventSuccessEventSuccessLiveRevealWidgetsTextSeconds(
                                    seconds: seconds,
                                  ),
                              key: ValueKey(seconds),
                              style:
                                  CatchTextStyles.headline(
                                    context,
                                    color: t.ink,
                                  ).copyWith(
                                    fontSize: CatchLayout
                                        .eventSuccessCountdownNumberReferenceSize,
                                    height: 0.9,
                                    shadows: [
                                      Shadow(
                                        color: CatchTokens.of(context).gold
                                            .withValues(
                                              alpha: CatchOpacity
                                                  .lightOverlayBorder,
                                            ),
                                        blurRadius: 22 + intensity * 16,
                                      ),
                                    ],
                                  ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Align(
                    alignment:
                        CatchLayout.eventSuccessCountdownCaptionAlignment,
                    child: CatchText(
                      context
                          .l10n
                          .eventSuccessEventSuccessLiveRevealWidgetsTextSeconds3fb8f1,
                      variant: CatchTextVariant.statusLabel,
                      color: t.ink.withValues(alpha: CatchOpacity.darkPillFill),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CountdownDialPainter extends CustomPainter {
  const _CountdownDialPainter({
    required this.progress,
    required this.intensity,
    required this.accent,
    required this.foreground,
  });

  final double progress;
  final double intensity;
  final Color accent;
  final Color foreground;

  @override
  void paint(Canvas canvas, Size size) {
    final clampedProgress = progress.clamp(0, 1).toDouble();
    final center = size.center(Offset.zero);
    final radius = size.shortestSide / 2 - 14;
    final rect = Rect.fromCircle(center: center, radius: radius);
    final basePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 9
      ..strokeCap = StrokeCap.round
      ..color = foreground.withValues(alpha: CatchOpacity.revealDialBase);
    canvas.drawCircle(center, radius, basePaint);

    final glowPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 18 + intensity * 8
      ..strokeCap = StrokeCap.round
      ..color = accent.withValues(
        alpha:
            CatchOpacity.revealDialGlowBase +
            intensity * CatchOpacity.revealDialGlowUrgency,
      )
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 14 + intensity * 8);
    canvas.drawArc(
      rect,
      -math.pi / 2,
      math.pi * 2 * clampedProgress,
      false,
      glowPaint,
    );

    final sweepPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10 + intensity * 4
      ..strokeCap = StrokeCap.round
      ..shader = SweepGradient(
        transform: const GradientRotation(-math.pi / 2),
        colors: [
          accent.withValues(alpha: CatchOpacity.revealDialSweepAccent),
          foreground.withValues(alpha: CatchOpacity.revealDialSweepForeground),
          accent,
        ],
      ).createShader(rect);
    canvas.drawArc(
      rect,
      -math.pi / 2,
      math.pi * 2 * clampedProgress,
      false,
      sweepPaint,
    );

    final tickPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..strokeCap = StrokeCap.round;
    const tickCount = 36;
    for (var i = 0; i < tickCount; i++) {
      final tickProgress = i / tickCount;
      final angle = -math.pi / 2 + math.pi * 2 * tickProgress;
      final isHot = tickProgress <= clampedProgress;
      tickPaint.color = (isHot ? accent : foreground).withValues(
        alpha: isHot ? 0.60 : 0.16,
      );
      final outer = Offset(
        center.dx + math.cos(angle) * (radius + 12),
        center.dy + math.sin(angle) * (radius + 12),
      );
      final inner = Offset(
        center.dx + math.cos(angle) * (radius + (isHot ? 2 : 5)),
        center.dy + math.sin(angle) * (radius + (isHot ? 2 : 5)),
      );
      canvas.drawLine(inner, outer, tickPaint);
    }

    canvas.drawCircle(
      center,
      radius * 0.68,
      Paint()
        ..color = foreground.withValues(
          alpha: CatchOpacity.revealDialCenterFill,
        ),
    );
    canvas.drawCircle(
      center,
      radius * (0.35 + intensity * 0.06),
      Paint()
        ..color = accent.withValues(
          alpha:
              CatchOpacity.revealDialInnerGlowBase +
              intensity * CatchOpacity.revealDialInnerGlowUrgency,
        )
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 20),
    );
  }

  @override
  bool shouldRepaint(covariant _CountdownDialPainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.intensity != intensity ||
      oldDelegate.accent != accent ||
      oldDelegate.foreground != foreground;
}
