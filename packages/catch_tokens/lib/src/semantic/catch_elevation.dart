import 'package:catch_tokens/generated/catch_design_tokens.g.dart';
import 'package:catch_tokens/src/primitives/catch_spacing.dart';
import 'package:catch_tokens/src/semantic/catch_opacity.dart';
import 'package:catch_tokens/src/semantic/catch_tokens.dart';
import 'package:flutter/material.dart';

/// Minimal elevation tokens. Most Catch surfaces should use a hairline border;
/// use shadows only when UI actually floats above content.
abstract final class CatchElevation {
  static const List<BoxShadow> none = <BoxShadow>[];

  /// Shared physical-shadow color for Material/PhysicalShape surfaces.
  static const Color physicalShadow = Color.fromRGBO(26, 20, 16, 0.18);

  /// Flutter physical elevation for clipped ticket shapes that cannot use
  /// regular [BoxShadow] lists.
  static const double physicalTicket = 4.0;

  /// Physical lift for circular floating controls over media.
  static const double physicalControl = 3.0;

  /// Handoff floating icon-button shadow for controls over photos and maps.
  static const List<BoxShadow> iconButtonFloat = <BoxShadow>[
    BoxShadow(
      color: Color.fromRGBO(26, 20, 16, 0.18),
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
  ];

  /// Toggle knob shadow from the handoff control primitive.
  static const List<BoxShadow> toggleKnob = <BoxShadow>[
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.25),
      blurRadius: 3,
      offset: Offset(0, 1),
    ),
  ];

  /// Physical lift for the primary pass control over media.
  static const double physicalPassControl = 5.0;

  /// Material menu elevation.
  static const double menu = 8.0;

  /// Floating block: popovers, the booking card, pinned bars.
  static List<BoxShadow> float(Brightness brightness) =>
      brightness == Brightness.dark
      ? GeneratedCatchThemeElevationTokens.darkFloat
      : GeneratedCatchThemeElevationTokens.lightFloat;

  /// Bottom sheets and docks over content.
  static List<BoxShadow> sheet(Brightness brightness) =>
      brightness == Brightness.dark
      ? GeneratedCatchThemeElevationTokens.darkSheet
      : GeneratedCatchThemeElevationTokens.lightSheet;

  /// Dialogs and toasts.
  static List<BoxShadow> dialog(Brightness brightness) =>
      brightness == Brightness.dark
      ? GeneratedCatchThemeElevationTokens.darkDialog
      : GeneratedCatchThemeElevationTokens.lightDialog;

  /// Alias of the day [float]; P7 deletes it.
  static const List<BoxShadow> card = GeneratedCatchElevationTokens.card;

  /// Alias of the day [sheet]; P7 deletes it.
  static const List<BoxShadow> raised = GeneratedCatchElevationTokens.raised;

  /// Alias of the day [dialog]; P7 deletes it.
  static const List<BoxShadow> overlay = GeneratedCatchElevationTokens.overlay;

  static List<BoxShadow> focusRing(CatchTokens t) => <BoxShadow>[
    BoxShadow(color: t.primarySoft, spreadRadius: CatchSpacing.micro3),
  ];

  /// Exact active-field lift from the Field handoff. Field rows deliberately
  /// use one shadow layer so the pressed-to-focused handoff reads as one tile
  /// instead of two competing elevations.
  static List<BoxShadow> fieldActive(Brightness brightness) =>
      brightness == Brightness.dark
      ? GeneratedCatchThemeElevationTokens.darkFieldActive
      : GeneratedCatchThemeElevationTokens.lightFieldActive;

  static List<BoxShadow> segmentedSelected(CatchTokens t) => <BoxShadow>[
    BoxShadow(
      color: t.ink.withValues(alpha: CatchOpacity.controlOverlayPressed),
      blurRadius: CatchSpacing.micro14,
      offset: const Offset(CatchSpacing.s0, CatchSpacing.micro3),
    ),
  ];

  static List<BoxShadow> glow(
    Color color, {
    required double blurRadius,
    double spreadRadius = CatchSpacing.micro2,
  }) => <BoxShadow>[
    BoxShadow(color: color, blurRadius: blurRadius, spreadRadius: spreadRadius),
  ];
}
