import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/foundation.dart';

/// A [CatchMapPin] at rest, or [selected]: a larger dot with its label on
/// the event colour.
enum CatchMapPinStatus { regular, selected }

/// A point on a [CatchPinMap], in percent: [x] across and [y] down, each from
/// 0 to 100.
@immutable
class CatchMapPoint {
  const CatchMapPoint({required this.x, required this.y})
    : assert(x >= 0 && x <= 100, 'x is a percent of the width.'),
      assert(y >= 0 && y <= 100, 'y is a percent of the height.');

  final double x;
  final double y;
}

/// One pin on a [CatchPinMap]: a dot in the [format] colour at percent [x]
/// and [y], with an optional [label] beside it.
@immutable
class CatchMapPin {
  const CatchMapPin({
    required this.x,
    required this.y,
    this.label,
    this.format = CatchFormat.run,
    this.status = CatchMapPinStatus.regular,
  }) : assert(x >= 0 && x <= 100, 'x is a percent of the width.'),
       assert(y >= 0 && y <= 100, 'y is a percent of the height.');

  final double x;
  final double y;

  /// A short name beside the dot: "The Bombay Canteen", "Start".
  final String? label;
  final CatchFormat format;
  final CatchMapPinStatus status;
}
