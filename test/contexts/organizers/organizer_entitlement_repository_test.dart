import 'package:catch_dating_app/contexts/organizers/data/organizer_entitlement_repository.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

final _now = DateTime.utc(2026, 11, 20, 10);
int _ms(Duration after) => _now.add(after).millisecondsSinceEpoch;

Map<String, Object?> _grant(
  String sku, {
  int? from,
  int? until,
  int? revokedAt,
}) => {
  'grantId': 'grant-$sku',
  'sku': sku,
  'skuLabel': sku,
  'unit': 'program',
  'quantityTotal': 1,
  'quantityConsumed': 1,
  'quantityRemaining': 0,
  'validFromMillis': from ?? 0,
  'validUntilMillis': until,
  'source': 'manualInvoice',
  'revokedAtMillis': revokedAt,
};

Map<String, Object?> _view(List<Object?> grants) => {
  'organizerId': 'marigold-weddings',
  'catalogVersion': 1,
  'revision': 3,
  'grants': grants,
  'meters': {'flightDaysUsed': 0, 'waConversationsUsed': 0},
  'version': 1,
};

bool _weddings(List<Object?> grants, [DateTime? at]) =>
    OrganizerEntitlement.fromView(
      _view(grants),
      'marigold-weddings',
      at ?? _now,
    ).hasWeddingsPlan;

void main() {
  test('an active weddings plan makes a weddings company, even when its '
      'weddings are all used', () {
    for (final sku in organizerWeddingsPlanSkus) {
      expect(_weddings([_grant(sku)]), isTrue, reason: sku);
    }
  });

  test('no view, no grants, a revoked, lapsed or future plan, or the '
      'transport add-on alone do not', () {
    expect(
      OrganizerEntitlement.fromView(
        null,
        'marigold-weddings',
        _now,
      ).hasWeddingsPlan,
      isFalse,
    );
    expect(_weddings(const []), isFalse);
    expect(_weddings([_grant('wedding_pro', revokedAt: 5)]), isFalse);
    expect(
      _weddings([
        _grant('planner_annual', until: _ms(const Duration(minutes: -1))),
      ]),
      isFalse,
    );
    expect(
      _weddings([_grant('wedding_pro', from: _ms(const Duration(days: 1)))]),
      isFalse,
    );
    expect(_weddings([_grant('wedding_transport_addon')]), isFalse);
    expect(
      _weddings([
        _grant('wedding_transport_addon'),
        _grant('wedding_essentials'),
      ]),
      isTrue,
    );
  });

  test('the next start or end of a weddings plan is when it changes', () {
    final ends = _ms(const Duration(hours: 3));
    final entitlement = OrganizerEntitlement.fromView(
      _view([_grant('wedding_pro', until: ends)]),
      'marigold-weddings',
      _now,
    );
    expect(entitlement.hasWeddingsPlan, isTrue);
    expect(entitlement.nextChangeAt?.millisecondsSinceEpoch, ends);
    expect(
      _weddings([
        _grant('wedding_pro', until: ends),
      ], DateTime.fromMillisecondsSinceEpoch(ends)),
      isFalse,
    );
  });

  test('a view for another organiser or with malformed grants is rejected', () {
    expect(
      () => OrganizerEntitlement.fromView(
        _view(const []),
        'another-organizer',
        _now,
      ),
      throwsFormatException,
    );
    expect(
      () => OrganizerEntitlement.fromView(
        _view([
          {'sku': 'wedding_pro', 'validFromMillis': 'yes'},
        ]),
        'marigold-weddings',
        _now,
      ),
      throwsFormatException,
    );
  });

  test('the listener follows the view and ends a plan on the clock', () async {
    final db = FakeFirebaseFirestore();
    final repository = OrganizerEntitlementRepository(
      db,
      AppClock.custom(() => _now),
    );
    expect(
      (await repository.watch('marigold-weddings').first).hasWeddingsPlan,
      isFalse,
    );
    await db
        .collection('hostOrganizerEntitlementViews')
        .doc('marigold-weddings')
        .set(_view([_grant('wedding_signature')]));
    expect(
      (await repository.watch('marigold-weddings').first).hasWeddingsPlan,
      isTrue,
    );
  });
}
