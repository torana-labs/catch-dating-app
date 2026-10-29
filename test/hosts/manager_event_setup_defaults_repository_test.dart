import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_preferences.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final hash = List.filled(64, 'a').join();
  Map<String, Object?> projection([
    Map<String, Object?> preferences = const {},
  ]) => {
    'organizerId': 'club-1',
    'city': {'cityId': 'in-mh-mumbai', 'marketId': 'in-mh-mumbai'},
    'timezone': null,
    'organizerDefaultsRevision': null,
    'basicsReviewedHash': hash,
    'preferencesRevision': 0,
    'preferences': preferences,
    'preferencesHash': hash,
    'reviewedDefaultsHash': hash,
  };

  test(
    'read accepts sparse private preferences and nullable public basics',
    () {
      final current = ManagerEventSetupDefaults.fromResponse(
        projection({
          'collectionPreference': 'manualInstructions',
          'paymentInstructions': 'Pay on arrival',
        }),
      );
      expect(current.organizerDefaultsRevision, isNull);
      expect(current.preferencesRevision, 0);
      expect(current.preferences.paymentInstructions, 'Pay on arrival');
      expect(current.preferences.currency, isNull);
      expect(
        current.preferences.toSparseJson().containsKey('currency'),
        isFalse,
      );
      final legacy = ManagerEventSetupDefaults.fromResponse({
        ...projection({'timezone': 'Asia/Kolkata'}),
        'timezone': 'Asia/Kolkata',
        'organizerDefaultsRevision': 7,
      });
      expect(legacy.preferencesRevision, 0);
      expect(legacy.organizerDefaultsRevision, 7);
    },
  );

  test('private timezone mirrors the effective projection and can clear', () {
    final current = ManagerEventSetupDefaults.fromResponse({
      ...projection({'timezone': 'Asia/Kolkata'}),
      'timezone': 'Asia/Kolkata',
      'organizerDefaultsRevision': 1,
      'preferencesRevision': 1,
    });
    expect(current.timezone, 'Asia/Kolkata');
    final request = ManagerEventSetupDefaultsUpdateRequest.forChange(
      current: current,
      requestId: 'timezone-1',
      next: current.preferences.copyWith(timezone: null),
    );
    expect(request.changes, {
      'timezone': {'mode': 'clear'},
    });
    expect(
      () => ManagerEventSetupDefaults.fromResponse({
        ...projection({'timezone': 'UTC'}),
        'timezone': null,
      }),
      throwsFormatException,
    );
  });

  test('read rejects null or unknown private preference', () {
    expect(
      () => ManagerEventSetupDefaults.fromResponse(
        projection({'paymentInstructions': null}),
      ),
      throwsFormatException,
    );
    expect(
      () => ManagerEventSetupDefaults.fromResponse(
        projection({'externalAccountToken': 'secret'}),
      ),
      throwsFormatException,
    );
  });

  test('update uses exact revision and reviewed hash with set and clear', () {
    final current = ManagerEventSetupDefaults.fromResponse(
      projection({'paymentInstructions': 'Pay on arrival', 'currency': 'INR'}),
    );
    final next = current.preferences.copyWith(
      paymentInstructions: null,
      offerValidityMinutes: 1440,
    );
    final request = ManagerEventSetupDefaultsUpdateRequest.forChange(
      current: current,
      requestId: 'abcdefghi123',
      next: next,
    );
    expect(request.isValid, isTrue);
    expect(request.expectedRevision, 0);
    expect(request.reviewedDefaultsHash, hash);
    expect(request.changes, {
      'paymentInstructions': {'mode': 'clear'},
      'offerValidityMinutes': {'mode': 'set', 'value': 1440},
    });
    expect(
      ManagerEventSetupDefaultsUpdateRequest.fromJson(
        request.toJson(),
      ).toJson(),
      request.toJson(),
    );
    expect(request.toJson().toString(), isNot(contains('null')));
  });

  test('receipt rejects malformed replay and changed revision', () {
    expect(
      () => ManagerEventSetupDefaultsUpdateReceipt.fromResponse({
        'appliedRevision': 1,
        'current': {...projection(), 'preferencesRevision': 1},
        'replayed': 'false',
      }),
      throwsFormatException,
    );
    expect(
      () => ManagerEventSetupDefaultsUpdateReceipt.fromResponse({
        'appliedRevision': 2,
        'current': {...projection(), 'preferencesRevision': 1},
        'replayed': false,
      }),
      throwsFormatException,
    );
  });

  test('reusable link only serializes after explicit reusable attestation', () {
    const invalid = ManagerEventSetupPreferences(
      reusablePaymentPage: ReusableOrganizerPaymentPage(
        'https://example.com/pay',
        reusableForEvents: false,
      ),
    );
    expect(invalid.isValid, isFalse);
    expect(
      () => ManagerEventSetupPreferences.fromSparseJson({
        'reusablePaymentPage': {
          'url': 'https://example.com/pay',
          'reusableForEvents': false,
        },
      }),
      throwsFormatException,
    );
  });
}
