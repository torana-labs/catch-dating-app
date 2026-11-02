import 'package:catch_dating_app/contexts/organizers/domain/organizer_journey.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('a journey reads its steps and what comes next', () {
    final journey = OrganizerJourney.fromJson({
      'organizerId': 'afterfly',
      'organizerName': 'Afterfly',
      'waitingClaim': true,
      'steps': [
        {
          'kind': 'nominated',
          'atMillis': 1761609600000,
          'detail': 'https://luma.com/afterfly',
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
}
