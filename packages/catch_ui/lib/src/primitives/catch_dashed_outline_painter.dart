import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';

/// A dashed edge inside a rounded rectangle: the add card of a
/// CatchChoiceTile and an outline CatchBadge (something still waiting).
class CatchDashedOutlinePainter extends CustomPainter {
  const CatchDashedOutlinePainter({required this.color, required this.radius});

  final Color color;
  final BorderRadius radius;

  static const double _dash = CatchSpacing.micro6;
  static const double _gap = CatchSpacing.s1;

  @override
  void paint(Canvas canvas, Size size) {
    const inset = CatchStroke.control / 2;
    final rect =
        const Offset(inset, inset) &
        Size(size.width - inset * 2, size.height - inset * 2);
    final path = Path()..addRRect(radius.toRRect(rect).scaleRadii());
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = CatchStroke.control;
    for (final metric in path.computeMetrics()) {
      for (var at = 0.0; at < metric.length; at += _dash + _gap) {
        canvas.drawPath(metric.extractPath(at, at + _dash), paint);
      }
    }
  }

  @override
  bool shouldRepaint(CatchDashedOutlinePainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.radius != radius;
}
