import 'package:catch_dating_app/contexts/events/data/organizer_moments_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/organizer_moment.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

class _Functions extends Fake implements FirebaseFunctions {}

Map<String, Object?> _row(String id, {String eventId = 'e1'}) => {
  'momentId': id,
  'scopeKind': 'event',
  'scopeId': eventId,
  'programId': null,
  'eventId': eventId,
  'moment': {
    'momentId': id,
    'scope': {
      'kind': 'event',
      'eventId': eventId,
      'programId': null,
      'organizerId': null,
    },
    'name': 'Starts soon $id',
    'initiation': {
      'kind': 'anchored',
      'atMillis': null,
      'anchorKind': 'scopeStart',
      'anchorId': null,
      'offsetMinutes': -60,
      'offsetDays': 0,
      'offsetMonths': 0,
      'triggerKind': null,
      'functionId': null,
    },
    'sense': 'individual',
    'audience': {
      'kind': 'eventParticipants',
      'statuses': ['signedUp'],
    },
    'action': {
      'kind': 'push',
      'notificationType': 'eventReminder',
      'preferenceKey': 'eventReminders',
    },
    'status': 'armed',
    'approval': {'approvedByUid': 'host-1', 'approvedAtMillis': 1},
    'origin': 'organizer',
    'revision': 2,
  },
  'plan': {
    'anchor': {'kind': 'date', 'id': null},
    'sentCount': 4,
    'nextRunAtMillis': null,
  },
  'version': 1,
};

void main() {
  test('an event lists its own moments, by id, live', () async {
    final firestore = FakeFirebaseFirestore();
    final views = firestore.collection('organizerMomentViews');
    await views.doc('m2').set(_row('m2'));
    await views.doc('m9').set(_row('m9', eventId: 'e2'));
    final repository = FirebaseOrganizerMomentsRepository(
      _Functions(),
      firestore,
    );
    final seen = <List<String>>[];
    final subscription = repository
        .watchMoments(const OrganizerMomentScope.event('e1'))
        .listen((moments) => seen.add([for (final m in moments) m.momentId]));
    await Future<void>.delayed(const Duration(milliseconds: 30));
    await views.doc('m1').set(_row('m1'));
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(seen.first, ['m2']);
    expect(seen.last, ['m1', 'm2']);
    await subscription.cancel();
  });
}
