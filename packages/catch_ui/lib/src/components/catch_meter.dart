import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// progress: a bar. cap: a bar with a limit mark (the Catch bill). segments:
/// equal steps (step 4 of 5). stack: shares of a whole, each in its own
/// colour, with a legend. `@catch/web-ui` names the same four as `kind`.
enum CatchMeterVariant { progress, cap, segments, stack }

/// The track's thickness: 4, 6 or 8.
enum CatchMeterSize {
  sm(CatchStroke.meterSm),
  md(CatchStroke.meterMd),
  lg(CatchStroke.meterLg);

  const CatchMeterSize(this.extent);

  final double extent;
}

/// The fill of a progress, cap or segments meter. [format] takes the meter's
/// own format, then the nearest root's, then run.
enum CatchMeterColor { ink, format, success, warning, danger }

/// One share of a [CatchMeterVariant.stack] meter.
@immutable
class CatchMeterPart {
  const CatchMeterPart({
    required this.label,
    required this.value,
    this.color = CatchMeterPartColor.ink,
  }) : assert(value >= 0);

  /// The legend's name for this share, such as "Instagram bio".
  final String label;
  final num value;
  final CatchMeterPartColor color;
}

/// A stack part's colour: ink, the muted track, indigo or a format.
enum CatchMeterPartColor {
  ink,
  muted,
  indigo,
  run,
  dinner,
  games,
  courts,
  nightsOut;

  CatchFormat? get format => switch (this) {
    run => CatchFormat.run,
    dinner => CatchFormat.dinner,
    games => CatchFormat.games,
    courts => CatchFormat.courts,
    nightsOut => CatchFormat.nightsOut,
    ink || muted || indigo => null,
  };
}

/// Progress, caps, steps and shares on a rounded track: the system Meter.
///
/// The track takes its colour from what the meter sits on: the track token on
/// the ground, the nested block inside a tile, translucent white inside a
/// format colour, where the fill turns ink. Fills ease when the value changes
/// and hold still under reduced motion. [label] is read aloud, and shown above
/// the track when [showLabel] is true. A stack meter draws its parts in order
/// with a legend of each share as a whole percentage.
class CatchMeter extends StatelessWidget {
  const CatchMeter({
    super.key,
    required this.value,
    required this.label,
    this.max = 100,
    this.variant = CatchMeterVariant.progress,
    this.size = CatchMeterSize.md,
    this.color = CatchMeterColor.ink,
    this.format,
    this.showLabel = false,
    this.limit,
    this.parts = const <CatchMeterPart>[],
  }) : assert(max > 0),
       assert(
         variant != CatchMeterVariant.stack ||
             parts != const <CatchMeterPart>[],
       ),
       assert(variant != CatchMeterVariant.cap || limit != null);

  /// From 0 to [max]. A segments meter fills this many whole steps.
  final num value;
  final num max;
  final CatchMeterVariant variant;
  final CatchMeterSize size;
  final CatchMeterColor color;
  final CatchFormat? format;
  final String label;
  final bool showLabel;

  /// Cap only: where the limit mark sits, from 0 to [max].
  final num? limit;

  /// Stack only: the shares, in order.
  final List<CatchMeterPart> parts;

  /// The stack's own thickness, wider than a progress track.
  static const double stackExtent = CatchSpacing.s3;

  /// The gap between stack parts.
  static const double _partGap = CatchSpacing.micro3;

  /// A legend key's diameter.
  static const double keyExtent = CatchSpacing.micro10;

  /// How far the cap's limit mark reaches above and below the track.
  static const double _limitOverhang = CatchSpacing.s1;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final ground = CatchRootScope.groundOf(context);
    final scopeFormat = CatchRootScope.maybeOf(context)?.format;
    final onColour = ground == CatchGround.colour;
    final track = switch (ground) {
      CatchGround.tile || CatchGround.nested => t.nested,
      CatchGround.colour => CatchTokens.editorialWhite.withValues(
        alpha: GeneratedCatchOpacityTokens.onColour,
      ),
      _ => t.track,
    };
    final fill = onColour
        ? CatchTokens.editorialBlack
        : switch (color) {
            CatchMeterColor.ink => t.primary,
            CatchMeterColor.format =>
              (format ?? scopeFormat ?? CatchFormat.run).accent,
            CatchMeterColor.success => t.formatCourts,
            CatchMeterColor.warning => t.formatGames,
            CatchMeterColor.danger => t.formatRun,
          };
    final duration =
        (MediaQuery.maybeOf(context)?.disableAnimations ?? false) ||
            (CatchRootScope.maybeOf(context)?.reducedMotion ?? false)
        ? Duration.zero
        : GeneratedCatchDurationTokens.slow;
    final radius = BorderRadius.circular(CatchRadius.pill);
    final fraction = (value / max).clamp(0, 1).toDouble();

