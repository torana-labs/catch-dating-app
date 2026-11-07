import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// dot: a status or a format. ring: a step not reached. check: a step done.
/// number: a numbered step. `@catch/web-ui` names the same four as `kind`.
enum CatchMarkerVariant { dot, ring, check, number }

/// A dot's or ring's diameter: 8, 10 or 12. Checks and numbers are 20.
enum CatchMarkerSize {
  sm(CatchSpacing.s2),
  md(CatchSpacing.micro10),
  lg(CatchSpacing.s3);

  const CatchMarkerSize(this.extent);

  final double extent;
}

/// The marker's colour. [format] takes the marker's own format, then the
/// nearest root's, then run.
enum CatchMarkerTone { ink, muted, success, warning, danger, info, format }

/// Dots, rings, checks and numbers: status lights, plan steps, legend keys.
///
/// The system Marker. It is decorative: the row or legend beside it carries
/// the meaning, so it excludes itself from semantics. A [live] marker pulses
/// for the step happening now; it holds still when the platform or the root
/// asks for reduced motion.
class CatchMarker extends StatefulWidget {
  const CatchMarker({
    super.key,
    this.variant = CatchMarkerVariant.dot,
    this.size = CatchMarkerSize.md,
    this.tone = CatchMarkerTone.ink,
    this.format,
    this.live = false,
    this.value,
  }) : assert(variant != CatchMarkerVariant.number || value != null);

  /// A numbered step, such as the editor's step rail.
  const CatchMarker.number(
    int this.value, {
    super.key,
    this.tone = CatchMarkerTone.ink,
    this.format,
  }) : variant = CatchMarkerVariant.number,
       size = CatchMarkerSize.md,
       live = false;

  final CatchMarkerVariant variant;
  final CatchMarkerSize size;
  final CatchMarkerTone tone;
  final CatchFormat? format;
  final bool live;

  /// The number a [CatchMarkerVariant.number] marker shows.
  final int? value;

  /// The extent of a check or a number.
  static const double badgeExtent = CatchSpacing.s5;

  /// How far the live pulse spreads beyond the dot.
  static const double _pulseSpread = CatchSpacing.micro6 + CatchStroke.hairline;

  /// The colour [tone] paints on [ground], for legends that draw a key
  /// without a marker.
  static Color colorOf(
    BuildContext context, {
    required CatchMarkerTone tone,
    CatchFormat? format,
  }) {
    final t = CatchTokens.of(context);
    return switch (tone) {
      CatchMarkerTone.ink => t.ink,
      CatchMarkerTone.muted => t.ink3,
      CatchMarkerTone.success => t.formatCourts,
      CatchMarkerTone.warning => t.formatGames,
      CatchMarkerTone.danger => t.formatRun,
      CatchMarkerTone.info => t.indigo,
      CatchMarkerTone.format =>
        (format ?? CatchRootScope.maybeOf(context)?.format ?? CatchFormat.run)
            .accent,
    };
  }

  @override
  State<CatchMarker> createState() => _CatchMarkerState();
}

class _CatchMarkerState extends State<CatchMarker>
    with SingleTickerProviderStateMixin {
  AnimationController? _pulse;

  bool _reducedMotion(BuildContext context) =>
      (MediaQuery.maybeOf(context)?.disableAnimations ?? false) ||
      (CatchRootScope.maybeOf(context)?.reducedMotion ?? false);

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncPulse();
  }

  @override
  void didUpdateWidget(CatchMarker oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncPulse();
  }

  void _syncPulse() {
    final wanted = widget.live && !_reducedMotion(context);
    if (wanted && _pulse == null) {
      _pulse = AnimationController(
        vsync: this,
        duration: GeneratedCatchDurationTokens.pulse,
      )..repeat();
    } else if (!wanted && _pulse != null) {
      _pulse!.dispose();
      _pulse = null;
    }
  }

  @override
  void dispose() {
    _pulse?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = CatchMarker.colorOf(
      context,
      tone: widget.tone,
      format: widget.format,
    );
    final badge =
        widget.variant == CatchMarkerVariant.check ||
        widget.variant == CatchMarkerVariant.number;
    final extent = badge ? CatchMarker.badgeExtent : widget.size.extent;
    final onMarker =
        ThemeData.estimateBrightnessForColor(color) == Brightness.dark
        ? CatchTokens.editorialWhite
        : CatchTokens.editorialBlack;
    final Widget? glyph = switch (widget.variant) {
      CatchMarkerVariant.check => Icon(
        CatchIcons.check,
        size: CatchIconSize.xs,
        color: onMarker,
      ),
      CatchMarkerVariant.number => DefaultTextStyle.merge(
        style: TextStyle(color: onMarker),
        child: CatchText(
          '${widget.value}',
          variant: CatchTextVariant.labelBadge,
          numeric: true,
        ),
      ),
      _ => null,
    };
    Widget marker = SizedBox.square(
      dimension: extent,
      child: DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: widget.variant == CatchMarkerVariant.ring ? null : color,
          border: widget.variant == CatchMarkerVariant.ring
              ? Border.all(color: color, width: CatchStroke.focusRing)
              : null,
        ),
        child: glyph == null ? null : Center(child: glyph),
      ),
    );
    final pulse = _pulse;
    if (pulse != null) {
      marker = AnimatedBuilder(
        animation: pulse,
        child: marker,
        builder: (context, child) {
          // Grows from the dot and fades out by 70% of the cycle.
          final progress = (pulse.value / 0.7).clamp(0.0, 1.0);
          return DecoratedBox(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 1 - progress),
                  spreadRadius: CatchMarker._pulseSpread * progress,
                ),
              ],
            ),
            child: child,
          );
        },
      );
    }
    return ExcludeSemantics(child: marker);
  }
}
