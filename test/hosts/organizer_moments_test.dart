import 'package:catch_dating_app/contexts/events/domain/organizer_moment.dart';
import 'package:flutter_test/flutter_test.dart';

Map<Object?, Object?> momentMap({
  Map<Object?, Object?>? scope,
  Map<Object?, Object?>? initiation,
  Map<Object?, Object?>? audience,
  Map<Object?, Object?>? action,
  String status = 'draft',
  Object? approval,
  String origin = 'organizer',
}) => {
  'momentId': 'moment_1',
  'scope': scope ?? {'kind': 'event', 'eventId': 'event_1'},
  'name': 'Airport pickup nudge',
  'initiation': initiation ?? {'kind': 'manual'},
  'sense': 'audience',
  'audience':
      audience ??
      {
        'kind': 'eventParticipants',
        'statuses': ['signedUp'],
      },
  'action':
      action ??
      {
        'kind': 'push',
        'notificationType': 'moment',
        'preferenceKey': 'moments',
      },
  'status': status,
  'approval': ?approval,
  'origin': origin,
  'revision': 3,
};

void main() {
  group('OrganizerMomentScope', () {
    test('round-trips an event scope', () {
      const scope = OrganizerMomentScope.event('event_1');
      final parsed = OrganizerMomentScope.fromMap(scope.toJson());
      expect(parsed.kind, OrganizerMomentScopeKind.event);
      expect(parsed.scopeId, 'event_1');
      expect(parsed.programId, isNull);
      expect(scope.toJson(), {'kind': 'event', 'eventId': 'event_1'});
    });

    test('round-trips a program scope', () {
      const scope = OrganizerMomentScope.program('program_1');
      final parsed = OrganizerMomentScope.fromMap(scope.toJson());
      expect(parsed.kind, OrganizerMomentScopeKind.program);
      expect(parsed.scopeId, 'program_1');
      expect(parsed.eventId, isNull);
      expect(scope.toJson(), {'kind': 'program', 'programId': 'program_1'});
    });
  });

  group('OrganizerMoment.fromCallableData', () {
    test('parses a full armed definition with approval', () {
      final moment = OrganizerMoment.fromCallableData(
        momentMap(
          initiation: {
            'kind': 'anchored',
            'anchorKind': 'functionStart',
            'anchorId': 'fn_baraat',
            'offsetMinutes': -90,
          },
          audience: {
            'kind': 'functionGuests',
            'functionId': 'fn_baraat',
            'rsvp': ['attending', 'maybe'],
            'householdDedupe': true,
            'rsvpPendingOnly': false,
            'travelTimeLead': true,
          },
          action: {
            'kind': 'sendTemplate',
            'connectionId': 'conn_1',
            'templateId': 'tpl_1',
            'variables': {'venue': 'Taj'},
          },
          status: 'armed',
          approval: {
            'approvedByUid': 'uid_1',
            'approvedAtMillis': 1800000000000,
          },
        ),
      );

      expect(moment.momentId, 'moment_1');
      expect(moment.name, 'Airport pickup nudge');
      expect(moment.status, OrganizerMomentStatus.armed);
      expect(moment.revision, 3);
      expect(moment.origin, OrganizerMomentOrigin.organizer);
      expect(moment.approval?.approvedByUid, 'uid_1');
      expect(moment.approval?.approvedAtMillis, 1800000000000);

      expect(moment.initiation.kind, OrganizerMomentInitiationKind.anchored);
      expect(
        moment.initiation.anchorKind,
        OrganizerMomentAnchorKind.functionStart,
      );
      expect(moment.initiation.anchorId, 'fn_baraat');
      expect(moment.initiation.offsetMinutes, -90);

      expect(moment.audience.kind, OrganizerMomentAudienceKind.functionGuests);
      expect(moment.audience.functionId, 'fn_baraat');
      expect(moment.audience.rsvp, [
        OrganizerMomentRsvpState.attending,
        OrganizerMomentRsvpState.maybe,
      ]);
      expect(moment.audience.householdDedupe, isTrue);
      expect(moment.audience.rsvpPendingOnly, isFalse);
      expect(moment.audience.travelTimeLead, isTrue);
      expect(moment.audience.toJson()['travelTimeLead'], isTrue);

      expect(moment.action.kind, OrganizerMomentActionKind.sendTemplate);
      expect(moment.action.templateId, 'tpl_1');
      expect(moment.action.variables, {'venue': 'Taj'});
    });

    test('parses a triggered staff-attention definition', () {
      final moment = OrganizerMoment.fromCallableData(
        momentMap(
          scope: {'kind': 'program', 'programId': 'program_1'},
          initiation: {
            'kind': 'triggered',
            'triggerKind': 'flightDisrupted',
            'functionId': 'fn_reception',
          },
          audience: {'kind': 'staffDuty', 'duty': 'dispatch'},
          action: {
            'kind': 'staffAttention',
            'duty': 'dispatch',
            'severity': 'urgent',
            'titleTemplate': 'Flight delayed for {guest}',
          },
        ),
      );

      expect(moment.scope.kind, OrganizerMomentScopeKind.program);
      expect(moment.scope.scopeId, 'program_1');
      expect(
        moment.initiation.triggerKind,
        OrganizerMomentTriggerKind.flightDisrupted,
      );
      expect(moment.audience.duty, 'dispatch');
      expect(moment.action.severity, OrganizerMomentAttentionSeverity.urgent);
      expect(moment.action.titleTemplate, 'Flight delayed for {guest}');
    });

    test('tolerates absent optional fields', () {
      final moment = OrganizerMoment.fromCallableData(momentMap());
      expect(moment.approval, isNull);
      expect(moment.initiation.atMillis, isNull);
      expect(moment.initiation.anchorKind, isNull);
      expect(moment.audience.rsvp, isEmpty);
      expect(moment.audience.scopeIds, isEmpty);
      expect(moment.action.variables, isEmpty);
      expect(moment.action.severity, isNull);
    });

    test('round-trips initiation, audience, and action losslessly', () {
      final initiation = OrganizerMomentInitiation.fromMap(const {
        'kind': 'scheduled',
        'atMillis': 1800000000000,
      });
      expect(initiation.toJson(), {
        'kind': 'scheduled',
        'atMillis': 1800000000000,
      });

      final audience = OrganizerMomentAudience.fromMap(const {
        'kind': 'households',
        'scopeIds': ['hh_1', 'hh_2'],
        'rsvpPendingOnly': true,
      });
      expect(audience.toJson(), {
        'kind': 'households',
        'scopeIds': const ['hh_1', 'hh_2'],
        'rsvpPendingOnly': true,
      });

      final action = OrganizerMomentAction.fromMap(const {
        'kind': 'staffAttention',
        'duty': 'hotel',
        'severity': 'warning',
      });
      expect(action.toJson(), {
        'kind': 'staffAttention',
        'duty': 'hotel',
        'severity': 'warning',
      });
    });

    test('rejects malformed payloads', () {
      expect(
        () => OrganizerMoment.fromCallableData(null),
        throwsFormatException,
      );
      expect(
        () => OrganizerMoment.fromCallableData(
          momentMap(initiation: {'kind': 'surprise'}),
        ),
        throwsA(isA<Error>()),
      );
      expect(
        () =>
            OrganizerMoment.fromCallableData({...momentMap()..remove('name')}),
        throwsFormatException,
      );
    });
  });

  group('lifecycle predicates', () {
    test('draft moments can arm and revise but not run', () {
      final moment = OrganizerMoment.fromCallableData(momentMap());
      expect(moment.canArm, isTrue);
      expect(moment.canPause, isFalse);
      expect(moment.canResume, isFalse);
      expect(moment.canRevise, isTrue);
      expect(moment.canRun, isFalse);
    });

    test('armed manual moments can pause and run', () {
      final moment = OrganizerMoment.fromCallableData(
        momentMap(status: 'armed'),
      );
      expect(moment.canArm, isFalse);
      expect(moment.canPause, isTrue);
      expect(moment.canRun, isTrue);
    });

    test('armed non-manual moments cannot run manually', () {
      final moment = OrganizerMoment.fromCallableData(
        momentMap(
          status: 'armed',
          initiation: {'kind': 'scheduled', 'atMillis': 1800000000000},
        ),
      );
      expect(moment.canPause, isTrue);
      expect(moment.canRun, isFalse);
    });

    test('paused moments resume; done moments accept no actions', () {
      final paused = OrganizerMoment.fromCallableData(
        momentMap(status: 'paused'),
      );
      expect(paused.canResume, isTrue);
      expect(paused.canRun, isFalse);
      expect(paused.canRevise, isTrue);

      final done = OrganizerMoment.fromCallableData(momentMap(status: 'done'));
      expect(done.canArm, isFalse);
      expect(done.canPause, isFalse);
      expect(done.canResume, isFalse);
      expect(done.canRun, isFalse);
      expect(done.canRevise, isFalse);
    });
  });
}