    final Widget body;
    final String semanticValue;
    switch (variant) {
      case CatchMeterVariant.stack:
        final total = parts.fold<num>(0, (sum, part) => sum + part.value);
        int percent(CatchMeterPart part) =>
            total <= 0 ? 0 : (part.value / total * 100).round();
        Color partColor(CatchMeterPartColor part) => switch (part) {
          CatchMeterPartColor.ink => t.ink,
          CatchMeterPartColor.muted => t.track,
          CatchMeterPartColor.indigo => t.indigo,
          _ => part.format!.accent,
        };
        semanticValue = [
          for (final part in parts) '${part.label} ${percent(part)}%',
        ].join(', ');
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          spacing: CatchSpacing.s2,
          children: [
            ClipRRect(
              borderRadius: radius,
              child: SizedBox(
                height: stackExtent,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  spacing: _partGap,
                  children: [
                    for (final part in parts)
                      if (part.value > 0)
                        Expanded(
                          flex: (part.value * 1000).round(),
                          child: ColoredBox(color: partColor(part.color)),
                        ),
                  ],
                ),
              ),
            ),
            Wrap(
              spacing: CatchSpacing.s4,
              runSpacing: CatchSpacing.micro6,
              children: [
                for (final part in parts)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    spacing: CatchSpacing.micro6,
                    children: [
                      SizedBox.square(
                        dimension: keyExtent,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: partColor(part.color),
                          ),
                        ),
                      ),
                      CatchText(
                        '${part.label} · ${percent(part)}%',
                        variant: CatchTextVariant.labelAction,
                        tone: CatchTextTone.secondary,
                      ),
                    ],
                  ),
              ],
            ),
          ],
        );
      case CatchMeterVariant.segments:
        final steps = max.round();
        semanticValue = '$value / $max';
        body = Row(
          spacing: CatchSpacing.s1,
          children: [
            for (var step = 0; step < steps; step++)
              Expanded(
                child: AnimatedContainer(
                  duration: duration,
                  height: size.extent,
                  decoration: BoxDecoration(
                    color: step < value ? fill : track,
                    borderRadius: radius,
                  ),
                ),
              ),
          ],
        );
      case CatchMeterVariant.progress:
      case CatchMeterVariant.cap:
        semanticValue = '$value / $max';
        final limit = this.limit;
        final bar = ClipRRect(
          borderRadius: radius,
          child: SizedBox(
            height: size.extent,
            width: double.infinity,
            child: ColoredBox(
              color: track,
              child: AnimatedFractionallySizedBox(
                duration: duration,
                curve: GeneratedCatchEasingTokens.standard,
                alignment: AlignmentDirectional.centerStart,
                widthFactor: fraction,
                child: DecoratedBox(
                  decoration: BoxDecoration(color: fill, borderRadius: radius),
                ),
              ),
            ),
          ),
        );
        body = variant == CatchMeterVariant.cap && limit != null
            ? LayoutBuilder(
                builder: (context, constraints) {
                  final at = (limit / max).clamp(0, 1).toDouble();
                  return SizedBox(
                    height: size.extent + _limitOverhang * 2,
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Positioned.fill(
                          top: _limitOverhang,
                          bottom: _limitOverhang,
                          child: bar,
                        ),
                        PositionedDirectional(
                          start:
                              constraints.maxWidth * at - CatchStroke.hairline,
                          top: 0,
                          bottom: 0,
                          width: CatchStroke.focusRing,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: onColour
                                  ? CatchTokens.editorialBlack
                                  : t.ink,
                              borderRadius: BorderRadius.circular(
                                CatchStroke.hairline,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              )
            : bar;
    }

    return Semantics(
      label: label,
      value: semanticValue,
      child: ExcludeSemantics(
        child: showLabel
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                spacing: CatchSpacing.micro6,
                children: [
                  CatchText(
                    label,
                    variant: CatchTextVariant.labelKicker,
                    tone: onColour
                        ? CatchTextTone.inherit
                        : CatchTextTone.secondary,
                  ),
                  body,
                ],
              )
            : body,
      ),
    );
  }
}
