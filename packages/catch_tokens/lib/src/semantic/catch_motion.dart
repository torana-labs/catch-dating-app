import 'package:catch_tokens/generated/catch_design_tokens.g.dart';
import 'package:flutter/material.dart';

/// Shared motion tokens for hover/tap feedback, standard transitions, and
/// celebratory success moments.
abstract final class CatchMotion {
  static const Duration none = Duration.zero;

  // System v15 durations and easings (blueprint D22).
  static const Duration instant = GeneratedCatchDurationTokens.instant;
  static const Duration quick = GeneratedCatchDurationTokens.quick;
  static const Duration emphasized = GeneratedCatchDurationTokens.emphasized;
  static const Duration shimmer = GeneratedCatchDurationTokens.shimmer;
  static const Curve enterCurve = GeneratedCatchEasingTokens.enter;
  static const Curve exitCurve = GeneratedCatchEasingTokens.exit;

  // Older names: aliases of the system durations until P7 deletes them.
  static const Duration fast = GeneratedCatchMotionTokens.fast;
  static const Duration micro = GeneratedCatchMotionTokens.micro;
  static const Duration chatScroll = GeneratedCatchMotionTokens.chatScroll;
  static const Duration base = GeneratedCatchMotionTokens.base;
  static const Duration standard = base;
  static const Duration pageStep = GeneratedCatchMotionTokens.pageStep;
  static const Duration calendarScroll =
      GeneratedCatchMotionTokens.calendarScroll;
  static const Duration mediaReorderDebounce = Duration(milliseconds: 400);
  static const Duration searchDebounce = Duration(milliseconds: 300);
  static const Duration eventSuccessActionDebounce = Duration(
    milliseconds: 500,
  );
  static const Duration eventSuccessThresholdTick = Duration(milliseconds: 1);
  static const Duration eventSuccessCeremonyTick = Duration(milliseconds: 100);
  static const Duration slow = GeneratedCatchMotionTokens.slow;
  static const Duration afterglowBeatEntry = Duration(milliseconds: 480);
  static const Duration afterglowCountUp = Duration(milliseconds: 600);
  static const Duration arrivalCelebration = Duration(milliseconds: 800);
  static const Duration snackbar = Duration(seconds: 2);
  static const Duration authOtpCooldownTick = Duration(seconds: 1);
  static const Duration authOtpResendCooldown = Duration(seconds: 60);
  static const Duration revealDrop = Duration(milliseconds: 280);
  static const Duration revealSettle = Duration(milliseconds: 170);
  static const Duration cinematicShort = Duration(seconds: 4);
  static const Duration cinematicMedium = Duration(seconds: 6);
  static const Duration noticeAutoDismiss = Duration(seconds: 6);
  static const Duration formExportPoll = Duration(seconds: 5);
  static const Duration liveLocationPublishThrottle = Duration(seconds: 5);
  static const Duration liveRevealClockTick = Duration(milliseconds: 250);
  static const Duration pulse = Duration(milliseconds: 700);
  static const Duration skeletonShimmer = Duration(milliseconds: 1200);
  static const Duration startupIndicatorDelay = Duration(milliseconds: 600);
  static const Duration authContentEntrance = Duration(milliseconds: 360);
  static const Duration welcomeReel = Duration(milliseconds: 3000);
  static const Duration welcomeLandingReveal = Duration(milliseconds: 1400);
  static const Duration welcomeNonFocusFade = Duration(milliseconds: 500);
  static const Duration welcomeTextCool = Duration(milliseconds: 700);
  static const Duration welcomeRevealSettle = Duration(milliseconds: 600);
  static const Duration welcomeRevealStart = Duration(milliseconds: 520);
  static const Duration welcomeRevealStagger = Duration(milliseconds: 80);
  static const int welcomeReelSpins = 1;

  static Duration eventSuccessCountdown(int seconds) =>
      Duration(seconds: seconds);

  static Duration eventSuccessPulsePeriod(int milliseconds) =>
      Duration(milliseconds: milliseconds);
  static const double welcomeSpinCurvePower = 3.0;
  static const Curve welcomeRevealCurve = Curves.easeOutCubic;

  static const Curve standardCurve = GeneratedCatchMotionTokens.standardCurve;
  static const Curve linearCurve = Curves.linear;
  static const Curve easeCurve = Curves.ease;
  static const Curve easeInCubicCurve = Curves.easeInCubic;
  static const Curve easeInOutCurve = Curves.easeInOut;
  static const Curve easeInOutCubicCurve = Curves.easeInOutCubic;
  static const Curve easeOutBackCurve = Curves.easeOutBack;
  static const Curve easeOutCubicCurve = Curves.easeOutCubic;
  static const Curve easeOutCurve = Curves.easeOut;
  static const Curve elasticOutCurve = Curves.elasticOut;
  static const Curve springCurve = GeneratedCatchMotionTokens.springCurve;

  static Duration afterglowBeatDelay(int index) =>
      Duration(milliseconds: index * 1400);
}
