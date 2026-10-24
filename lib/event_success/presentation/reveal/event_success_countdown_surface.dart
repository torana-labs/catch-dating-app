import 'dart:math' as math;

import 'package:catch_dating_app/event_success/domain/event_success_plan.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_indicator.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_notice_row_list.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_stepper.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessCountdownSurface extends StatelessWidget {
  const EventSuccessCountdownSurface({
    super.key,
    required this.plan,
    required this.now,
    required this.kind,
    required this.clue,
  });

  final EventSuccessPlan plan;
  final DateTime now;
  final EventSuccessRevealAssignmentKind kind;
  final String clue;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final seconds = eventSuccessRevealRemainingSeconds(plan, now);
    final progress = plan.revealProgress(now);
    // Reveal pacing is Event Success policy. The reusable rail receives only
    // ordered display items and the resulting sequence position.
    final currentBeatIndex = progress >= 0.78
        ? 2
        : progress >= 0.42
        ? 1
        : 0;
    final beatItems = [
      (
        label: context.l10n.eventSuccessEventSuccessLiveRevealWidgetsLabelHold,
        icon: CatchIcons.panToolAltOutlined,
      ),
      (
        label: context.l10n.eventSuccessEventSuccessLiveRevealWidgetsLabelWatch,
        icon: CatchIcons.visibilityOutlined,
      ),
      (
        label: context.l10n.eventSuccessEventSuccessLiveRevealWidgetsLabelMove,
        icon: CatchIcons.boltRounded,
      ),
    ];
    final urgency = seconds <= 3
        ? 1.0
        : seconds <= 7
        ? 0.72
        : 0.38;
    return CatchSurface(
      tone: CatchSurfaceTone.transparent,
      radius: CatchRadius.sm,
      padding: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      duration: Duration.zero,
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Color.alphaBlend(
            t.primary.withValues(alpha: CatchOpacity.revealGradientStart),
            t.bg,
          ),
          Color.alphaBlend(
            t.primary.withValues(alpha: CatchOpacity.revealSurfaceBorder),
            t.bg,
          ),
          Color.lerp(t.ink, t.primary, 0.42)!,
        ],
      ),
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.boundary,
        color: t.gold.withValues(alpha: CatchOpacity.revealGoldBorder),
      ),
      boxShadow: CatchElevation.glow(
        t.primary.withValues(
          alpha:
              CatchOpacity.revealGlowBase +
              urgency * CatchOpacity.revealGlowUrgency,
        ),
        blurRadius: 26 + urgency * 18,
        spreadRadius: 0,
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _CountdownAtmospherePainter(
                progress: progress,
                intensity: urgency,
                accent: t.gold,
                foreground: t.ink,
              ),
            ),
          ),
          Padding(
            padding: CatchInsets.content,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Wrap(
                  spacing: CatchSpacing.s2,
                  runSpacing: CatchSpacing.s2,
                  alignment: WrapAlignment.center,
                  children: [
                    CatchBadge.onDarkStatus(
                      label: context
                          .l10n
                          .eventSuccessEventSuccessLiveRevealWidgetsLabelRoomHold,
                      icon: CatchIcons.lockClockRounded,
                    ),
                    CatchBadge.onDarkStatus(
                      label: kind.label(context.l10n),
                      icon: kind.icon,
                    ),
                  ],
                ),
                gapH18,
                EventSuccessCountdownIndicator(
                  seconds: seconds,
                  progress: progress,
                  intensity: urgency,
                ),
                gapH16,
                Text(
                  _countdownStageHeadline(seconds),
                  textAlign: TextAlign.center,
                  style: CatchTextStyles.titleL(
                    context,
                    color: t.ink,
                  ).copyWith(),
                ),
                gapH8,
                CatchText(
                  context.l10n
                      .eventSuccessEventSuccessLiveRevealWidgetsTextEveryoneGetsThisAssignmentnoun(
                        assignmentNoun: kind.assignmentNoun,
                      ),
                  textAlign: TextAlign.center,
                  variant: CatchTextVariant.bodyM,
                  color: t.ink.withValues(
                    alpha: CatchOpacity.revealMutedForeground,
                  ),
                ),
                gapH18,
                EventSuccessCountdownStepper(
                  items: beatItems,
                  currentIndex: currentBeatIndex,
                ),
                gapH14,
                EventSuccessCountdownNoticeRowList(clue: clue),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CountdownAtmospherePainter extends CustomPainter {
  const _CountdownAtmospherePainter({
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
    final center = Offset(size.width * 0.5, size.height * 0.28);
    final glowPaint = Paint()
      ..color = accent.withValues(
        alpha:
            CatchOpacity.revealAtmosphereGlowBase +
            intensity * CatchOpacity.revealAtmosphereGlowUrgency,
      )
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, 36 + intensity * 18);
    canvas.drawCircle(center, size.shortestSide * 0.42, glowPaint);

    final linePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..color = foreground.withValues(
        alpha: CatchOpacity.revealAtmosphereLineBase,
      );
    final hotLinePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..color = accent.withValues(
        alpha:
            CatchOpacity.revealAtmosphereHotLineBase +
            intensity * CatchOpacity.revealAtmosphereHotLineUrgency,
      );

    for (var i = 0; i < 9; i++) {
      final y = size.height * (0.18 + i * 0.075);
      final offset = math.sin((progress * math.pi * 2) + i) * 22;
      canvas.drawLine(
        Offset(size.width * -0.05, y + offset),
        Offset(size.width * 1.05, y - offset),
        i.isEven ? hotLinePaint : linePaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _CountdownAtmospherePainter oldDelegate) =>
      oldDelegate.progress != progress ||
      oldDelegate.intensity != intensity ||
      oldDelegate.accent != accent ||
      oldDelegate.foreground != foreground;
}

String _countdownStageHeadline(int seconds) {
  if (seconds <= 3) return 'Get ready to move.';
  if (seconds <= 7) return 'The room is leaning in.';
  return 'The room is holding together.';
}
