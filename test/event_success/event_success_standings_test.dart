import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses ordered standings snapshots and selects the revealed round', () {
    final now = DateTime.utc(2026, 8, 13, 12);
    final standings = EventSuccessStandings.fromJson({
      'id': 'event-1',
      'eventId': 'event-1',
      'organizerId': 'club-1',
      'unitOutcome': 'score',
      'revision': 2,
      'latestRoundIndex': 1,
      'rounds': [
        {
          'roundIndex': 0,
          'entries': [
            {
              'unitId': 'team-a',
              'unitLabel': 'Team A',
              'position': 1,
              'value': 4,
              'roundsRecorded': 1,
            },
          ],
        },
        {
          'roundIndex': 1,
          'entries': [
            {
              'unitId': 'team-a',
              'unitLabel': 'Team A',
              'position': 1,
              'value': 9,
              'roundsRecorded': 2,
            },
          ],
        },
      ],
      'entries': [
        {
          'unitId': 'team-a',
          'unitLabel': 'Team A',
          'position': 1,
          'value': 9,
          'roundsRecorded': 2,
        },
      ],
      'createdAt': now,
      'updatedAt': now,
    });

    expect(standings.unitOutcome, EventSuccessUnitOutcome.score);
    expect(standings.throughRound(0)?.entries.single.value, 4);
    expect(standings.throughRound(1)?.entries.single.value, 9);
    expect(standings.throughRound(-1), isNull);
    expect(standings.toJson()['unitOutcome'], 'score');
  });

  test('rejects a non-standing outcome projection', () {
    expect(
      () => EventSuccessStandings.fromJson({'unitOutcome': 'completion'}),
      throwsFormatException,
    );
  });
}
