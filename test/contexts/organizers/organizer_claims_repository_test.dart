import 'package:catch_dating_app/contexts/organizers/data/organizer_claims_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/claimable_organizer.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> foundPages() => {
  'enabled': true,
  'candidates': [
    {
      'organizerId': 'org-lantern',
      'claimPending': false,
      'sources': ['sales_crm_verified', 'something_new'],
      'strength': 'strong',
      'prefill': {
        'name': 'Lantern Lane Social',
        'description': '',
        'cityName': 'Mumbai',
        'marketId': 'in-mh-mumbai',
        'organizerType': 'club',
        'categoryLabel': 'Run club',
        'tags': ['running'],
        'instagramHandle': null,
        'photoUrl': 'https://images.example.com/lantern.png',
        'canonicalPath': '/organizers/lantern-lane-social/',
      },
      'filled': ['name', 'city', 'organizerType', 'photo'],
      'missing': ['description', 'instagramHandle'],
    },
    {'organizerId': 'org-broken'},
  ],
};

void main() {
  test(
    'finds pages with no payload and keeps only what it understands',
    () async {
      final functions = _Functions()..response = foundPages();
      final found = await OrganizerClaimsRepository(
        functions,
      ).findClaimableOrganizers();

      expect(functions.calls, ['findClaimableOrganizers']);
      expect(functions.payload, isEmpty);
      expect(found.enabled, isTrue);
      final page = found.candidatesToOffer.single;
      expect(page.organizerId, 'org-lantern');
      expect(page.prefill.name, 'Lantern Lane Social');
      expect(page.prefill.description, isNull);
      expect(page.prefill.cityName, 'Mumbai');
      expect(page.sources, [ClaimableOrganizerSource.salesCrmVerified]);
      expect(page.filled, [
        ClaimableOrganizerField.name,
        ClaimableOrganizerField.city,
        ClaimableOrganizerField.organizerType,
        ClaimableOrganizerField.photo,
      ]);
      expect(page.missing, [
        ClaimableOrganizerField.description,
        ClaimableOrganizerField.instagramHandle,
      ]);
    },
  );

  test('while the read is off nothing is offered', () async {
    final functions = _Functions()
      ..response = {...foundPages(), 'enabled': false};
    final found = await OrganizerClaimsRepository(
      functions,
    ).findClaimableOrganizers();

    expect(found.enabled, isFalse);
    expect(found.candidatesToOffer, isEmpty);
    expect(
      ClaimableOrganizers.fromCallableData(null).candidatesToOffer,
      isEmpty,
    );
  });

  test('a claim sends the page, the name and the role', () async {
    final functions = _Functions()
      ..response = {'requestId': 'claim-req-1', 'status': 'pending'};
    final requestId = await OrganizerClaimsRepository(functions).requestClaim(
      organizerId: 'org-lantern',
      requesterName: '  Riya Kapoor ',
      role: OrganizerClaimRole.venueManager,
    );

    expect(functions.calls, ['requestOrganizerClaim']);
    expect(functions.payload, {
      'organizerId': 'org-lantern',
      'requesterName': 'Riya Kapoor',
      'requesterRole': 'venueManager',
    });
    expect(requestId, 'claim-req-1');
  });
}

class _Functions extends Fake implements FirebaseFunctions {
  Object? response;
  Object? payload;
  final calls = <String>[];
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) {
    calls.add(name);
    return _Callable((value) {
      payload = value;
      return response;
    });
  }
}

class _Callable extends Fake implements HttpsCallable {
  _Callable(this.respond);
  final Object? Function(Object?) respond;
  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async =>
      _Result(respond(parameters) as T);
}

class _Result<T> extends Fake implements HttpsCallableResult<T> {
  _Result(this.data);
  @override
  final T data;
}
