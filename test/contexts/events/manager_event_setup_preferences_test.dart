import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const board = {
    'startingPriceMinor': 49900,
    'places': 32,
    'waitlistEnabled': true,
    'bookingMode': 'askFirst',
    'refundPolicy': 'standard',
    'askedAtBooking': ['food', 'heard'],
    'autoMessages': {'thankYou': true, 'arrival': false},
  };

  test('the board defaults read strictly and round-trip', () {
    final preferences = ManagerEventSetupPreferences.fromSparseJson(board);
    expect(preferences.toSparseJson(), board);
    expect(
      () => ManagerEventSetupPreferences.fromSparseJson({
        'refundPolicy': 'notApplicable',
      }),
      throwsFormatException,
    );
    expect(
      () => ManagerEventSetupPreferences.fromSparseJson({
        'autoMessages': {'thankYou': true},
      }),
      throwsFormatException,
    );
    expect(
      () => ManagerEventSetupPreferences.fromSparseJson({'askToJoin': true}),
      throwsFormatException,
    );
  });

  test('a change sends only the fields that differ, lists included', () {
    final current = ManagerEventSetupDefaults(
      organizerId: 'org1',
      cityId: null,
      marketId: null,
      timezone: null,
      organizerDefaultsRevision: null,
      basicsReviewedHash: 'a' * 64,
      preferencesRevision: 3,
      preferences: ManagerEventSetupPreferences.fromSparseJson(board),
      preferencesHash: 'b' * 64,
      reviewedDefaultsHash: 'c' * 64,
    );
    final request = ManagerEventSetupDefaultsUpdateRequest.forChange(
      current: current,
      requestId: 'defaults-change-1',
      next: current.preferences.copyWith(
        askedAtBooking: ['food', 'heard'],
        places: null,
      ),
    );
    expect(request.changes, {
      'places': {'mode': 'clear'},
    });
    expect(request.isValid, true);
  });
}
