import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

class ProfileCardPalette {
  const ProfileCardPalette({
    required this.background,
    required this.surface,
    required this.surfaceRaised,
    required this.border,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.chipFill,
    required this.chipBorder,
    required this.accent,
    required this.accentSoft,
    required this.shadow,
    required this.photoPlaceholder,
  });

  final Color background;
  final Color surface;
  final Color surfaceRaised;
  final Color border;
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;
  final Color chipFill;
  final Color chipBorder;
  final Color accent;
  final Color accentSoft;
  final Color shadow;
  final Gradient photoPlaceholder;

  static ProfileCardPalette of(BuildContext context) {
    final t = CatchTokens.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return ProfileCardPalette(
      background: t.bg,
      surface: t.surface,
      surfaceRaised: t.raised,
      border: t.line2,
      textPrimary: t.ink,
      textSecondary: t.ink2,
      textMuted: t.ink3,
      chipFill: t.raised,
      chipBorder: t.line2,
      accent: t.primary,
      accentSoft: t.primarySoft,
      shadow: CatchTokens.editorialBlack.withValues(
        alpha: isDark
            ? CatchOpacity.profileShadowDark
            : CatchOpacity.profileShadowLight,
      ),
      // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
      photoPlaceholder: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [t.raised, t.surface],
      ),
    );
  }
}
