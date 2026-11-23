import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

class EventDetailSurfaceStyle {
  const EventDetailSurfaceStyle({
    required this.isDark,
    required this.pageBackground,
    required this.surfaceBackground,
    required this.raisedBackground,
    required this.borderColor,
    required this.dividerColor,
    required this.headingColor,
    required this.bodyColor,
    required this.mutedColor,
    required this.primaryColor,
    required this.primarySoftColor,
  });

  final bool isDark;
  final Color pageBackground;
  final Color surfaceBackground;
  final Color raisedBackground;
  final Color borderColor;
  final Color dividerColor;
  final Color headingColor;
  final Color bodyColor;
  final Color mutedColor;
  final Color primaryColor;
  final Color primarySoftColor;

  factory EventDetailSurfaceStyle.light(
    CatchTokens t, {
    bool useWhite = false,
  }) {
    return EventDetailSurfaceStyle(
      isDark: false,
      pageBackground: useWhite ? t.surface : t.bg,
      surfaceBackground: t.surface,
      raisedBackground: t.raised,
      borderColor: t.line,
      dividerColor: t.line,
      headingColor: t.ink,
      bodyColor: t.ink2,
      mutedColor: t.ink3,
      primaryColor: t.primary,
      primarySoftColor: t.primarySoft,
    );
  }

  factory EventDetailSurfaceStyle.dark(CatchTokens t) {
    const d = CatchTokens.editorialDark;
    return EventDetailSurfaceStyle(
      isDark: true,
      pageBackground: t.ink,
      surfaceBackground: d.surface,
      raisedBackground: d.raised,
      borderColor: d.line,
      dividerColor: d.line2,
      headingColor: d.ink,
      bodyColor: d.ink2,
      mutedColor: d.ink3,
      primaryColor: t.primary,
      primarySoftColor: t.primary.withValues(
        alpha: CatchOpacity.eventDetailPrimarySoft,
      ),
    );
  }
}
