import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_event_facts.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_badge.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_plans_section.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_upsell_banner.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_screen.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'host_membership_fixtures.dart';

Widget _wrap(Widget child) => ProviderScope(
  child: MaterialApp(
    theme: AppTheme.light,
    builder: catchNoticeOverlayBuilder,
    home: Scaffold(body: SingleChildScrollView(child: child)),
  ),
);

void main() {
  group('MyMembershipsList', () {
    testWidgets('shows savings and the actions the status allows', (
      tester,
    ) async {
      final actions = <HostMembershipAction>[];
      final state = MyMembershipsState.from(
        memberships: [testMembership()],
        benefitUses: [testBenefitUse()],
      );
      await tester.pumpWidget(
        _wrap(
          MyMembershipsList(
            state: state,
            now: testNow,
            onAction: (_, action) => actions.add(action),
          ),
        ),
      );
      await pumpFeatureUi(tester);

      expect(find.text('SUNDAY RUNNERS'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);
      expect(find.text('Saved so far'), findsOneWidget);
      expect(find.textContaining('500'), findsWidgets);
      expect(
        find.byKey(const ValueKey('host-membership-resume-$testMembershipId')),
        findsNothing,
      );
      await tester.tap(
        find.byKey(const ValueKey('host-membership-pause-$testMembershipId')),
      );
      await tester.tap(
        find.byKey(
          const ValueKey('host-membership-cancelAtPeriodEnd-$testMembershipId'),
        ),
      );
      expect(actions, [
        HostMembershipAction.pause,
        HostMembershipAction.cancelAtPeriodEnd,
      ]);
    });

    testWidgets('explains a host billing pause and offers no actions', (
      tester,
    ) async {
      final state = MyMembershipsState.from(
        memberships: [
          testMembership(
            status: 'paused',
            pause: {'initiator': 'host', 'pausedAtMillis': 1},
          ),
        ],
        benefitUses: const [],
      );
      await tester.pumpWidget(
        _wrap(
          MyMembershipsList(state: state, now: testNow, onAction: (_, _) {}),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Paused by organizer'), findsOneWidget);
      expect(find.text('Billing paused by the organizer'), findsOneWidget);
      expect(find.text('Resume membership'), findsNothing);
    });

    testWidgets('renders an empty state', (tester) async {
      await tester.pumpWidget(
        _wrap(
          SizedBox(
            height: 600,
            child: MyMembershipsList(
              state: MyMembershipsState.from(
                memberships: const [],
                benefitUses: const [],
              ),
              now: testNow,
              onAction: (_, _) {},
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('No memberships yet'), findsOneWidget);
    });
  });

  group('HostMembershipUpsellBanner', () {
    testWidgets('names the plan and opens it', (tester) async {
      var joined = false;
      await tester.pumpWidget(
        _wrap(
          HostMembershipUpsellBanner(
            offer: const HostMembershipEventOffer(
              planId: testPlanId,
              planName: 'Sunday Runners',
              interval: HostMembershipInterval.monthly,
              planPriceInPaise: 49900,
              memberPriceInPaise: 0,
              savingsInPaise: 50000,
              unlocksAccess: false,
            ),
            onJoin: () => joined = true,
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Free with a membership'), findsOneWidget);
      expect(find.textContaining('Join Sunday Runners'), findsOneWidget);
      await tester.tap(find.text('See membership'));
      expect(joined, isTrue);
    });
  });

  group('HostMembershipPlansList', () {
    testWidgets('lists plans and marks the current one', (tester) async {
      final opened = <String>[];
      await tester.pumpWidget(
        _wrap(
          HostMembershipPlansList(
            plans: [testPlan()],
            currentMembership: null,
            onOpenPlan: (plan) => opened.add(plan.id),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('MEMBERSHIPS'), findsOneWidget);
      expect(find.textContaining('Events included'), findsOneWidget);
      await tester.tap(
        find.byKey(const ValueKey('host-membership-plan-$testPlanId')),
      );
      expect(opened, [testPlanId]);

      await tester.pumpWidget(
        _wrap(
          HostMembershipPlansList(
            plans: [testPlan()],
            currentMembership: testMembership(),
            onOpenPlan: (plan) => opened.add(plan.id),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Your plan'), findsOneWidget);
    });
  });

  testWidgets('member badge hides for ended memberships', (tester) async {
    await tester.pumpWidget(
      _wrap(const HostMembershipBadge(planName: 'Sunday Runners')),
    );
    expect(find.text('MEMBER · SUNDAY RUNNERS'), findsOneWidget);
    await tester.pumpWidget(
      _wrap(const HostMembershipBadge(status: HostMembershipStatus.expired)),
    );
    expect(find.text('MEMBER'), findsNothing);
  });
}
