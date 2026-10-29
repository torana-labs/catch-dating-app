import 'package:catch_dating_app/contexts/events/domain/event_itinerary.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('round-trips break entries and resolves offsets from event start', () {
    const item = EventItineraryItem(
      id: 'water-stop',
      kind: EventItineraryKind.breakTime,
      offsetMinutes: 35,
      durationMinutes: 5,
      title: 'Water stop',
    );

    final json = item.toJson();
    final restored = EventItineraryItem.fromJson(json);

    expect(json['kind'], 'break');
    expect(restored, item);
    expect(
      restored.startsAt(DateTime(2026, 8, 25, 6)),
      DateTime(2026, 8, 25, 6, 35),
    );
  });
}
