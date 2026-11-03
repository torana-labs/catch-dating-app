import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence_derivation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_presence_policy.dart';
import 'package:flutter_test/flutter_test.dart';

const _start = 1000000;

EventAttendee _attendee(
  String id, {
  String? linkedUid,
  String displayName = 'Guest',
  EventAttendeeStatus status = EventAttendeeStatus.checkedIn,
  int? checkedInAt,
  EventAttendeeSource source = EventAttendeeSource.catchBooking,
}) => EventAttendee(
  id: id,
  eventId: 'event-1',
  organizerId: 'org-1',
  displayName: displayName,
  searchName: displayName.toLowerCase(),
  source: source,
  status: status,
  linkedUid: linkedUid,
  checkedInAt: checkedInAt == null
      ? null
      : DateTime.fromMillisecondsSinceEpoch(checkedInAt),
  createdAt: DateTime.fromMillisecondsSinceEpoch(1),
  updatedAt: DateTime.fromMillisecondsSinceEpoch(1),
);

EventSuccessAssignmentDraft _draft(
  String uid, {
  required int roundIndex,
  required int baseAssignmentRevision,
}) => EventSuccessAssignmentDraft(
  id: 'event-1_guided_rotations_$uid',
  eventId: 'event-1',
  roundIndex: roundIndex,
  baseAssignmentRevision: baseAssignmentRevision,
  assignment: EventSuccessAssignment(
    id: 'event-1_guided_rotations_$uid',
    eventId: 'event-1',
    organizerId: 'org-1',
    uid: uid,
    moduleId: 'guided_rotations',
    label: 'Table 1',
    displayTitle: 'Table 1',
    peerUids: const [],
    source: 'server',
    createdAt: DateTime.fromMillisecondsSinceEpoch(1),
    updatedAt: DateTime.fromMillisecondsSinceEpoch(1),
  ),
);

void main() {
  test('the policy constant carries the catalog values', () {
    final catalog =
        jsonDecode(
              File(
                'contracts/catalogs/event_success_presence_policy.json',
              ).readAsStringSync(),
            )
            as Map<String, Object?>;
    expect(
      eventSuccessPresencePolicy.heartbeatIntervalSeconds,
      catalog['heartbeatIntervalSeconds'],
    );
    expect(
      eventSuccessPresencePolicy.presentWindowSeconds,
      catalog['presentWindowSeconds'],
    );
    expect(
      eventSuccessPresencePolicy.likelyDepartedAfterSeconds,
      catalog['likelyDepartedAfterSeconds'],
    );
  });

  test('state observes the server boundaries on the app clock', () {
    EventSuccessPresenceState at(int now) =>
        deriveEventSuccessPresenceState(heartbeatAtMillis: 0, nowMillis: now);
    expect(at(90000), EventSuccessPresenceState.present);
    expect(at(90001), EventSuccessPresenceState.idle);
    expect(at(300000), EventSuccessPresenceState.idle);
    expect(at(300001), EventSuccessPresenceState.likelyDeparted);
    expect(at(-5), EventSuccessPresenceState.present);
  });

  group('the summary', () {
    EventSuccessPresenceSummary summary({
      int published = 0,
      int draftRevision = 4,
      List<EventSuccessPresenceHeartbeatRow> heartbeats = const [],
      List<EventAttendee> roster = const [],
      List<EventSuccessAssignmentDraft> drafts = const [],
      List<EventSuccessLateArrivalPlacementRow> placements = const [],
      int now = _start + 400000,
    }) => deriveEventSuccessPresenceSummary(
      plan: (
        liveControlRevision: 7,
        publishedRotationRoundIndex: published,
        assignmentDraftRevision: draftRevision,
      ),
      heartbeats: heartbeats,
      roster: roster,
      drafts: drafts,
      placements: placements,
      eventStartMillis: _start,
      nowMillis: now,
    );

    test('lists heartbeats of checked-in guests by uid with roster names', () {
      final result = summary(
        heartbeats: [
          (uid: 'b', heartbeatAtMillis: _start + 390000),
          (uid: 'a', heartbeatAtMillis: _start),
          (uid: 'stranger', heartbeatAtMillis: _start),
          (uid: 'registered', heartbeatAtMillis: _start),
        ],
        roster: [
          _attendee(
            'row-a',
            linkedUid: 'a',
            displayName: '  Ari  ',
            checkedInAt: _start - 1,
          ),
          _attendee(
            'row-b',
            linkedUid: 'b',
            displayName: ' ',
            checkedInAt: _start - 1,
            source: EventAttendeeSource.hostImport,
          ),
          _attendee(
            'row-r',
            linkedUid: 'registered',
            status: EventAttendeeStatus.registered,
          ),
          _attendee('row-unlinked', checkedInAt: _start - 1),
        ],
      );
      expect(result.liveControlRevision, 7);
      expect(result.nextRoundIndex, 1);
      expect(result.policy.heartbeatIntervalSeconds, 30);
      expect(result.entries.map((e) => e.uid), ['a', 'b']);
      expect(result.entries.map((e) => e.displayName), ['Ari', 'Guest']);
      expect(result.entries.map((e) => e.state), [
        EventSuccessPresenceState.likelyDeparted,
        EventSuccessPresenceState.present,
      ]);
      expect(result.likelyDeparted.single.uid, 'a');
    });

    test('late arrivals exclude current drafts and placements for the next '
        'round', () {
      final result = summary(
        published: 1,
        roster: [
          _attendee('row-1', linkedUid: 'early', checkedInAt: _start),
          _attendee('row-2', linkedUid: 'late-b', checkedInAt: _start + 20),
          _attendee('row-3', linkedUid: 'late-a', checkedInAt: _start + 20),
          _attendee('row-4', linkedUid: 'late-c', checkedInAt: _start + 10),
          _attendee('row-5', linkedUid: 'drafted', checkedInAt: _start + 5),
          _attendee('row-6', linkedUid: 'old-draft', checkedInAt: _start + 6),
          _attendee('row-7', linkedUid: 'placed', checkedInAt: _start + 7),
          _attendee(
            'row-8',
            linkedUid: 'placed-before',
            checkedInAt: _start + 8,
          ),
        ],
        drafts: [
          _draft('drafted', roundIndex: 2, baseAssignmentRevision: 4),
          _draft('old-draft', roundIndex: 2, baseAssignmentRevision: 3),
        ],
        placements: [
          (uid: 'placed', targetRoundIndex: 2),
          (uid: 'placed-before', targetRoundIndex: 1),
        ],
      );
      expect(result.nextRoundIndex, 2);
      expect(result.lateArrivals.map((c) => c.uid), [
        'old-draft',
        'placed-before',
        'late-c',
        'late-a',
        'late-b',
      ]);
    });

    test('a guest linked to two rows counts once, at the earlier check-in', () {
      final result = summary(
        roster: [
          _attendee(
            'row-1',
            linkedUid: 'twice',
            checkedInAt: _start + 50,
            displayName: 'Later',
          ),
          _attendee(
            'row-2',
            linkedUid: 'twice',
            checkedInAt: _start + 40,
            displayName: 'Earlier',
          ),
        ],
      );
      expect(result.lateArrivals.single.displayName, 'Earlier');
      expect(result.lateArrivals.single.checkedInAtMillis, _start + 40);
    });

    test('the last scheduled round leaves nothing to prepare', () {
      expect(() => summary(published: 100), throwsFormatException);
    });
  });
}
