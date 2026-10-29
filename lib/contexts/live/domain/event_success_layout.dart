import 'dart:math' as math;

enum EventSuccessLayoutShape {
  round('round'),
  rect('rect'),
  row('row'),
  court('court'),
  zone('zone');

  const EventSuccessLayoutShape(this.wireName);

  factory EventSuccessLayoutShape.fromWireName(String value) =>
      values.firstWhere((shape) => shape.wireName == value);

  final String wireName;
}

final class EventSuccessLayoutUnit {
  const EventSuccessLayoutUnit({
    required this.id,
    required this.label,
    required this.shape,
    required this.capacity,
    required this.gridX,
    required this.gridY,
    required this.order,
  });

  factory EventSuccessLayoutUnit.fromJson(Map<String, dynamic> json) =>
      EventSuccessLayoutUnit(
        id: json['id'] as String,
        label: json['label'] as String,
        shape: EventSuccessLayoutShape.fromWireName(json['shape'] as String),
        capacity: json['capacity'] as int,
        gridX: json['gridX'] as int,
        gridY: json['gridY'] as int,
        order: json['order'] as int,
      );

  final String id;
  final String label;
  final EventSuccessLayoutShape shape;
  final int capacity;
  final int gridX;
  final int gridY;
  final int order;

  Map<String, Object?> toJson() => {
    'id': id,
    'label': label,
    'shape': shape.wireName,
    'capacity': capacity,
    'gridX': gridX,
    'gridY': gridY,
    'order': order,
  };
}

final class EventSuccessLayout {
  const EventSuccessLayout({
    required this.layoutId,
    required this.label,
    required this.units,
  });

  factory EventSuccessLayout.fromJson(
    Map<String, dynamic> json,
  ) => EventSuccessLayout(
    layoutId: json['layoutId'] as String,
    label: json['label'] as String,
    units: (json['units'] as List<dynamic>)
        .whereType<Map>()
        .map(
          (unit) =>
              EventSuccessLayoutUnit.fromJson(Map<String, dynamic>.from(unit)),
        )
        .toList(growable: false),
  );

  /// Creates a coarse reusable layout from editable topology parameters.
  factory EventSuccessLayout.parametric({
    required String label,
    required EventSuccessLayoutShape shape,
    required int unitCount,
    required int unitCapacity,
    required int columnCount,
    String layoutId = 'draft',
  }) {
    if (unitCount < 1 || unitCount > 200) {
      throw RangeError.range(unitCount, 1, 200, 'unitCount');
    }
    if (unitCapacity < 1 || unitCapacity > 1000) {
      throw RangeError.range(unitCapacity, 1, 1000, 'unitCapacity');
    }
    if (columnCount < 1 || columnCount > 200) {
      throw RangeError.range(columnCount, 1, 200, 'columnCount');
    }
    final columns = math.min(columnCount, unitCount);
    return EventSuccessLayout(
      layoutId: layoutId,
      label: label.trim(),
      units: [
        for (var index = 0; index < unitCount; index++)
          EventSuccessLayoutUnit(
            id: '${shape.wireName}-${index + 1}',
            label: '${index + 1}',
            shape: shape,
            capacity: unitCapacity,
            gridX: index % columns,
            gridY: index ~/ columns,
            order: index + 1,
          ),
      ],
    );
  }

  final String layoutId;
  final String label;
  final List<EventSuccessLayoutUnit> units;

  Map<String, Object?> toJson() => {
    'layoutId': layoutId,
    'label': label,
    'units': units.map((unit) => unit.toJson()).toList(growable: false),
  };
}

final class NormalizedEventSuccessLayoutUnit {
  const NormalizedEventSuccessLayoutUnit({
    required this.id,
    required this.left,
    required this.top,
    required this.width,
    required this.height,
  });

  final String id;
  final double left;
  final double top;
  final double width;
  final double height;

  Map<String, Object?> toJson() => {
    'id': id,
    'left': left,
    'top': top,
    'width': width,
    'height': height,
  };
}

List<NormalizedEventSuccessLayoutUnit> normalizeEventSuccessLayoutUnits(
  Iterable<EventSuccessLayoutUnit> units,
) {
  final stableUnits = units.toList()
    ..sort(
      (a, b) => a.order.compareTo(b.order) != 0
          ? a.order.compareTo(b.order)
          : a.id.compareTo(b.id),
    );
  if (stableUnits.isEmpty) return const [];
  final columns = stableUnits.map((unit) => unit.gridX).reduce(math.max) + 1;
  final rows = stableUnits.map((unit) => unit.gridY).reduce(math.max) + 1;
  return [
    for (final unit in stableUnits)
      NormalizedEventSuccessLayoutUnit(
        id: unit.id,
        left: _rounded(unit.gridX / columns),
        top: _rounded(unit.gridY / rows),
        width: _rounded(1 / columns),
        height: _rounded(1 / rows),
      ),
  ];
}

double _rounded(num value) => (value * 1000000).roundToDouble() / 1000000;

enum EventSuccessSpatialScope { thisRound, pinned }

enum EventSuccessSpatialAction {
  previewReassignment,
  reassign,
  confirmPosition,
  releasePinned,
}

enum EventSuccessSpatialDestinationReason {
  capacity,
  safetyKeepApart,
  declaredConstraint,
}

final class EventSuccessSpatialDestination {
  const EventSuccessSpatialDestination({
    required this.unitId,
    required this.valid,
    required this.reason,
    required this.recommendedScope,
  });

  factory EventSuccessSpatialDestination.fromJson(Map<String, dynamic> json) =>
      EventSuccessSpatialDestination(
        unitId: json['unitId'] as String,
        valid: json['valid'] as bool,
        reason: switch (json['reason']) {
          'capacity' => EventSuccessSpatialDestinationReason.capacity,
          'safetyKeepApart' =>
            EventSuccessSpatialDestinationReason.safetyKeepApart,
          'declaredConstraint' =>
            EventSuccessSpatialDestinationReason.declaredConstraint,
          _ => null,
        },
        recommendedScope: switch (json['recommendedScope']) {
          'thisRound' => EventSuccessSpatialScope.thisRound,
          'pinned' => EventSuccessSpatialScope.pinned,
          _ => null,
        },
      );

  final String unitId;
  final bool valid;
  final EventSuccessSpatialDestinationReason? reason;
  final EventSuccessSpatialScope? recommendedScope;
}

final class EventSuccessSpatialActionResult {
  const EventSuccessSpatialActionResult({
    required this.revision,
    required this.destinations,
  });

  factory EventSuccessSpatialActionResult.fromJson(Map<String, dynamic> json) =>
      EventSuccessSpatialActionResult(
        revision: json['revision'] as int,
        destinations: (json['destinations'] as List<dynamic>? ?? const [])
            .whereType<Map>()
            .map(
              (destination) => EventSuccessSpatialDestination.fromJson(
                Map<String, dynamic>.from(destination),
              ),
            )
            .toList(growable: false),
      );

  final int revision;
  final List<EventSuccessSpatialDestination> destinations;
}
