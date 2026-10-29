import 'package:catch_dating_app/host_memberships/domain/host_membership.dart';
import 'package:catch_dating_app/host_memberships/domain/host_membership_benefit_use.dart';
import 'package:catch_dating_app/host_memberships/domain/host_membership_checkout.dart';
import 'package:catch_dating_app/host_memberships/domain/host_membership_event_facts.dart';
import 'package:catch_dating_app/host_memberships/domain/host_membership_plan.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_state.dart';
import 'package:flutter_test/flutter_test.dart';

import 'host_membership_fixtures.dart';

void main() {
  group('HostMembership', () {
    test('parses the server document and tenure', () {
      final membership = testMembership();
      expect(membership.status, HostMembershipStatus.active);
      expect(membership.interval, HostMembershipInterval.monthly);
      expect(membership.isCurrent, isTrue);
      expect(membership.tenureAt(testNow).inDays, 35);
      expect(membership.availableActions, {
        HostMembershipAction.pause,
        HostMembershipAction.cancelAtPeriodEnd,
      });
    });

    test('maps every wire status and rejects unknown ones', () {
      for (final status in HostMembershipStatus.values) {
        expect(
          HostMembership.fromMap(
            testMembershipId,
            membershipMap(status: status.wireValue),
          ).status,
          status,
        );
      }
      expect(
        () => HostMembership.fromMap(
          testMembershipId,
          membershipMap(status: 'lapsed'),
        ),
        throwsFormatException,
      );
    });

    test('offers only the self-serve moves the server accepts', () {
      expect(
        testMembership(
          status: 'paused',
          pause: {'initiator': 'member', 'pausedAtMillis': 1},
        ).availableActions,
        {HostMembershipAction.resume},
      );
      final hostPaused = testMembership(
        status: 'paused',
        pause: {'initiator': 'host', 'pausedAtMillis': 1},
      );
      expect(hostPaused.pausedByHost, isTrue);
      expect(hostPaused.availableActions, isEmpty);
      expect(testMembership(status: 'canceling').availableActions, isEmpty);
      expect(testMembership(status: 'past_due').availableActions, {
        HostMembershipAction.cancelAtPeriodEnd,
      });
      expect(testMembership(status: 'expired').isCurrent, isFalse);
    });
  });

  group('HostMembershipPlan', () {
    test('parses prices, benefits, perks and limits', () {
      final plan = testPlan();
      expect(plan.monthlyPriceInPaise, 49900);
      expect(plan.annualPriceInPaise, 499900);
      expect(plan.intervals, HostMembershipInterval.values);
      expect(plan.eventDiscount?.includesEvents, isTrue);
      expect(plan.hasEarlyAccess, isTrue);
      expect(plan.hasMembersOnlyAccess, isFalse);
      expect(plan.perks, ['Free coffee after the run']);
      expect(plan.maxUpcomingMemberPricedBookings, 2);
      expect(plan.isFull, isFalse);
      expect(testPlan(memberCap: 3).isFull, isTrue);
    });

    test('benefits round-trip to the save payload', () {
      final plan = testPlan();
      expect(plan.benefits.map((benefit) => benefit.toPayload()).toList(), [
        {'type': 'eventDiscount', 'percentOff': 100},
        {'type': 'earlyAccess'},
      ]);
      expect(
        () => HostMembershipBenefit.fromMap({'type': 'guestPass'}),
        throwsFormatException,
      );
    });

    test('pricing hint flags plans below a regular spend', () {
      expect(
        hostMembershipPricingHint(
          monthlyPriceInPaise: 99900,
          annualPriceInPaise: null,
          typicalEventPriceInPaise: 50000,
          discountPercent: 100,
        ),
        HostMembershipPricingHint.belowTypicalSpend,
      );
      expect(
        hostMembershipPricingHint(
          monthlyPriceInPaise: null,
          annualPriceInPaise: 2400000,
          typicalEventPriceInPaise: 50000,
          discountPercent: 100,
        ),
        HostMembershipPricingHint.healthy,
      );
      expect(
        hostMembershipPricingHint(
          monthlyPriceInPaise: 49900,
          annualPriceInPaise: null,
          typicalEventPriceInPaise: null,
          discountPercent: 100,
        ),
        HostMembershipPricingHint.none,
      );
    });
  });

  group('savings', () {
    test('sums unreleased member-priced bookings per membership', () {
      final uses = [
        testBenefitUse(),
        testBenefitUse(id: 'event-2_member-1', savings: 20000),
        testBenefitUse(id: 'event-3_member-1', savings: 9000, released: true),
        testBenefitUse(
          id: 'event-4_member-1',
          savings: 1000,
          membershipId: 'hm_other',
        ),
      ];
      expect(hostMembershipSavingsInPaise(uses), 71000);
      expect(
        hostMembershipSavingsInPaise(uses, membershipId: testMembershipId),
        70000,
      );
      final state = MyMembershipsState.from(
        memberships: [
          testMembership(status: 'expired', id: 'hm_old'),
          testMembership(),
        ],
        benefitUses: uses,
      );
      expect(state.rows.first.membership.id, testMembershipId);
      expect(state.rows.first.savedInPaise, 70000);
      expect(state.totalSavedInPaise, 71000);
      expect(state.currentMemberships, hasLength(1));
    });
  });

  group('callable responses', () {
    test('checkout progress parses strictly', () {
      final checkout = HostMembershipCheckout.fromResponse({
        'checkoutId': 'hmc_AbCdEfGhIjKlMnOpQrSt',
        'state': 'authorized',
        'authorizationUrl': null,
        'expiresAtMillis': 1,
        'membershipId': testMembershipId,
        'membershipStatus': 'trialing',
      });
      expect(checkout.isComplete, isTrue);
      expect(checkout.membershipStatus, HostMembershipStatus.trialing);
      expect(
        () => HostMembershipCheckout.fromResponse({'state': 'open'}),
        throwsFormatException,
      );
    });

    test('event membership facts require the exact key set', () {
      final facts = EventHostMembershipFacts.fromMap({
        'member': null,
        'listPriceInPaise': 50000,
        'memberPriceApplied': false,
        'memberPriceBlockedReason': null,
        'savingsInPaise': 0,
        'membersOnly': false,
        'generalSaleOpensAtMillis': null,
        'offer': {
          'planId': testPlanId,
          'planName': 'Sunday Runners',
          'interval': 'monthly',
          'planPriceInPaise': 49900,
          'memberPriceInPaise': 0,
          'savingsInPaise': 50000,
          'unlocksAccess': false,
        },
      });
      expect(facts.offer?.makesEventFree, isTrue);
      expect(
        () => EventHostMembershipFacts.fromMap({'member': null}),
        throwsFormatException,
      );
    });
  });
}
