import 'package:catch_dating_app/contexts/live/domain/event_success_presence.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'presence summary parses policy and derives likely departed entries',
    () {
      final summary = EventSuccessPresenceSummary.fromJson({
        'serverTimeMillis': 1000,
        'liveControlRevision': 3,
        'nextRoundIndex': 2,
        'policy': {
          'heartbeatIntervalSeconds': 30,
          'presentWindowSeconds': 90,
          'likelyDepartedAfterSeconds': 300,
        },
        'entries': [
          {
            'uid': 'present-1',
            'displayName': 'Present guest',
            'presenceState': 'present',
            'heartbeatAtMillis': 900,
          },
          {
            'uid': 'departed-1',
            'displayName': 'Departed guest',
            'presenceState': 'likelyDeparted',
            'heartbeatAtMillis': 1,
          },
        ],
        'lateArrivals': [
          {
            'uid': 'late-1',
            'displayName': 'Late guest',
            'checkedInAtMillis': 950,
          },
        ],
      });

      expect(summary.policy.heartbeatIntervalSeconds, 30);
      expect(summary.likelyDeparted.single.uid, 'departed-1');
      expect(summary.lateArrivals.single.uid, 'late-1');
    },
  );

  test('late-arrival resolution requires a stated reason', () {
    expect(
      () => EventSuccessLateArrivalResolution.fromJson({
        'status': 'heldForNextRound',
        'targetRoundIndex': 2,
        'assignmentDraftRevision': 3,
        'reason': '',
      }),
      throwsFormatException,
    );
  });
}
