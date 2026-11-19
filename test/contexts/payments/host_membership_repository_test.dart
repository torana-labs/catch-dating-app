import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../host_memberships/host_membership_fixtures.dart';

class _NoFunctions extends Fake implements FirebaseFunctions {}

Map<String, Object?> _use({
  required String eventId,
  String uid = 'member-1',
  String organizerId = 'organizer-1',
  String state = 'booked',
  required int startMillis,
}) => {
  'schemaVersion': 1,
  'membershipId': testMembershipId,
  'organizerId': organizerId,
  'uid': uid,
  'eventId': eventId,
  'planId': testPlanId,
  'listPriceInPaise': 50000,
  'paidPriceInPaise': 0,
  'savingsInPaise': 50000,
  'eventStartMillis': startMillis,
  'state': state,
  'createdAtMillis': 1,
};

void main() {
  test('reads savings totals from the membership document', () async {
    final db = FakeFirebaseFirestore();
    await db
        .collection('hostMemberships')
        .doc(testMembershipId)
        .set(membershipMap(savedInPaise: 85000, memberPricedBookings: 2));
    final repository = HostMembershipRepository(
      db: db,
      functions: _NoFunctions(),
    );

    final memberships = await repository.watchMyMemberships('member-1').first;
    expect(memberships.single.savedInPaise, 85000);
    expect(memberships.single.memberPricedBookings, 2);
  });

  test('upcoming uses are the member\'s booked ones with one organizer, '
      'earliest first and bounded', () async {
    final db = FakeFirebaseFirestore();
    final uses = db.collection('hostMembershipBenefitUses');
    Future<void> add(String id, Map<String, Object?> data) =>
        uses.doc(id).set(data);
    await add('past_member-1', _use(eventId: 'past', startMillis: 100));
    await add('late_member-1', _use(eventId: 'late', startMillis: 400));
    await add('soon_member-1', _use(eventId: 'soon', startMillis: 200));
    await add('next_member-1', _use(eventId: 'next', startMillis: 300));
    await add(
      'gone_member-1',
      _use(eventId: 'gone', startMillis: 250, state: 'released'),
    );
    await add(
      'other_member-1',
      _use(eventId: 'other', startMillis: 250, organizerId: 'organizer-2'),
    );
    await add(
      'soon_member-2',
      _use(eventId: 'soon', startMillis: 250, uid: 'member-2'),
    );
    final repository = HostMembershipRepository(
      db: db,
      functions: _NoFunctions(),
    );

    final upcoming = await repository
        .watchUpcomingBenefitUses(
          uid: 'member-1',
          organizerId: 'organizer-1',
          startingAfterMillis: 150,
          limit: 2,
        )
        .first;
    expect(upcoming.map((use) => use.eventId), ['soon', 'next']);
  });
}
