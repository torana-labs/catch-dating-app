import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/bookings/domain/event_signup_decision.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_entitlement.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:flutter_test/flutter_test.dart';

/// Functions owns these booking rules; the app mirrors them to show booking
/// state from direct reads. The shared cases are generated from Functions.
void main() {
  final cases =
      jsonDecode(
            File(
              'contracts/parity/event_booking_viewer_cases.json',
            ).readAsStringSync(),
          )
          as Map<String, dynamic>;

  group('signup decision matches Functions', () {
    for (final raw in cases['signup'] as List<dynamic>) {
      final c = raw as Map<String, dynamic>;
      test(c['name'] as String, () {
        final policy = EventPolicyBundle.fromJson(
          c['policy'] as Map<String, dynamic>,
        );
        final roster = EventSignupRoster.fromJson(
          c['roster'] as Map<String, Object?>,
        );
        final cohortId = c['cohortId'] as String;
        final expected = c['expected'] as Map<String, dynamic>;
        expect(
          eventSignupRestriction(
            policy: policy,
            cohortId: cohortId,
            roster: roster,
            hasValidInvite: c['hasValidInvite'] as bool,
            hasHostApproval: c['hasHostApproval'] as bool,
            hasActiveCommunityMembership:
                c['hasActiveCommunityMembership'] as bool,
          )?.name,
          expected['restriction'],
        );
        expect(
          eventSignupQuoteInPaise(
            policy: policy,
            cohortId: cohortId,
            roster: roster,
          ),
          expected['quoteInPaise'],
        );
      });
    }
  });

  group('membership entitlement matches Functions', () {
    for (final raw in cases['entitlement'] as List<dynamic>) {
      final c = raw as Map<String, dynamic>;
      test(c['name'] as String, () {
        final plans = [
          for (final entry in c['plans'] as List<dynamic>)
            HostMembershipPlan.fromMap(
              (entry as Map<String, dynamic>)['planId'] as String,
              entry['doc'] as Map<String, dynamic>,
            ),
        ];
        final rawMembership = c['membership'] as Map<String, dynamic>?;
        final membership = rawMembership == null
            ? null
            : HostMembership.fromMap('hm_member', rawMembership);
        final rawRules = c['rules'] as Map<String, dynamic>?;
        final result = evaluateHostMembershipEntitlement(
          listPriceInPaise: c['listPriceInPaise'] as int,
          rules: rawRules == null
              ? null
              : EventMembershipRules.fromMap(rawRules),
          membership: membership,
          plan: plans
              .where((plan) => plan.id == membership?.planId)
              .firstOrNull,
          publishedPlans: [
            for (final plan in plans)
              if (plan.status == HostMembershipPlanStatus.published) plan,
          ],
          upcomingMemberPricedBookings:
              c['upcomingMemberPricedBookings'] as int,
          now: DateTime.fromMillisecondsSinceEpoch(c['nowMillis'] as int),
        );
        final offer = result.offer;
        expect({
          'priceInPaise': result.priceInPaise,
          'listPriceInPaise': result.listPriceInPaise,
          'memberPriceApplied': result.memberPriceApplied,
          'memberPriceBlockedReason': result.bookingCapReached
              ? 'bookingCapReached'
              : null,
          'admission': result.admissionBlock?.name,
          'memberEntitled': result.memberEntitled,
          'offer': offer == null
              ? null
              : {
                  'planId': offer.planId,
                  'planName': offer.planName,
                  'interval': offer.interval.name,
                  'planPriceInPaise': offer.planPriceInPaise,
                  'memberPriceInPaise': offer.memberPriceInPaise,
                  'savingsInPaise': offer.savingsInPaise,
                  'unlocksAccess': offer.unlocksAccess,
                },
        }, c['expected']);
      });
    }
  });
}
