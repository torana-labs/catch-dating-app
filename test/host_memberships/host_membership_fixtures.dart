import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_benefit_use.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';

const testPlanId = 'hmp_AbCdEfGhIjKlMnOpQrSt';
const testMembershipId =
    'hm_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
final testNow = DateTime.utc(2026, 10, 28, 12);

Map<String, Object?> membershipMap({
  String status = 'active',
  Map<String, Object?>? pause,
  bool cancelAtPeriodEnd = false,
  int? memberSinceMillis,
}) => {
  'schemaVersion': 1,
  'organizerId': 'organizer-1',
  'uid': 'member-1',
  'planId': testPlanId,
  'planName': 'Sunday Runners',
  'interval': 'monthly',
  'status': status,
  'statusReason': null,
  'priceInPaise': 49900,
  'currency': 'INR',
  'currentPeriodStartMillis': testNow
      .subtract(const Duration(days: 5))
      .millisecondsSinceEpoch,
  'currentPeriodEndMillis': testNow
      .add(const Duration(days: 25))
      .millisecondsSinceEpoch,
  'trialEndsAtMillis': null,
  'cancelAtPeriodEnd': cancelAtPeriodEnd,
  'pause': pause,
  'pastDueSinceMillis': null,
  'memberSinceMillis':
      memberSinceMillis ??
      testNow.subtract(const Duration(days: 40)).millisecondsSinceEpoch,
  'tenure': {
    'accumulatedMillis': const Duration(days: 30).inMilliseconds,
    'stretchStartedAtMillis': testNow
        .subtract(const Duration(days: 5))
        .millisecondsSinceEpoch,
  },
  'provider': 'razorpay',
  'providerSubscriptionId': 'sub_TestSub1',
  'providerPlanId': 'plan_TestPlan1',
  'providerEventAtMillis': 1,
  'lastCheckoutId': 'hmc_AbCdEfGhIjKlMnOpQrSt',
  'revision': 3,
  'createdAtMillis': 1,
  'updatedAtMillis': 1,
};

HostMembership testMembership({
  String status = 'active',
  Map<String, Object?>? pause,
  String id = testMembershipId,
}) => HostMembership.fromMap(id, membershipMap(status: status, pause: pause));

Map<String, Object?> planMap({
  String status = 'published',
  int? memberCap,
  int activeMemberCount = 3,
  List<Map<String, Object?>> benefits = const [
    {'type': 'eventDiscount', 'percentOff': 100},
    {'type': 'earlyAccess'},
  ],
}) => {
  'schemaVersion': 1,
  'organizerId': 'organizer-1',
  'name': 'Sunday Runners',
  'description': 'Every Sunday long run included.',
  'status': status,
  'prices': {
    'monthly': {
      'amountPaise': 49900,
      'providerPriceIds': {'razorpay': 'plan_TestPlan1'},
      'revision': 1,
    },
    'annual': {'amountPaise': 499900, 'providerPriceIds': {}, 'revision': 1},
  },
  'memberCap': memberCap,
  'trialDays': 7,
  'benefits': benefits,
  'perks': ['Free coffee after the run'],
  'limits': {'maxUpcomingMemberPricedBookings': 2},
  'activeMemberCount': activeMemberCount,
  'sortOrder': 0,
  'revision': 2,
  'createdAtMillis': 1,
  'updatedAtMillis': 1,
  'publishedAtMillis': 1,
};

HostMembershipPlan testPlan({int? memberCap, int activeMemberCount = 3}) =>
    HostMembershipPlan.fromMap(
      testPlanId,
      planMap(memberCap: memberCap, activeMemberCount: activeMemberCount),
    );

HostMembershipBenefitUse testBenefitUse({
  String id = 'event-1_member-1',
  int savings = 50000,
  bool released = false,
  String membershipId = testMembershipId,
}) => HostMembershipBenefitUse.fromMap(id, {
  'schemaVersion': 1,
  'membershipId': membershipId,
  'organizerId': 'organizer-1',
  'uid': 'member-1',
  'eventId': id.split('_').first,
  'planId': testPlanId,
  'listPriceInPaise': savings,
  'paidPriceInPaise': 0,
  'savingsInPaise': savings,
  'eventStartMillis': 1,
  'state': released ? 'released' : 'booked',
  'createdAtMillis': 1,
});
