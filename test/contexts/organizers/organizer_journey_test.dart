import 'package:catch_dating_app/contexts/organizers/data/organizer_journey_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_journey.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _view(
  String organizerId,
  String uid, {
  bool waitingClaim = false,
}) => {
  'organizerId': organizerId,
  'uid': uid,
  'waitingClaim': waitingClaim,
  'journey': {
    'organizerId': organizerId,
    'organizerName': 'Moonmoth',
    'waitingClaim': waitingClaim,
    'steps': [
      {'kind': 'listed', 'atMillis': 1761609600000, 'detail': null},
    ],
    'next': 'runYourPage',
  },
  'version': 1,
};

void main() {
  test('a journey reads its steps and what comes next', () {
    final journey = OrganizerJourney.fromJson({
      'organizerId': 'moonmoth',
      'organizerName': 'Moonmoth',
      'waitingClaim': true,
      'steps': [
        {
          'kind': 'nominated',
          'atMillis': 1761609600000,
          'detail': 'https://luma.com/moonmoth',
        },
        {'kind': 'listed', 'atMillis': null, 'detail': null},
      ],
      'next': 'runYourPage',
    });
    expect(journey.waitingClaim, isTrue);
    expect(journey.steps.first.kind, OrganizerJourneyStepKind.nominated);
    expect(journey.steps.last.at, isNull);
    expect(journey.next, OrganizerJourneyNext.runYourPage);
  });

  test('an organizer that has run an event has nothing next', () {
    expect(OrganizerJourneyNext.fromWire(null), isNull);
  });

  test('a host reads their own view of one organizer', () async {
    final db = FakeFirebaseFirestore();
    final repository = OrganizerJourneyRepository(db);
    expect(await repository.watchOrganizer('moonmoth', 'host').first, isEmpty);
    await db
        .collection('hostOrganizerJourneyViews')
        .doc('moonmoth_host')
        .set(_view('moonmoth', 'host'));
    final journeys = await repository.watchOrganizer('moonmoth', 'host').first;
    expect(journeys.single.organizerName, 'Moonmoth');
    expect(journeys.single.waitingClaim, isFalse);
  });

  test('someone waiting lists only their waiting pages', () async {
    final db = FakeFirebaseFirestore();
    final views = db.collection('hostOrganizerJourneyViews');
    await views
        .doc('moonmoth_me')
        .set(_view('moonmoth', 'me', waitingClaim: true));
    await views.doc('lantern_me').set(_view('lantern', 'me'));
    await views
        .doc('moonmoth_other')
        .set(_view('moonmoth', 'other', waitingClaim: true));
    final waiting = await OrganizerJourneyRepository(
      db,
    ).watchWaiting('me').first;
    expect(waiting.map((journey) => journey.organizerId), ['moonmoth']);
  });

  test('a view for someone else is rejected', () async {
    final db = FakeFirebaseFirestore();
    await db
        .collection('hostOrganizerJourneyViews')
        .doc('moonmoth_host')
        .set(_view('moonmoth', 'other'));
    await expectLater(
      OrganizerJourneyRepository(db).watchOrganizer('moonmoth', 'host').first,
      throwsA(anything),
    );
  });
}
