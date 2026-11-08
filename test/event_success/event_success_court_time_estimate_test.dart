import 'package:catch_dating_app/contexts/formats/domain/event_success_court_time_estimate.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('40 players on 3 doubles courts for 2 hours matches the engine', () {
    // Pinned by functions/src/eventSuccess/assignmentPlanner.test.ts.
    final estimate = estimateEventSuccessCourtTime(
      players: 40,
      courts: 3,
      seatsPerCourt: 4,
      minutesPerGame: 15,
      eventMinutes: 120,
    )!;

    expect(estimate.rounds, 8);
    expect(estimate.playingPerRound, 12);
    expect(estimate.benchPerRound, 28);
    expect(estimate.minMinutes, 30);
    expect(estimate.maxMinutes, 45);
    expect(estimate.aboutMinutes, 36);
    expect(estimate.hasBench, isTrue);
  });

  test('a doubles court runs only full', () {
    final estimate = estimateEventSuccessCourtTime(
      players: 10,
      courts: 3,
      seatsPerCourt: 4,
      minutesPerGame: 15,
      eventMinutes: 60,
    )!;

    expect(estimate.playingPerRound, 8);
    expect(estimate.benchPerRound, 2);
  });

  test('everyone plays every round when the courts hold everyone', () {
    final estimate = estimateEventSuccessCourtTime(
      players: 8,
      courts: 4,
      seatsPerCourt: 2,
      minutesPerGame: 20,
      eventMinutes: 60,
    )!;

    expect(estimate.benchPerRound, 0);
    expect(estimate.minMinutes, 60);
    expect(estimate.maxMinutes, 60);
    expect(estimate.hasBench, isFalse);
  });

  test('nothing to estimate without a full court or a whole game', () {
    expect(
      estimateEventSuccessCourtTime(
        players: 3,
        courts: 2,
        seatsPerCourt: 4,
        minutesPerGame: 15,
        eventMinutes: 60,
      ),
      isNull,
    );
    expect(
      estimateEventSuccessCourtTime(
        players: 12,
        courts: 2,
        seatsPerCourt: 4,
        minutesPerGame: 30,
        eventMinutes: 20,
      ),
      isNull,
    );
  });
}
