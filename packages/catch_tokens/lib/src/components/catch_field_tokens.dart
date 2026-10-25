import 'package:catch_tokens/generated/catch_design_tokens.g.dart';
import 'package:catch_tokens/src/primitives/catch_icon_size.dart';
import 'package:catch_tokens/src/primitives/catch_radius.dart';
import 'package:catch_tokens/src/primitives/catch_spacing.dart';
import 'package:catch_tokens/src/primitives/catch_stroke.dart';
import 'package:catch_tokens/src/semantic/catch_platform_tokens.dart';
import 'package:catch_tokens/src/semantic/catch_tokens.dart';
import 'package:flutter/material.dart';

/// Layout constants for constraint-based sizing.
/// Exact component tokens for the canonical Field + FieldSection system.
///
/// Field geometry retains the shared row/lane owner. Text metrics resolve from
/// the canonical platform function scale; value/caption extents derive from
/// those metrics so typography changes also update alignment.
abstract final class CatchFieldTokens {
  static const double rowHorizontalPadding = CatchSpacing.s4;
  static const double dividedRowBleed = CatchSpacing.micro10;
  static const double rowVerticalPadding = CatchSpacing.s3;
  static const double leadingIconExtent = CatchIconSize.md;
  static const double leadingGap = CatchSpacing.micro14;
  static const double textLaneInset = leadingIconExtent + leadingGap;
  static double get captionExtent => captionFontSize * supportLineHeight;
  static double get valueLineExtent => valueFontSize * valueLineHeight;
  static const double supportingTopGap = CatchSpacing.micro6;

  static const double trailingGap = CatchSpacing.s2;
  static const double disclosureGlyphExtent = CatchSpacing.s4;
  static const double largeGlyphExtent = CatchSpacing.micro18;
  static const double trailingValueMaxWidth = 160;
  static const double controlTopGap = CatchSpacing.micro10;
  static const double actionBarTopGap = CatchSpacing.s4;

  static const double chipHorizontalGap = CatchSpacing.s2;
  static const double chipVerticalGap = CatchSpacing.s2;
  static const double chipVisualMinHeight = 30;
  static const double chipRunSpacing = chipVerticalGap;
  static const double chipHorizontalPadding = CatchSpacing.micro14;
  static const double chipVerticalPadding = CatchSpacing.s2;
  static const double chipSelectedGlyphExtent = CatchSpacing.s3;
  static const double chipSelectedGlyphGap = CatchSpacing.micro6;

  static const double actionButtonHorizontalPadding = CatchSpacing.micro18;
  static const double actionButtonVerticalPadding = CatchSpacing.micro10;
  static const double actionButtonGap = CatchSpacing.s2;
  static const double actionButtonSpinnerGap = 7;

  static const double stepperHitExtent = CatchSpacing.s11;
  static const double stepperVisualExtent = CatchSpacing.s8;
  static const double stepperVisualEdgeInset =
      (stepperHitExtent - stepperVisualExtent) / 2;
  static const double stepperGap = CatchSpacing.s4;
  static const double stepperLayoutGap = stepperGap - stepperVisualEdgeInset;
  static const double stepperValueMinWidth = 30;
  static const double stepperValueFontSize = 15;
  static const double stepperGlyphExtent = 15;

  static const double toggleTrackWidth = CatchSpacing.s11;
  static const double toggleTrackHeight = 26;
  static const double toggleTrackInset = CatchSpacing.micro3;
  static const double toggleKnobExtent = 20;
  static const double toggleKnobOnOffset = 21;

  static const double tileRadius = CatchRadius.interactiveTile;
  static const double sectionRadius = CatchRadius.md;
  static const double sectionHeaderGap = CatchSpacing.s3;
  static const double sectionRuleGap = CatchSpacing.s2;
  static const double containedSectionFooterTopPadding = CatchSpacing.micro2;
  static const double dividedSectionFooterTopPadding = CatchSpacing.s2;
  static const double sectionCountFontSize = 9.5;
  static const double sectionCountLetterSpacing = 0.76;
  static const double sectionKickerFontSize = 11;
  static const double sectionKickerLetterSpacing = 1.43;

  static double get valueFontSize =>
      CatchPlatformTokens.typography.fieldValue.fontSize!;
  static double get captionFontSize =>
      CatchPlatformTokens.typography.fieldLabel.fontSize!;
  static double get contentBodyFontSize =>
      CatchPlatformTokens.typography.secondary.fontSize!;
  static double get counterFontSize =>
      CatchPlatformTokens.typography.context.fontSize!;
  static double get chipFontSize =>
      CatchPlatformTokens.typography.control.fontSize!;
  static double get actionButtonFontSize =>
      CatchPlatformTokens.typography.control.fontSize!;
  static double get valueLineHeight =>
      CatchPlatformTokens.typography.fieldValue.height!;
  static double get multilineValueLineHeight => valueLineHeight;
  static double get contentBodyLineHeight =>
      CatchPlatformTokens.typography.secondary.height!;
  static const double contentBodyTopGap = CatchSpacing.micro3;
  static double get supportLineHeight =>
      CatchPlatformTokens.typography.fieldLabel.height!;
  static const double supportingCounterGap = CatchSpacing.s3;
  static const double errorGlyphGap = CatchSpacing.micro6;
  static double get errorGlyphExtent => captionFontSize;

  static const double spinnerExtent = CatchSpacing.s4;
  static const double actionSpinnerExtent = 13;
  static const Duration spinnerPeriod = Duration(milliseconds: 800);

  static const double focusRingWidth = CatchStroke.focusRing;
  static const double focusRingOffset = CatchSpacing.micro2;
  static const double underlineSweepBottomOffset =
      CatchStroke.underline - CatchStroke.hairline;

  static const double activeTintAlpha =
      GeneratedCatchFieldTokens.activeTintAlpha;
  static const double pressedTintAlpha =
      GeneratedCatchFieldTokens.pressedTintAlpha;
  static const double disabledOpacity =
      GeneratedCatchFieldTokens.disabledOpacity;
  static const double boundedStepperOpacity = 0.32;
  static const double savingCancelOpacity = 0.45;
  static const double savingToggleOpacity = 0.55;
  static const double chipPressedScale = 0.97;
  static const double stepperPressedScale = 0.92;
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration standard = Duration(milliseconds: 200);
  static const Duration reveal = Duration(milliseconds: 300);
  static const Duration pressIn = Duration(milliseconds: 80);
  static const Duration pressOut = Duration(milliseconds: 180);
  static const Duration singleChoiceCloseDelay = Duration(milliseconds: 180);
  static const Duration savedStatusHold = Duration(milliseconds: 900);
  static const Duration repeatDelay = Duration(milliseconds: 400);
  static const Duration repeatNormal = Duration(milliseconds: 110);
  static const Duration repeatAccelerated = Duration(milliseconds: 55);
  static const int repeatAccelerationTicks = 10;
  static const Curve curve = Cubic(0.2, 0.7, 0.2, 1);

  static Color activeSurface(CatchTokens tokens) => Color.alphaBlend(
    tokens.ink.withValues(alpha: activeTintAlpha),
    tokens.surface,
  );

  static Color pressedSurface(CatchTokens tokens) => Color.alphaBlend(
    tokens.ink.withValues(alpha: pressedTintAlpha),
    tokens.surface,
  );
}
