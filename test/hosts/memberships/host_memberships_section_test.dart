import 'package:catch_dating_app/contexts/payments/data/host_membership_admin_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/domain/host_membership_admin.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_section.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../host_memberships/host_membership_fixtures.dart';
import '../../test_pump_helpers.dart';

HostMembershipProgramView _program({
  Map<String, Object?>? program,
  bool routeReady = true,
  bool fee = true,
}) => HostMembershipProgramView.fromResponse({
  'organizerId': 'organizer-1',
  'program': program,
  'routeAccountReady': routeReady,
  'feeConfigured': fee,
});

const _enabled = {
  'state': 'enabled',
  'provider': 'razorpay',
  'mode': 'test',
  'billingPauseState': 'active',
  'memberCount': 12,
  'revision': 2,
};

Future<void> _pump(
  WidgetTester tester,
  HostMembershipsState state, {
  required List<HostMembershipProgramCommand> commands,
  List<HostMembershipPlan?>? opened,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      child: MaterialApp(
        theme: AppTheme.light,
        builder: catchNoticeOverlayBuilder,
        home: Scaffold(
          body: SingleChildScrollView(
            child: HostMembershipsSection(
              state: state,
              onProgramCommand: commands.add,
              onOpenPlan: (plan) => opened?.add(plan),
            ),
          ),
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

void main() {
  testWidgets('enabling requires a ready payout account', (tester) async {
    final commands = <HostMembershipProgramCommand>[];
    await _pump(
      tester,
      HostMembershipsState(program: _program(), plans: const []),
      commands: commands,
    );
    expect(find.text('OFF'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('host-memberships-enable')));
    expect(commands, [HostMembershipProgramCommand.enable]);

    await _pump(
      tester,
      HostMembershipsState(
        program: _program(routeReady: false),
        plans: const [],
      ),
      commands: commands,
    );
    expect(find.byKey(const ValueKey('host-memberships-enable')), findsNothing);
    expect(find.text('Set up required'), findsOneWidget);
  });

  testWidgets('an enabled program pauses billing and lists plans', (
    tester,
  ) async {
    final commands = <HostMembershipProgramCommand>[];
    final opened = <HostMembershipPlan?>[];
    await _pump(
      tester,
      HostMembershipsState(
        program: _program(program: _enabled),
        plans: [testPlan()],
      ),
      commands: commands,
      opened: opened,
    );
    expect(find.text('TEST MODE'), findsOneWidget);
    expect(find.text('12'), findsOneWidget);
    expect(find.textContaining('On sale'), findsOneWidget);
    await tester.tap(
      find.byKey(const ValueKey('host-memberships-billing-pause')),
    );
    expect(commands, [HostMembershipProgramCommand.pauseBilling]);
    await tester.tap(find.byKey(const ValueKey('host-memberships-new-plan')));
    await tester.tap(
      find.byKey(const ValueKey('host-membership-plan-$testPlanId')),
    );
    expect(opened.map((plan) => plan?.id), [null, testPlanId]);
  });

  test('plan drafts validate the mandate price window', () {
    expect(
      const HostMembershipPlanDraft(
        name: 'Club',
        monthlyPriceInPaise: 49900,
      ).isValid,
      isTrue,
    );
    expect(
      const HostMembershipPlanDraft(
        name: 'Club',
        annualPriceInPaise: 1600000,
      ).isValid,
      isFalse,
    );
    expect(const HostMembershipPlanDraft(name: 'Club').isValid, isFalse);
    expect(
      const HostMembershipPlanDraft(
        name: ' Club ',
        monthlyPriceInPaise: 49900,
        perks: [' Coffee ', ''],
        benefits: [HostMembershipEventDiscount(100)],
      ).toPayload(),
      {
        'name': 'Club',
        'description': '',
        'prices': {
          'monthly': {'amountPaise': 49900},
        },
        'memberCap': null,
        'trialDays': 0,
        'benefits': [
          {'type': 'eventDiscount', 'percentOff': 100},
        ],
        'perks': ['Coffee'],
        'limits': {'maxUpcomingMemberPricedBookings': null},
        'sortOrder': 0,
      },
    );
  });

  test('event rules parse overrides and the computed general sale', () {
    final rules = HostEventMembershipRules.fromResponse({
      'eventId': 'event-1',
      'organizerId': 'organizer-1',
      'rules': {
        'memberPriceOverrides': [
          {'planId': testPlanId, 'priceInPaise': 0},
        ],
        'earlyAccessHours': 48,
        'generalSaleOpensAtMillis': 1000,
        'membersOnly': true,
        'revision': 3,
      },
      'plans': [
        {
          'planId': testPlanId,
          'name': 'Sunday Runners',
          'status': 'published',
          'benefits': [
            {'type': 'earlyAccess'},
          ],
        },
      ],
    });
    expect(rules.overrideFor(testPlanId)?.included, isTrue);
    expect(rules.earlyAccessHours, 48);
    expect(rules.membersOnly, isTrue);
    expect(rules.plans.single.grantsEarlyAccess, isTrue);
    expect(
      const HostEventMemberPriceOverride.percentOff(
        planId: testPlanId,
        percentOff: 20,
      ).toPayload(),
      {'planId': testPlanId, 'percentOff': 20},
    );
  });
}
