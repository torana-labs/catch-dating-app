import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_map_pin.dart';
import 'package:catch_ui/src/primitives/catch_row_press_surface.dart';
import 'package:catch_ui/src/primitives/catch_text.dart';
import 'package:catch_ui/src/primitives/catch_text_variant.dart';
import 'package:flutter/material.dart';

/// The system MapPreview: a static map drawn without a map provider.
///
/// Streets and water sit on the map ground; each [CatchMapPin] is a dot in
/// its event colour at a percent position, with its label beside it; a
/// [route] draws a dotted walking or running line through percent points.
/// [aspect] is width over height. [label] names the map for screen readers.
/// [onOpen] makes the whole map a button (open the full map). [footer] sits
/// under the map: the address, a directions button.
class CatchPinMap extends StatelessWidget {
  const CatchPinMap({
    super.key,
    required this.pins,
    required this.label,
    this.route,
    this.aspect = 16 / 9,
    this.onOpen,
    this.footer,
  });

  final List<CatchMapPin> pins;

  /// What the map shows, read aloud: "Map of the crawl, four stops".
  final String label;
  final List<CatchMapPoint>? route;
  final double aspect;
  final VoidCallback? onOpen;
  final Widget? footer;

  static const double _dot = 16;
  static const double _dotSelected = 22;
  static const double _ring = 3;
  static const double _labelPadding = CatchSpacing.micro10;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final route = this.route;
    final shadow = BoxShadow(
      color: CatchTokens.editorialBlack.withValues(
        alpha: CatchOpacity.subtleBorder,
      ),
      blurRadius: CatchSpacing.micro6,
      offset: const Offset(0, CatchSpacing.micro2),
    );
    final map = AspectRatio(
      aspectRatio: aspect,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(CatchRadius.lg),
        child: ColoredBox(
          color: t.map,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final size = constraints.biggest;
              return Stack(
                clipBehavior: Clip.hardEdge,
                children: [
                  Positioned.fill(
                    child: CustomPaint(
                      painter: _StreetsPainter(
                        street: t.ground,
                        water: t.tintIndigo,
                      ),
                    ),
                  ),
                  if (route != null && route.length > 1)
                    Positioned.fill(
                      child: CustomPaint(
                        painter: _RoutePainter(points: route, color: t.ink),
                      ),
                    ),
                  for (final pin in pins)
                    Positioned(
                      left: size.width * pin.x / 100,
                      top: size.height * pin.y / 100,
                      // A dot in the event colour inside a ground ring,
                      // centred on the point, with its label after it.
                      child: FractionalTranslation(
                        translation: const Offset(-0.5, -0.5),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          spacing: CatchSpacing.micro6,
                          children: [
                            Container(
                              width:
                                  _ring * 2 +
                                  (pin.status == CatchMapPinStatus.selected
                                      ? _dotSelected
                                      : _dot),
                              height:
                                  _ring * 2 +
                                  (pin.status == CatchMapPinStatus.selected
                                      ? _dotSelected
                                      : _dot),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: pin.format.accent,
                                border: Border.all(
                                  color: t.ground,
                                  width: _ring,
                                  strokeAlign: BorderSide.strokeAlignInside,
                                ),
                                boxShadow: [shadow],
                              ),
                            ),
                            if (pin.label case final label?
                                when label.isNotEmpty)
                              Container(
                                height: GeneratedCatchSizeTokens.badgeMd,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: _labelPadding,
                                ),
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color:
                                      pin.status == CatchMapPinStatus.selected
                                      ? pin.format.accent
                                      : t.ground,
                                  borderRadius: BorderRadius.circular(
                                    CatchRadius.pill,
                                  ),
                                  boxShadow: [shadow],
                                ),
                                child: DefaultTextStyle.merge(
                                  style: TextStyle(
                                    color:
                                        pin.status == CatchMapPinStatus.selected
                                        ? pin.format.ink
                                        : t.ink,
                                  ),
                                  child: CatchText(
                                    label,
                                    variant: CatchTextVariant.labelBadge,
                                    maxLines: 1,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
    final onOpen = this.onOpen;
    final semantic = Semantics(
      container: true,
      image: onOpen == null,
      button: onOpen != null,
      label: label,
      excludeSemantics: true,
      onTap: onOpen,
      child: onOpen == null
          ? map
          : ClipRRect(
              borderRadius: BorderRadius.circular(CatchRadius.lg),
              child: CatchRowPressSurface(
                onTap: onOpen,
                semanticButton: false,
                child: map,
              ),
            ),
    );
    final footer = this.footer;
    if (footer == null) return semantic;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      spacing: CatchSpacing.s3,
      children: [semantic, footer],
    );
  }
}

/// Streets on the map ground and water along the bottom edge, as the system
/// draws them in a 100 by 60 box stretched to the map.
class _StreetsPainter extends CustomPainter {
  const _StreetsPainter({required this.street, required this.water});

  final Color street;
  final Color water;

  static const double _streetWidth = 2.2;

  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 100;
    final sy = size.height / 60;
    Offset p(double x, double y) => Offset(x * sx, y * sy);
    final waterPath = Path()
      ..moveTo(p(-5, 58).dx, p(-5, 58).dy)
      ..cubicTo(
        p(25, 52).dx,
        p(25, 52).dy,
        p(55, 60).dx,
        p(55, 60).dy,
        p(105, 54).dx,
        p(105, 54).dy,
      )
      ..lineTo(p(105, 70).dx, p(105, 70).dy)
      ..lineTo(p(-5, 70).dx, p(-5, 70).dy)
      ..close();
    canvas.drawPath(waterPath, Paint()..color = water);
    Path curve(List<double> c) => Path()
      ..moveTo(p(c[0], c[1]).dx, p(c[0], c[1]).dy)
      ..cubicTo(
        p(c[2], c[3]).dx,
        p(c[2], c[3]).dy,
        p(c[4], c[5]).dx,
        p(c[4], c[5]).dy,
        p(c[6], c[7]).dx,
        p(c[6], c[7]).dy,
      );
    final streets = Path()
      ..addPath(curve([-5, 18, 20, 14, 40, 22, 105, 16]), Offset.zero)
      ..addPath(curve([-5, 44, 30, 40, 60, 50, 105, 42]), Offset.zero)
      ..addPath(curve([22, -5, 26, 20, 18, 40, 24, 65]), Offset.zero)
      ..addPath(curve([62, -5, 58, 25, 70, 40, 66, 65]), Offset.zero)
      ..moveTo(p(84, -5).dx, p(84, -5).dy)
      ..lineTo(p(80, 65).dx, p(80, 65).dy);
    canvas.drawPath(
      streets,
      Paint()
        ..color = street
        ..style = PaintingStyle.stroke
        ..strokeWidth = _streetWidth,
    );
  }

  @override
  bool shouldRepaint(_StreetsPainter oldDelegate) =>
      oldDelegate.street != street || oldDelegate.water != water;
}

/// A dotted line through percent points: the route of a run or a crawl.
class _RoutePainter extends CustomPainter {
  const _RoutePainter({required this.points, required this.color});

  final List<CatchMapPoint> points;
  final Color color;

  static const double _width = 3;
  static const double _dash = 2;
  static const double _gap = 6;

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path();
    for (final (index, point) in points.indexed) {
      final offset = Offset(
        size.width * point.x / 100,
        size.height * point.y / 100,
      );
      if (index == 0) {
        path.moveTo(offset.dx, offset.dy);
      } else {
        path.lineTo(offset.dx, offset.dy);
      }
    }
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = _width
      ..strokeCap = StrokeCap.round;
    for (final metric in path.computeMetrics()) {
      for (var at = 0.0; at < metric.length; at += _dash + _gap) {
        canvas.drawPath(metric.extractPath(at, at + _dash), paint);
      }
    }
  }

  @override
  bool shouldRepaint(_RoutePainter oldDelegate) =>
      oldDelegate.points != points || oldDelegate.color != color;
}
