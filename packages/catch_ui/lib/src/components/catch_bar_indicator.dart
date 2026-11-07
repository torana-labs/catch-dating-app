import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

enum CatchBarIndicatorVariant { rounded, square }

/// One bar of a [CatchBarIndicator.chart]: a week, a day.
@immutable
class CatchBarIndicatorBar {
  const CatchBarIndicatorBar({
    required this.label,
    required this.value,
    this.partial = false,
  }) : assert(value >= 0);

  /// The caller's label under the bar, such as "27 Oct".
  final String label;
  final num value;

  /// A period still filling (this week): drawn as an outlined track.
  final bool partial;
}

/// One quantitative bar, including empty stubs and bounded fractional values.
///
/// [CatchBarIndicator.chart] is the system BarChart: simple bars on one scale
/// with each value above its bar and its label beneath, the running period
/// outlined, read aloud as one image through [label].
class CatchBarIndicator extends StatelessWidget {
  const CatchBarIndicator({
    super.key,
    required this.value,
    required this.maxValue,
    this.variant = CatchBarIndicatorVariant.rounded,
    this.minFilledHeightFactor = 0.06,
    this.emptyHeightFactor = 0.02,
    this.filledColor,
    this.emptyColor,
  }) : assert(minFilledHeightFactor >= 0 && minFilledHeightFactor <= 1),
       assert(emptyHeightFactor >= 0 && emptyHeightFactor <= 1),
       bars = null,
       label = null,
       height = chartHeight;

  /// The system BarChart: [bars] on one scale in a plot [height] tall.
  const CatchBarIndicator.chart({
    super.key,
    required List<CatchBarIndicatorBar> this.bars,
    required String this.label,
    this.height = chartHeight,
  }) : assert(height > _chartValueBand),
       value = 0,
       maxValue = 1,
       variant = CatchBarIndicatorVariant.rounded,
       minFilledHeightFactor = 0,
       emptyHeightFactor = 0,
       filledColor = null,
       emptyColor = null;

  /// The chart's default plot height.
  static const double chartHeight =
      GeneratedCatchSpacingTokens.s28 + CatchSpacing.s2;

  /// The plot space each column keeps for the value above its bar.
  static const double _chartValueBand = CatchSpacing.s6;

  /// The chart's bars, or null for a single bar.
  final List<CatchBarIndicatorBar>? bars;

  /// The chart's spoken description: what the bars count.
  final String? label;

  /// The chart's plot height.
  final double height;

  final num value;
  final num maxValue;
  final CatchBarIndicatorVariant variant;
  final double minFilledHeightFactor;
  final double emptyHeightFactor;
  final Color? filledColor;
  final Color? emptyColor;

  @override
  Widget build(BuildContext context) {
    final bars = this.bars;
    if (bars != null) return _chart(context, bars);
    final ratio = maxValue <= 0
        ? emptyHeightFactor
        : (value / maxValue).clamp(minFilledHeightFactor, 1).toDouble();
    final color = value <= 0
        ? emptyColor ?? CatchTokens.of(context).line2
        : filledColor ?? CatchTokens.of(context).ink;
    return Align(
      alignment: Alignment.bottomCenter,
      child: FractionallySizedBox(
        widthFactor: 1,
        heightFactor: ratio,
        child: switch (variant) {
          CatchBarIndicatorVariant.rounded => CatchLegacySurface(
            radius: CatchRadius.xs,
            backgroundColor: color,
            child: const SizedBox.expand(),
          ),
          CatchBarIndicatorVariant.square => ColoredBox(color: color),
        },
      ),
    );
  }

  Widget _chart(BuildContext context, List<CatchBarIndicatorBar> bars) {
    final t = CatchTokens.of(context);
    final top = bars.fold<num>(
      1,
      (high, bar) => bar.value > high ? bar.value : high,
    );
    final duration = MediaQuery.maybeOf(context)?.disableAnimations ?? false
        ? Duration.zero
        : GeneratedCatchDurationTokens.slow;
    final spoken = [
      for (final bar in bars) '${bar.label} ${bar.value}',
    ].join('; ');
    return Semantics(
      label: '$label: $spoken',
      image: true,
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          spacing: CatchSpacing.s2,
          children: [
            SizedBox(
              height: height,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                spacing: CatchSpacing.s3,
                children: [
                  for (final bar in bars)
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        spacing: CatchSpacing.micro6,
                        children: [
                          CatchText(
                            '${bar.value}',
                            variant: CatchTextVariant.labelAction,
                            numeric: true,
                            maxLines: 1,
                          ),
                          AnimatedContainer(
                            duration: duration,
                            curve: GeneratedCatchEasingTokens.standard,
                            width: double.infinity,
                            height:
                                bar.value / top * (height - _chartValueBand),
                            decoration: BoxDecoration(
                              color: bar.partial ? t.track : t.ink,
                              border: bar.partial
                                  ? Border.all(
                                      color: t.controlLine,
                                      width: CatchStroke.emphasis,
                                    )
                                  : null,
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(CatchRadius.sm),
                                bottom: Radius.circular(CatchRadius.xs),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            Row(
              spacing: CatchSpacing.s3,
              children: [
                for (final bar in bars)
                  Expanded(
                    child: CatchText(
                      bar.label,
                      variant: CatchTextVariant.labelAction,
                      tone: CatchTextTone.secondary,
                      align: TextAlign.center,
                      maxLines: 1,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
