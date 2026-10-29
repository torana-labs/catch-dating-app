import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final catalog =
      jsonDecode(
            File(
              'contracts/catalogs/event_success_layout.json',
            ).readAsStringSync(),
          )
          as Map<String, dynamic>;
  final fixture = Map<String, dynamic>.from(catalog['parityFixture'] as Map);

  test('normalizes the shared all-shapes room-map fixture identically', () {
    final layout = EventSuccessLayout.fromJson(fixture);
    expect(
      layout.units.map((unit) => unit.shape.wireName).toSet(),
      (catalog['shapes'] as List<dynamic>).whereType<String>().toSet(),
    );
    expect(
      normalizeEventSuccessLayoutUnits(
        layout.units,
      ).map((unit) => unit.toJson()).toList(),
      fixture['normalizedUnits'],
    );
  });

  test('parametric authoring configures every supported shape', () {
    for (final shape in EventSuccessLayoutShape.values) {
      final layout = EventSuccessLayout.parametric(
        label: '${shape.wireName} room',
        shape: shape,
        unitCount: 7,
        unitCapacity: 9,
        columnCount: 3,
      );
      expect(layout.units, hasLength(7));
      expect(layout.units.every((unit) => unit.shape == shape), isTrue);
      expect(layout.units.every((unit) => unit.capacity == 9), isTrue);
      expect(layout.units.last.gridX, 0);
      expect(layout.units.last.gridY, 2);
    }
  });
}
