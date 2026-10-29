import 'package:catch_dating_app/contexts/live/domain/event_attendance_disposition.dart';
import 'package:catch_dating_app/contexts/live/domain/event_attendance_report.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_attendance_report_fixtures.dart';

void main() {
  void reject(Map<String, Object?> patch) =>
      expect(() => reportView(viewPatch: patch), throwsFormatException);

  test('a complete read can still contain unresolved attendance', () {
    final report = reportView();
    expect(report.coverage, AttendanceReportCoverage.completeRoster);
    expect(report.closure, isA<AttendanceRuntimeComplete>());
    expect(report.counts.unresolvedTotal, 1);
    expect(report.counts.recordedNoShowTotal, 0);
    expect(report.members.single.scope.eventId, 'event-1');
    expect(report.members.single.scope.organizerId, 'organizer-1');
    expect(report.members.single.scope.attendeeId, 'attendee-1');
    expect(
      report.members.single.classification,
      isA<AttendanceReportUnresolved>().having(
        (v) => v.reason,
        'reason',
        AttendanceReportUnresolvedReason.unreviewed,
      ),
    );
  });

  test('all recorded and unresolved reasons retain independent counts', () {
    final classifications = <Map<String, Object?>>[
      {'kind': 'attended'},
      for (final evidence in ['hostConfirmed', 'guestDeclined'])
        {'kind': 'recordedNoShow', 'evidence': evidence},
      for (final reason in [
        'unreviewed',
        'cleared',
        'sourceChanged',
        'superseded',
      ])
        {'kind': 'unresolved', 'reason': reason},
      for (final reason in ['invited', 'waitlisted', 'cancelled'])
        {'kind': 'notExpected', 'reason': reason},
    ];
    final report = reportView(
      viewPatch: {
        'rosterCount': 10,
        'counts': {
          'attended': 1,
          'recordedNoShow': {'hostConfirmed': 1, 'guestDeclined': 1},
          'unresolved': {
            'unreviewed': 1,
            'cleared': 1,
            'sourceChanged': 1,
            'superseded': 1,
          },
          'notExpected': {
            'invited': 1,
            'waitlisted': 1,
            'cancelled': 1,
            'eventCancelled': 0,
          },
        },
        'members': [
          for (final (index, value) in classifications.indexed)
            reportMember(id: 'a-$index', classification: value),
        ],
      },
    );
    expect(report.counts.total, 10);
    expect(report.counts.attended, 1);
    expect(report.counts.recordedNoShow, (hostConfirmed: 1, guestDeclined: 1));
    expect(report.counts.unresolvedTotal, 4);
    expect(report.counts.notExpectedTotal, 3);
    expect(
      (report.members[2].classification as AttendanceReportRecordedNoShow)
          .evidence,
      AttendanceReportEvidence.guestDeclined,
    );
    expect(
      report.members.map((m) => m.scope.attendeeId).toSet(),
      hasLength(10),
    );
  });

  test('empty roster is different from a completed attendance review', () {
    final empty = {
      'coverage': 'emptyRoster',
      'rosterCount': 0,
      'members': [],
      'counts': reportCounts(unreviewed: 0),
    };
    final report = reportView(viewPatch: empty);
    expect(report.coverage, AttendanceReportCoverage.emptyRoster);
    expect(report.counts.total, 0);
    expect(report.members, isEmpty);
    reject({...empty, 'coverage': 'completeRoster'});
    reject({'coverage': 'emptyRoster'});
    reject({'members': []});
    reject({...empty, 'counts': reportCounts()});
  });

  test('counts must match each bucket, not only the total', () {
    for (final section in ['recordedNoShow', 'unresolved', 'notExpected']) {
      final counts = reportCounts(unreviewed: 0);
      final group = counts[section]! as Map<String, Object?>;
      for (final name in group.keys) {
        if (name == 'unreviewed') continue;
        reject({
          'counts': {
            ...counts,
            section: {...group, name: 1},
          },
        });
      }
    }
    reject({
      'counts': {...reportCounts(unreviewed: 0), 'attended': 1},
    });
    reject({
      'counts': {...reportCounts(), 'attended': 1},
    });
  });

  test(
    'duplicate, partial and oversized rosters cannot masquerade as complete',
    () {
      reject({'rosterCount': 2});
      reject({
        'rosterCount': 2,
        'counts': reportCounts(unreviewed: 2),
        'members': [reportMember(), reportMember()],
      });
      final full = {
        'rosterCount': 1000,
        'counts': reportCounts(unreviewed: 1000),
        'members': [
          for (var i = 0; i < 1000; i++) reportMember(id: 'guest-$i'),
        ],
      };
      expect(reportView(viewPatch: full).members, hasLength(1000));
      reject({
        ...full,
        'rosterCount': 1001,
        'counts': reportCounts(unreviewed: 1001),
        'members': [
          for (var i = 0; i < 1001; i++) reportMember(id: 'guest-$i'),
        ],
      });
    },
  );

  test('closure uses the same typed evidence as individual closeout', () {
    expect(
      reportView(
        viewPatch: {
          'closure': {'kind': 'open'},
        },
      ).closure,
      isA<AttendanceStillOpen>(),
    );
    expect(
      reportView(
        viewPatch: {
          'closure': {'kind': 'scheduledEnd', 'endedAt': 1000},
        },
      ).closure,
      isA<AttendanceScheduledEnd>(),
    );
    final counts = reportCounts(unreviewed: 0);
    final cancelled = {
      'closure': {'kind': 'cancelled'},
      'counts': {
        ...counts,
        'notExpected': {
          'invited': 0,
          'waitlisted': 0,
          'cancelled': 0,
          'eventCancelled': 1,
        },
      },
      'members': [
        reportMember(
          classification: {'kind': 'notExpected', 'reason': 'eventCancelled'},
        ),
      ],
    };
    expect(
      reportView(viewPatch: cancelled).closure,
      isA<AttendanceEventCancelled>(),
    );
    reject({
      ...cancelled,
      'closure': {'kind': 'open'},
    });
    reject({
      'closure': {'kind': 'cancelled'},
    });
    final recorded = {
      'counts': reportCounts(unreviewed: 0, recorded: 1),
      'members': [
        reportMember(
          classification: {
            'kind': 'recordedNoShow',
            'evidence': 'hostConfirmed',
          },
        ),
      ],
    };
    for (final kind in ['open', 'cancelled']) {
      reject({
        ...recorded,
        'closure': {'kind': kind},
      });
    }
    for (final field in ['completedAt', 'endedAt']) {
      reject({
        'closure': {
          'kind': field == 'completedAt' ? 'runtimeComplete' : 'scheduledEnd',
          field: 2001,
        },
      });
    }
  });

  test('only exact fields and known evidence variants are accepted', () {
    for (final classification in [
      {'kind': 'automaticNoShow'},
      {'kind': 'recordedNoShow', 'evidence': 'inferred'},
      {
        'kind': 'recordedNoShow',
        'evidence': {'kind': 'guestDeclined'},
      },
      {'kind': 'unresolved', 'reason': 'unanswered'},
      {'kind': 'notExpected', 'reason': 'departed'},
      {'kind': 'attended', 'checkedIn': true},
    ]) {
      reject({
        'members': [reportMember(classification: classification)],
      });
    }
    reject({'source': 'eventParticipations'});
    reject({'noShowCount': 1});
    reject({
      'counts': {'attended': 1},
    });
    reject({
      'counts': {...reportCounts(), 'automaticNoShow': 1},
    });
    reject({
      'closure': {'kind': 'complete'},
    });
    for (final id in ['', '/foreign', 'a' * 161]) {
      reject({
        'members': [reportMember(id: id)],
      });
    }
    for (final context in [
      {...reportScope().context, 'mode': 'rehearsal'},
      {...reportScope().context, 'eventId': 'other'},
      {...reportScope().context, 'organizerId': 'other'},
      {...reportScope().context, 'unexpected': true},
    ]) {
      reject({'context': context});
    }
  });

  test('unsafe numbers and bad source hashes never become zero values', () {
    for (final value in [
      -1,
      1.5,
      double.nan,
      double.infinity,
      9007199254740992,
      '1',
      null,
    ]) {
      reject({'serverTime': value});
      reject({'rosterCount': value});
      reject({
        'counts': {...reportCounts(), 'attended': value},
      });
    }
    for (final value in ['', 'A' * 64, 'a' * 63, null]) {
      reject({'sourceHash': value});
    }
    expect(
      reportView(
        viewPatch: {'serverTime': 2000.0, 'rosterCount': 1.0},
      ).serverTime,
      2000,
    );
  });

  test('parsed snapshots do not retain mutable response collections', () {
    final member = reportMember(
      classification: {'kind': 'unresolved', 'reason': 'unreviewed'},
    );
    final response = reportResponse(
      viewPatch: {
        'members': [member],
      },
    );
    final report = EventAttendanceReportView.fromCallableData(
      response,
      expectedScope: reportScope(),
    );
    member['attendeeId'] = 'another';
    (member['classification']! as Map<String, Object?>)['reason'] = 'cleared';
    expect(report.members.single.scope.attendeeId, 'attendee-1');
    expect(
      (report.members.single.classification as AttendanceReportUnresolved)
          .reason,
      AttendanceReportUnresolvedReason.unreviewed,
    );
    expect(() => report.members.clear(), throwsUnsupportedError);
  });
}
