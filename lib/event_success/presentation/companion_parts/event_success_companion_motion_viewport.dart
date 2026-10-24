part of '../event_success_companion_screen.dart';

class CompanionStageMotifImage extends StatefulWidget {
  const CompanionStageMotifImage._({
    required this.accent,
    required this.foreground,
    required this.visualAsset,
    required this.idlePulsePeriodMs,
  });

  final Color accent;
  final Color foreground;
  final EventSuccessMotionAsset visualAsset;
  final int idlePulsePeriodMs;

  @override
  State<CompanionStageMotifImage> createState() =>
      _CompanionStageMotifImageState();
}

class CompanionStageTransitionViewport extends StatelessWidget {
  const CompanionStageTransitionViewport({
    super.key,
    required this.momentKey,
    required this.child,
  });

  final String momentKey;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: CatchMotion.slow,
      switchInCurve: CatchMotion.standardCurve,
      switchOutCurve: CatchMotion.easeInCubicCurve,
      transitionBuilder: (child, animation) {
        final fade = CurvedAnimation(
          parent: animation,
          curve: CatchMotion.standardCurve,
        );
        final offset = Tween<Offset>(
          begin: const Offset(0, 0.12),
          end: Offset.zero,
        ).animate(fade);
        final scale = Tween<double>(begin: 0.96, end: 1).animate(fade);
        return FadeTransition(
          opacity: fade,
          child: SlideTransition(
            position: offset,
            child: ScaleTransition(scale: scale, child: child),
          ),
        );
      },
      child: KeyedSubtree(key: ValueKey(momentKey), child: child),
    );
  }
}

/// Gives the wrapped widget a kinetic press response: scale down on tap-down,
/// brief glow flare, then a spring-back to rest. Drop-in replacement for
/// InkWell-style affordances on the stage where Material's ink ripple feels
/// out of place against the gradient + motif backdrop.

class CompanionBouncySurface extends StatefulWidget {
  const CompanionBouncySurface({
    super.key,
    required this.child,
    required this.onTap,
    this.glowColor,
    this.borderRadius,
    this.semanticLabel,
    this.selected,
  });

  final Widget child;
  final VoidCallback? onTap;
  final Color? glowColor;
  final BorderRadius? borderRadius;
  final String? semanticLabel;
  final bool? selected;

  /// How deep the press depresses. 1.0 = no scale, 0 = scale to zero.
  /// Tuned for chips and small CTAs; keep static for now.
  static const double _minScale = 0.94;

  @override
  State<CompanionBouncySurface> createState() => _CompanionBouncySurfaceState();
}

class CompanionBouncyChip extends StatelessWidget {
  const CompanionBouncyChip({
    super.key,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final background = active ? t.ink : t.surface;
    final foreground = active ? t.surface : t.ink;
    final radius = BorderRadius.circular(CatchRadius.pill);
    return CompanionBouncySurface(
      onTap: onTap,
      glowColor: t.primary,
      borderRadius: radius,
      semanticLabel: label,
      child: CatchSurface(
        borderRadius: radius,
        backgroundColor: background,
        borderRole: active ? null : CatchBorderRole.boundary,
        padding: _companionStagePillPadding,
        child: CatchText(
          label,
          maxLines: 1,

          variant: CatchTextVariant.sectionTitle,
          color: foreground,
        ),
      ),
    );
  }
}

/// Live co-presence ring shown on arrival-class moments. Reads
/// `Event.checkedInCount` (denormalized + maintained by Cloud Functions, so
/// it updates in real time via the existing event listener — no separate
/// Firestore reads). Renders anonymous dots around a center count, with a
/// brief scale-pulse when the count climbs.
