import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> _layout({
  required String layoutId,
  String label = 'Hall',
}) => {
  'organizerId': 'organizer-1',
  'layoutId': layoutId,
  'label': label,
  'units': [
    {
      'id': 'table-1',
      'label': '1',
      'shape': 'round',
      'capacity': 6,
      'gridX': 0,
      'gridY': 0,
      'order': 1,
    },
  ],
};

void main() {
  late FakeFirebaseFirestore db;
  late EventSuccessRepository repository;

  setUp(() {
    db = FakeFirebaseFirestore();
    repository = EventSuccessRepository(db);
  });

  test('reads the selected layout straight from the organizer asset', () async {
    await db
        .collection('organizerEventSuccessLayouts')
        .doc('organizer-1_hall')
        .set(_layout(layoutId: 'hall'));

    final layout = await repository
        .watchSelectedOrganizerLayout(
          organizerId: 'organizer-1',
          layoutId: 'hall',
        )
        .first;

    expect(layout?.layoutId, 'hall');
    expect(layout?.units.single.id, 'table-1');
  });

  test('a missing or mismatched layout reads as unselected', () async {
    await db
        .collection('organizerEventSuccessLayouts')
        .doc('organizer-1_hall')
        .set(_layout(layoutId: 'other'));

    expect(
      await repository
          .watchSelectedOrganizerLayout(
            organizerId: 'organizer-1',
            layoutId: 'hall',
          )
          .first,
      isNull,
    );
    expect(
      await repository
          .watchSelectedOrganizerLayout(
            organizerId: 'organizer-1',
            layoutId: 'missing',
          )
          .first,
      isNull,
    );
  });
}
