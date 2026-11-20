import 'package:catch_dating_app/contexts/organizers/data/organizer_entitlement_repository.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> _grant(
  String sku, {
  bool active = true,
  bool revoked = false,
}) => {
  'grantId': 'grant-$sku',
  'sku': sku,
  'skuLabel': sku,
  'unit': 'program',
  'quantityTotal': 1,
  'quantityConsumed': 1,
  'quantityRemaining': 0,
  'validFromMillis': 0,
  'validUntilMillis': null,
  'source': 'manualInvoice',
  'active': active,
  'revoked': revoked,
};

Map<String, Object?> _response(List<Object?> grants) => {
  'schemaVersion': 1,
  'organizerId': 'marigold-weddings',
  'catalogVersion': 1,
  'revision': 3,
  'grants': grants,
  'meters': {'flightDaysUsed': 0, 'waConversationsUsed': 0},
  'skuCatalog': <String, Object?>{},
};

bool _weddings(List<Object?> grants) => OrganizerEntitlement.fromResponse(
  _response(grants),
  'marigold-weddings',
).hasWeddingsPlan;

void main() {
  test('an active weddings plan makes a weddings company, even when its '
      'weddings are all used', () {
    for (final sku in organizerWeddingsPlanSkus) {
      expect(_weddings([_grant(sku)]), isTrue, reason: sku);
    }
  });

  test('no grants, a revoked or lapsed plan, or the transport add-on alone '
      'do not', () {
    expect(_weddings(const []), isFalse);
    expect(_weddings([_grant('wedding_pro', revoked: true)]), isFalse);
    expect(_weddings([_grant('planner_annual', active: false)]), isFalse);
    expect(_weddings([_grant('wedding_transport_addon')]), isFalse);
    expect(
      _weddings([
        _grant('wedding_transport_addon'),
        _grant('wedding_essentials'),
      ]),
      isTrue,
    );
  });

  test('a response for another organiser or with malformed grants is '
      'rejected', () {
    expect(
      () => OrganizerEntitlement.fromResponse(
        _response(const []),
        'another-organizer',
      ),
      throwsFormatException,
    );
    expect(
      () => OrganizerEntitlement.fromResponse(
        _response([
          {'sku': 'wedding_pro', 'active': 'yes', 'revoked': false},
        ]),
        'marigold-weddings',
      ),
      throwsFormatException,
    );
    expect(
      () => OrganizerEntitlement.fromResponse(null, 'marigold-weddings'),
      throwsFormatException,
    );
  });
}
