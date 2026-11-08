import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_root.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// How a [CatchCountdownIndicator] counts: big [text] figures, or the figures
/// inside a [ring] that empties in the event colour.
enum CatchCountdownIndicatorVariant { text, ring }

/// Seconds counting down to a moment on the guest phone: "Tables in 10".
///
/// It starts when it first builds and counts whole seconds from [seconds] to
/// zero, then calls [onDone] once; a new [seconds] starts it again. [label]
/// sits under the figures and is read with them. The ring takes the format
/// of the nearest CatchRoot, games when there is none. Under a disabled
/// TickerMode it holds still, as in goldens.
class CatchCountdownIndicator extends StatefulWidget {
  const CatchCountdownIndicator({
    super.key,
    required this.seconds,
    this.label,
    this.onDone,
    this.variant = CatchCountdownIndicatorVariant.text,
  }) : assert(seconds > 0, 'Count down from at least one second.');

  final int seconds;
  final String? label;
  final VoidCallback? onDone;
  final CatchCountdownIndicatorVariant variant;

  @override
  State<CatchCountdownIndicator> createState() =>
      _CatchCountdownIndicatorState();
}

class _CatchCountdownIndicatorState extends State<CatchCountdownIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: Duration(seconds: widget.seconds),
  )..addStatusListener(_onStatus);

  static const double _ringExtent = 96;

  @override
  void initState() {
    super.initState();
    _controller.forward();
  }

  @override
  void didUpdateWidget(CatchCountdownIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.seconds != widget.seconds) {
      _controller
        ..duration = Duration(seconds: widget.seconds)
        ..forward(from: 0);
    }
  }

  void _onStatus(AnimationStatus status) {
    if (status == AnimationStatus.completed) widget.onDone?.call();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final format = CatchRootScope.maybeOf(context)?.format ?? CatchFormat.games;
    final label = widget.label;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final left = 1 - _controller.value;
        final remaining = (widget.seconds * left).ceil();
        final figures = widget.variant == CatchCountdownIndicatorVariant.ring
            ? SizedBox.square(
                dimension: _ringExtent,
                child: CustomPaint(
                  painter: _RingPainter(
                    fraction: left,
                    track: t.line2,
                    fill: format.accent,
                  ),
                  child: Center(
                    child: CatchText(
                      '$remaining',
                      variant: CatchTextVariant.displaySm,
                      numeric: true,
                    ),
                  ),
                ),
              )
            : CatchText(
                '$remaining',
                variant: CatchTextVariant.displayHero,
                numeric: true,
              );
        return Semantics(
          container: true,
          label: label,
          value: '$remaining',
          excludeSemantics: true,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            spacing: CatchSpacing.s2,
            children: [
              figures,
              if (label != null)
                CatchText(
                  label,
                  variant: CatchTextVariant.bodySmall,
                  tone: CatchTextTone.secondary,
                  align: TextAlign.center,
                ),
            ],
          ),
        );
      },
    );
  }
}

/// The ring: a line2 track with the time left drawn clockwise from the top.
class _RingPainter extends CustomPainter {
  const _RingPainter({
    required this.fraction,
    required this.track,
    required this.fill,
  });

  final double fraction;
  final Color track;
  final Color fill;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = CatchStroke.meterMd;
    final rect = (Offset.zero & size).deflate(stroke / 2);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round;
    canvas
      ..drawArc(rect, 0, math.pi * 2, false, paint..color = track)
      ..drawArc(
        rect,
        -math.pi / 2,
        math.pi * 2 * fraction,
        false,
        paint..color = fill,
      );
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) =>
      oldDelegate.fraction != fraction ||
      oldDelegate.track != track ||
      oldDelegate.fill != fill;
}
