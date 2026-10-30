import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_admin.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_benefit_use.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_event_facts.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_state.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_state.dart';

/// Offline host-membership fixtures parsed through the strict domain readers,
/// so previews break when the server document shape changes.
const widgetbookMembershipOrganizerId = 'organizer-preview';
const widgetbookMembershipViewerUid = 'member-preview';
const widgetbookMembershipPlanId = 'hmp_PreviewPlanAbCdEfGh';
const widgetbookMembershipId =
    'hm_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
final widgetbookMembershipNow = DateTime.utc(2026, 10, 28, 12);

int _millis(Duration offset) =>
    widgetbookMembershipNow.add(offset).millisecondsSinceEpoch;

HostMembership widgetbookMembership({
  String id = widgetbookMembershipId,
  String planName = 'Sunday Runners',
  String status = 'active',
  String? pausedBy,
  bool cancelAtPeriodEnd = false,
}) => HostMembership.fromMap(id, {
  'schemaVersion': 1,
  'organizerId': widgetbookMembershipOrganizerId,
  'uid': widgetbookMembershipViewerUid,
  'planId': widgetbookMembershipPlanId,
  'planName': planName,
  'interval': 'monthly',
  'status': status,
  'statusReason': null,
  'priceInPaise': 49900,
  'currency': 'INR',
  'currentPeriodStartMillis': _millis(const Duration(days: -5)),
  'currentPeriodEndMillis': _millis(const Duration(days: 25)),
  'trialEndsAtMillis': null,
  'cancelAtPeriodEnd': cancelAtPeriodEnd,
  'pause': pausedBy == null
      ? null
      : {'initiator': pausedBy, 'pausedAtMillis': _millis(Duration.zero)},
  'pastDueSinceMillis': status == 'past_due' ? _millis(Duration.zero) : null,
  'memberSinceMillis': _millis(const Duration(days: -120)),
  'tenure': {
    'accumulatedMillis': const Duration(days: 115).inMilliseconds,
    'stretchStartedAtMillis': status == 'paused'
        ? null
        : _millis(const Duration(days: -5)),
  },
  'provider': 'razorpay',
  'providerSubscriptionId': 'sub_PreviewSub1',
  'providerPlanId': 'plan_PreviewPlan1',
  'providerEventAtMillis': 1,
  'lastCheckoutId': 'hmc_PreviewCheckoutAbCd',
  'revision': 3,
  'createdAtMillis': 1,
  'updatedAtMillis': 1,
});

HostMembershipPlan widgetbookMembershipPlan({
  String id = widgetbookMembershipPlanId,
  String name = 'Sunday Runners',
  String status = 'published',
  int percentOff = 100,
  int? memberCap,
  int activeMemberCount = 18,
}) => HostMembershipPlan.fromMap(id, {
  'schemaVersion': 1,
  'organizerId': widgetbookMembershipOrganizerId,
  'name': name,
  'description': 'Every Sunday long run, plus first dibs on new routes.',
  'status': status,
  'prices': {
    'monthly': {
      'amountPaise': 49900,
      'providerPriceIds': {'razorpay': 'plan_PreviewPlan1'},
      'revision': 1,
    },
    'annual': {'amountPaise': 499900, 'providerPriceIds': {}, 'revision': 1},
  },
  'memberCap': memberCap,
  'trialDays': 7,
  'benefits': [
    {'type': 'eventDiscount', 'percentOff': percentOff},
    {'type': 'earlyAccess'},
  ],
  'perks': ['Free coffee after the run'],
  'limits': {'maxUpcomingMemberPricedBookings': 2},
  'activeMemberCount': activeMemberCount,
  'sortOrder': 0,
  'revision': 2,
  'createdAtMillis': 1,
  'updatedAtMillis': 1,
  'publishedAtMillis': status == 'published' ? 1 : null,
});

final widgetbookMembershipPlans = [
  widgetbookMembershipPlan(),
  widgetbookMembershipPlan(
    id: 'hmp_PreviewPlanZyXwVuTs',
    name: 'Track Club',
    percentOff: 30,
    memberCap: 18,
  ),
];

