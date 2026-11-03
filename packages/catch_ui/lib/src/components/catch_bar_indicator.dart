import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/primitives/catch_legacy_surface.dart';
import 'package:flutter/material.dart';

enum CatchBarIndicatorVariant { rounded, square }

/// One quantitative bar, including empty stubs and bounded fractional values.
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
       assert(emptyHeightFactor >= 0 && emptyHeightFactor <= 1);

  final num value;
  final num maxValue;
  final CatchBarIndicatorVariant variant;
  final double minFilledHeightFactor;
  final double emptyHeightFactor;
  final Color? filledColor;
  final Color? emptyColor;

  @override
  Widget build(BuildContext context) {
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
}
