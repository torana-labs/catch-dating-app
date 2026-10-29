import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:flutter/painting.dart';

/// Where up to [count] seat markers sit inside a room-map unit of [shape].
/// Round tables ring their edge up to six seats; larger tables and every
/// other shape use the grid order.
List<Alignment> roomSeatAlignments(int count, EventSuccessLayoutShape shape) {
  if (shape == EventSuccessLayoutShape.round) {
    return switch (count) {
      <= 0 => const [],
      1 => const [Alignment.topCenter],
      2 => const [Alignment.centerLeft, Alignment.centerRight],
      3 => const [
        Alignment.topCenter,
        Alignment.bottomLeft,
        Alignment.bottomRight,
      ],
      4 => const [
        Alignment.topLeft,
        Alignment.topRight,
        Alignment.bottomLeft,
        Alignment.bottomRight,
      ],
      5 => const [
        Alignment.topCenter,
        Alignment.topRight,
        Alignment.bottomRight,
        Alignment.bottomLeft,
        Alignment.topLeft,
      ],
      6 => const [
        Alignment(-0.62, -0.78),
        Alignment(0.62, -0.78),
        Alignment.centerRight,
        Alignment(0.62, 0.78),
        Alignment(-0.62, 0.78),
        Alignment.centerLeft,
      ],
      _ => _gridSeatAlignments(count),
    };
  }
  return _gridSeatAlignments(count);
}

List<Alignment> _gridSeatAlignments(int count) => switch (count) {
  <= 0 => const [],
  1 => const [Alignment.topCenter],
  2 => const [Alignment.topLeft, Alignment.topRight],
  3 => const [Alignment.topCenter, Alignment.bottomLeft, Alignment.bottomRight],
  4 => const [
    Alignment.topLeft,
    Alignment.topRight,
    Alignment.bottomLeft,
    Alignment.bottomRight,
  ],
  5 => const [
    Alignment.topCenter,
    Alignment.centerLeft,
    Alignment.centerRight,
    Alignment.bottomLeft,
    Alignment.bottomRight,
  ],
  6 => const [
    Alignment.topLeft,
    Alignment.topRight,
    Alignment.centerLeft,
    Alignment.centerRight,
    Alignment.bottomLeft,
    Alignment.bottomRight,
  ],
  7 => const [
    Alignment.topLeft,
    Alignment.topCenter,
    Alignment.topRight,
    Alignment.centerLeft,
    Alignment.centerRight,
    Alignment.bottomLeft,
    Alignment.bottomRight,
  ],
  _ => const [
    Alignment.topLeft,
    Alignment.topCenter,
    Alignment.topRight,
    Alignment.centerLeft,
    Alignment.centerRight,
    Alignment.bottomLeft,
    Alignment.bottomCenter,
    Alignment.bottomRight,
  ],
};