HostMembershipBenefitUse widgetbookMembershipBenefitUse(
  String eventId,
  int savingsInPaise,
) => HostMembershipBenefitUse.fromMap(
  '${eventId}_$widgetbookMembershipViewerUid',
  {
    'schemaVersion': 1,
    'membershipId': widgetbookMembershipId,
    'organizerId': widgetbookMembershipOrganizerId,
    'uid': widgetbookMembershipViewerUid,
    'eventId': eventId,
    'planId': widgetbookMembershipPlanId,
    'listPriceInPaise': savingsInPaise,
    'paidPriceInPaise': 0,
    'savingsInPaise': savingsInPaise,
    'eventStartMillis': 1,
    'state': 'booked',
    'createdAtMillis': 1,
  },
);

MyMembershipsState widgetbookMyMembershipsState({
  bool empty = false,
}) => MyMembershipsState.from(
  memberships: empty
      ? const []
      : [
          widgetbookMembership(),
          widgetbookMembership(
            id: 'hm_cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
            planName: 'Track Club',
            status: 'paused',
            pausedBy: 'host',
          ),
          widgetbookMembership(
            id: 'hm_dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
            planName: 'Trail Crew',
            status: 'expired',
          ),
        ],
  benefitUses: empty
      ? const []
      : [
          widgetbookMembershipBenefitUse('event-a', 50000),
          widgetbookMembershipBenefitUse('event-b', 35000),
        ],
);

HostMembershipEventOffer widgetbookMembershipOffer({
  bool unlocksAccess = false,
  int memberPriceInPaise = 0,
}) => EventHostMembershipFacts.fromMap({
  'member': null,
  'listPriceInPaise': 50000,
  'memberPriceApplied': false,
  'memberPriceBlockedReason': null,
  'savingsInPaise': 0,
  'membersOnly': unlocksAccess,
  'generalSaleOpensAtMillis': null,
  'offer': {
    'planId': widgetbookMembershipPlanId,
    'planName': 'Sunday Runners',
    'interval': 'monthly',
    'planPriceInPaise': 49900,
    'memberPriceInPaise': memberPriceInPaise,
    'savingsInPaise': 50000 - memberPriceInPaise,
    'unlocksAccess': unlocksAccess,
  },
}).offer!;

HostMembershipProgramView widgetbookMembershipProgram({
  bool enabled = true,
  bool routeReady = true,
  String billingPauseState = 'active',
}) => HostMembershipProgramView.fromResponse({
  'organizerId': widgetbookMembershipOrganizerId,
  'program': enabled
      ? {
          'state': 'enabled',
          'provider': 'razorpay',
          'mode': 'test',
          'billingPauseState': billingPauseState,
          'memberCount': 24,
          'revision': 2,
        }
      : null,
  'routeAccountReady': routeReady,
  'feeConfigured': true,
  // The default money flow: members pay the host's own Razorpay account.
  'paymentMode': 'hostCollected',
  'unavailableReason': routeReady ? null : 'razorpayNotConnected',
});

HostMembershipsState widgetbookHostMembershipsState({
  bool enabled = true,
  bool routeReady = true,
  String billingPauseState = 'active',
}) => HostMembershipsState(
  program: widgetbookMembershipProgram(
    enabled: enabled,
    routeReady: routeReady,
    billingPauseState: billingPauseState,
  ),
  plans: enabled
      ? [
          ...widgetbookMembershipPlans,
          widgetbookMembershipPlan(
            id: 'hmp_PreviewPlanDraftAbCd',
            name: 'Founding members',
            status: 'draft',
            activeMemberCount: 0,
          ),
        ]
      : const [],
);

HostEventMembershipRules widgetbookEventMembershipRules({
  bool configured = true,
}) => HostEventMembershipRules.fromResponse({
  'eventId': 'event-preview',
  'organizerId': widgetbookMembershipOrganizerId,
  'rules': configured
      ? {
          'memberPriceOverrides': [
            {'planId': widgetbookMembershipPlanId, 'percentOff': 100},
          ],
          'earlyAccessHours': 48,
          'generalSaleOpensAtMillis': _millis(const Duration(days: 2)),
          'membersOnly': false,
          'revision': 3,
        }
      : null,
  'plans': [
    for (final plan in widgetbookMembershipPlans)
      {
        'planId': plan.id,
        'name': plan.name,
        'status': plan.status.name,
        'benefits': [for (final benefit in plan.benefits) benefit.toPayload()],
      },
  ],
});
