import 'package:catch_dating_app/contexts/programmes/domain/dispatch_manifest.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter_test/flutter_test.dart';

ProgramArrivalsRoster roster(String readiness) =>
    ProgramArrivalsRoster.fromCallableData({
      'programId': 'program',
      'accessExpiresAtMillis': null,
      'pickupPointId': 'pickup',
      'generatedAtMillis': 1800000000000,
      'vehicleClasses': <Object?>[],
      'rows': [
        {
          'legId': 'leg',
          'guestId': 'guest',
          'guestDisplayName': 'Guest',
          'partyGuestIds': ['guest'],
          'passengers': 1,
          'luggageUnits': 1,
          'flightStatus': 'landed',
          'readiness': readiness,
          'destinationLabel': 'Hotel',
          'requiredCapabilities': <Object?>[],
          'revision': 42,
        },
      ],
    });

void main() {
  test('dispatch captures revisions from a ready saved roster', () {
    expect(
      captureDispatchLegRevisions(roster('ready'), [
        'leg',
      ]).map((fence) => fence.toJson()),
      [
        {'legId': 'leg', 'revision': 42},
      ],
    );
  });
  for (final state in ['expected', 'disrupted', 'dispatched', 'arrived']) {
    test('dispatch cannot queue a $state passenger', () {
      expect(
        () => captureDispatchLegRevisions(roster(state), ['leg']),
        throwsA(isA<ValidationException>()),
      );
    });
  }
  test('missing and duplicate manifest legs cannot bypass revision checks', () {
    for (final legs in [
      <String>[],
      ['missing'],
      ['leg', 'leg'],
    ]) {
      expect(
        () => captureDispatchLegRevisions(roster('ready'), legs),
        throwsA(isA<ValidationException>()),
      );
    }
  });
}
