import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_models.dart';
import 'package:flutter_test/flutter_test.dart';

const _policy = <String, Object?>{'version': 1};

const _terms = PrivateEventAdmissionTerms(
  capacityLimit: 24,
  priceInPaise: 49900,
  currency: 'INR',
  cancellationPolicyId: 'flexible',
  eventPolicy: _policy,
  constraints: {'minAge': 21, 'maxAge': 35, 'maxMen': null, 'maxWomen': null},
  inviteCode: 'LANTERN',
);

void main() {
  test('the four terms alone leave the policy, limits and code out', () {
    const terms = PrivateEventAdmissionTerms(
      capacityLimit: 24,
      priceInPaise: 0,
      currency: 'INR',
      cancellationPolicyId: 'notApplicable',
    );
    expect(terms.toJson(), {
      'capacityLimit': 24,
      'priceInPaise': 0,
      'currency': 'INR',
      'cancellationPolicyId': 'notApplicable',
    });
  });

  test('the policy, limits and invite code go with the terms', () {
    expect(_terms.isValid, isTrue);
    expect(_terms.toJson(), {
      'capacityLimit': 24,
      'priceInPaise': 49900,
      'currency': 'INR',
      'cancellationPolicyId': 'flexible',
      'eventPolicy': _policy,
      'constraints': {
        'minAge': 21,
        'maxAge': 35,
        'maxMen': null,
        'maxWomen': null,
      },
      'privateAccess': {'inviteCode': 'LANTERN'},
    });
  });

  test('a short code or ages out of order are not valid', () {
    const shortCode = PrivateEventAdmissionTerms(
      capacityLimit: 24,
      priceInPaise: 0,
      currency: 'INR',
      cancellationPolicyId: 'notApplicable',
      inviteCode: 'AB',
    );
    const ages = PrivateEventAdmissionTerms(
      capacityLimit: 24,
      priceInPaise: 0,
      currency: 'INR',
      cancellationPolicyId: 'notApplicable',
      constraints: {'minAge': 40, 'maxAge': 30},
    );
    expect(shortCode.isValid, isFalse);
    expect(ages.isValid, isFalse);
  });

  test('the setup view read keeps to the four terms', () {
    expect(
      () => PrivateEventAdmissionTerms.fromResponse(_terms.toJson()),
      throwsFormatException,
    );
  });

  test('a stored details command restores its policy and invite code', () {
    final request = PrivateEventDetailsUpdateRequest(
      organizerId: 'club-1',
      eventId: 'event-1',
      requestId: 'c' * 48,
      expectedSetupRevision: 2,
      reviewedDefaultsHash: 'a' * 64,
      details: const PrivateEventDetailsPatch(admissionTerms: _terms),
    );
    expect(request.isValid, isTrue);
    final restored = PrivateEventDetailsUpdateRequest.fromJson(
      request.toJson(),
    );
    final terms = restored.details.admissionTerms!;
    expect(terms.inviteCode, 'LANTERN');
    expect(terms.eventPolicy, _policy);
    expect(terms.constraints?['minAge'], 21);
    expect(terms.toJson(), _terms.toJson());
  });

  test('a stored command with unknown access keys is refused', () {
    expect(
      () => PrivateEventAdmissionTerms.fromCommandJson({
        ..._terms.toJson(),
        'privateAccess': {'inviteCode': 'LANTERN', 'hint': 'LA...RN'},
      }),
      throwsFormatException,
    );
  });
}
