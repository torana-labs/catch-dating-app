import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_planner_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_message_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

class _Functions extends Fake implements FirebaseFunctions {}

final _now = DateTime.utc(2026, 11, 20, 10);
final _hour = _now.add(const Duration(hours: 1)).millisecondsSinceEpoch;

Map<String, Object?> _row(
  String id, {
  String status = 'armed',
  int sent = 0,
  int? next,
  String scopeKind = 'program',
  String programId = 'p1',
}) => {
  'momentId': id,
  'scopeKind': scopeKind,
  'scopeId': programId,
  'programId': scopeKind == 'program' ? programId : null,
  'eventId': scopeKind == 'event' ? programId : null,
  'moment': {
    'momentId': id,
    'scope': {
      'kind': 'program',
      'eventId': null,
      'programId': programId,
      'organizerId': null,
    },
    'name': id,
    'initiation': {'kind': 'scheduled', 'atMillis': 5000},
    'sense': 'audience',
    'audience': {'kind': 'households', 'rsvpPendingOnly': false},
    'action': {
      'kind': 'sendTemplate',
      'connectionId': 'wa-1',
      'templateId': 'program_get_ready',
      'variables': <String, String>{},
    },
    'status': status,
    'approval': null,
    'origin': 'organizer',
    'revision': 1,
  },
  'plan': {
    'anchor': {'kind': 'date', 'id': null},
    'sentCount': sent,
    'nextRunAtMillis': next,
  },
  'version': 1,
};

Map<String, Object?> _access(
  Map<String, int> duties, {
  String role = 'staff',
}) => {
  'programId': 'p1',
  'organizerId': 'o1',
  'uid': 'u1',
  'ownerUid': 'owner',
  'role': role,
  'status': 'active',
  'activeFromMillis': 0,
  'expiresAtMillis': role == 'manager' ? null : _hour,
  'duties': duties,
  'pickupAll': <String, int>{},
  'pickupScoped': <String, int>{},
  'hotelAll': <String, int>{},
  'hotelScoped': <String, int>{},
  'functionAll': <String, int>{},
  'functionScoped': <String, int>{},
  'workPickup': <String, int>{},
  'workHotel': <String, int>{},
  'workFunction': <String, int>{},
  'arrivalRoutes': <String, int>{},
  'tripRoutes': <String, int>{},
  'assignments': <Map<String, Object?>>[],
  'grantExpiresAtMillis': role == 'manager' ? null : _hour,
  'revision': 1,
  'version': 1,
};

void main() {
  test('the board state is worked out from the rows as the callable did', () {
    final messages = ProgramPlannedMessages.fromViews([
      _row('save-date', status: 'done', sent: 118),
      _row('itinerary', next: 9000),
      _row('sangeet', next: 12000),
      _row('tie-b', next: 15000, status: 'paused'),
      _row('reply-chase', status: 'draft'),
      _row('nothing-left', sent: 3),
      _row('never-sent', status: 'done'),
    ]);
    final states = {
      for (final message in messages.messages) message.momentId: message.state,
    };
    expect(states, {
      'save-date': ProgramMessageState.sent,
      'itinerary': ProgramMessageState.next,
      'sangeet': ProgramMessageState.planned,
      'tie-b': ProgramMessageState.paused,
      'reply-chase': ProgramMessageState.draft,
      'nothing-left': ProgramMessageState.sent,
      'never-sent': ProgramMessageState.done,
    });
    expect(messages.next?.momentId, 'itinerary');
    expect(
      messages.messages
          .firstWhere((message) => message.momentId == 'save-date')
          .sentCount,
      118,
    );
  });

  test('equal next runs break on the moment id', () {
    final messages = ProgramPlannedMessages.fromViews([
      _row('b', next: 9000),
      _row('a', next: 9000),
    ]);
    expect(messages.next?.momentId, 'a');
  });

  Future<ProgramPlannerRepository> repository(
    Map<String, Object?> access,
  ) async {
    final firestore = FakeFirebaseFirestore();
    await firestore.collection('programAccessViews').doc('p1__u1').set(access);
    final views = firestore.collection('organizerMomentViews');
    await views.doc('m1').set(_row('m1', next: 9000));
    await views.doc('m2').set(_row('m2', programId: 'p2'));
    await views.doc('m3').set(_row('m3', scopeKind: 'event'));
    final clock = AppClock.custom(() => _now);
    return ProgramPlannerRepository(
      _Functions(),
      firestore,
      ProgramAccessRepository(firestore, clock),
    );
  }

  test('the communications duty reads its programme\'s rows only', () async {
    final planner = await repository(_access({'communications': _hour}));
    final messages = await planner.watchMessages('p1', 'u1').first;
    expect(messages.messages.map((message) => message.momentId), ['m1']);
    final owner = await repository(_access(const {}, role: 'manager'));
    expect(
      (await owner.watchMessages('p1', 'u1').first).messages,
      hasLength(1),
    );
  });

  test('another duty, or an ended one, is denied', () async {
    final desk = await repository(_access({'hotelDesk': _hour}));
    await expectLater(
      desk.watchMessages('p1', 'u1'),
      emitsError(isA<PermissionException>()),
    );
    final gone = _now
        .subtract(const Duration(seconds: 1))
        .millisecondsSinceEpoch;
    final ended = await repository({
      ..._access({'communications': gone}),
      'expiresAtMillis': gone,
    });
    await expectLater(
      ended.watchMessages('p1', 'u1'),
      emitsError(isA<PermissionException>()),
    );
  });
}
