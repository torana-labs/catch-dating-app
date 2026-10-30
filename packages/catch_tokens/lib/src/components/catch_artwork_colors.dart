import 'package:catch_tokens/generated/catch_design_tokens.g.dart';
import 'package:flutter/material.dart';

/// Static color roles used by canvas-rendered Google Map pins.
abstract final class CatchMapPinColors {
  static const Color brand = Color(0xFFFF4E1F);
  static const Color brandBorder = Color(0xFFB8350F);
  static const Color brandTint = Color(0xFFFFE2D4);
  static const Color mutedFill = Color(0xFFEFE7DD);
  static const Color mutedInk = Color(0xFF7C6B5A);
  static const Color success = Color(0xFF2F7D45);
  static const Color successBorder = Color(0xFF205A30);
  static const Color shadow = Color.fromRGBO(26, 20, 16, 0.18);
}

abstract final class CatchStaticMapColors {
  static const Color land = Color(0xFF1A2E2A);
  static const Color water = Color(0xFF0F1E2B);
  static const Color arterial = Color(0xFF2F2A24);
}

abstract final class CatchPaceColors {
  static const Color moderateLight = Color(0xFF3A6FD0);
  static const Color moderateDark = Color(0xFF5B8FEA);
}

/// Static club artwork colors.
abstract final class CatchOrganizerColors {
  static const Color compactMemberSealInk = Color(0xFF244646);
}

/// Static photo-grade tints for display-time UGC grading.
abstract final class CatchPhotoGradeColors {
  static const Color lightWarmShadow = Color(0x14C9542F);
  static const Color lightWarmHighlight = Color(0x0FF3C778);
  static const Color darkWarmShadow = Color(0x1FC9542F);
  static const Color darkWarmHighlight = Color(0x14F3C778);
}

abstract final class CatchIconButtonColors {
  static const Color floatingForeground = Color(0xFF16140F);
}

abstract final class CatchWelcomeColors {
  static const Color reelMaskClear = Color(0x00FFFFFF);
  static const Color reelMaskOpaque = Color(0xFFFFFFFF);
  static const Color wordmarkBlank =
      GeneratedCatchActivityPigmentTokens.socialRun;
}

abstract final class CatchEventSuccessColors {
  static const Color arrivalCelebrationWarm = Color(0xFFFFB36B);
  static const Color arrivalCelebrationHot = Color(0xFFFF6F61);
  static const Color arrivalCelebrationGold = Color(0xFFFFD166);
}

abstract final class CatchCelebrationColors {
  static const Color ink = Color(0xFFFFFFFF);
  static const Color cream = Color(0xFFFFFFFF);
  static const Color actionInk = Color(0xFF24110A);
}
