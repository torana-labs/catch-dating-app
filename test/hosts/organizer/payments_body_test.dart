import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_billing_status.dart';
import 'package:catch_dating_app/hosts/organizer/payments_body.dart';
import 'package:catch_dating_app/hosts/organizer/payments_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizer_fixtures.dart';

class _Calls {
  final actions = <OrganizerPaymentsAction>[];
}

Future<_Calls> _pump(WidgetTester tester, OrganizerPaymentsState state) async {
  final calls = _Calls();
  await pumpOrganizerBody(
    tester,
    OrganizerPaymentsBody(state: state, onAction: calls.actions.add),
  );
  return calls;
}

void main() {
  testWidgets('an owner sees Razorpay, the bill status, the plan, the bills '
      'and set-up, with no Catch price and no way to pay or buy', (
    tester,
  ) async {
    final current = organizerBill();
    final calls = await _pump(
      tester,
      OrganizerPaymentsState(
        isOwner: true,
        currencyCode: 'INR',
        now: organizerNow,
        setup: razorpaySetup(),
        bills: [
          current,
          organizerBill(
            id: 'bill-sep',
            month: DateTime(2026, 9),
            status: HostOrganizerBillStatus.paid,
            commissionMinor: 1000000,
            capped: true,
          ),
          organizerBill(
            id: 'bill-aug',
            month: DateTime(2026, 8),
            status: HostOrganizerBillStatus.free,
            commissionMinor: 0,
          ),
        ],
      ),
    );

    expect(find.text('Guests pay you directly'), findsOneWidget);
    expect(find.text('Connected'), findsWidgets);
    expect(find.text('Your Catch bill · October 2026'), findsOneWidget);
    expect(find.text('Due November 15'), findsOneWidget);
    expect(find.textContaining('Catch emailed you this bill.'), findsOneWidget);
    expect(find.text('Your plan'), findsOneWidget);
    expect(find.text('Ticketing plan'), findsOneWidget);
    expect(find.text('Due'), findsOneWidget);
    expect(find.text('Paid'), findsOneWidget);
    expect(find.text('Free'), findsOneWidget);
    expect(find.text('Your first 30 days'), findsOneWidget);
    // App Store guideline 3.1.3(f): no Catch price, cap, Pay or plan link.
    expect(find.text('₹7,400'), findsNothing);
    expect(find.textContaining('cap.'), findsNothing);
    expect(find.text('Compare plans'), findsNothing);
    expect(find.byKey(const ValueKey('payments-pay-bill')), findsNothing);
    expect(find.byKey(const ValueKey('payments-compare-plans')), findsNothing);

    await tester.tap(find.byKey(const ValueKey('payments-row-razorpay')));
    await tester.tap(find.text('Refunds'));
    expect(calls.actions, [
      OrganizerPaymentsAction.disconnect,
      OrganizerPaymentsAction.refunds,
    ]);
  });

  testWidgets('a refund credit is status text on the bill, never an amount', (
    tester,
  ) async {
    await _pump(
      tester,
      OrganizerPaymentsState(
        isOwner: true,
        currencyCode: 'INR',
        now: organizerNow,
        setup: razorpaySetup(),
        bills: [
          organizerBill(refundCreditAppliedMinor: 2500),
          organizerBill(
            id: 'bill-sep',
            month: DateTime(2026, 9),
            status: HostOrganizerBillStatus.free,
            commissionMinor: 0,
            refundCreditAppliedMinor: 5000,
            refundCreditCarriedMinor: 45000,
          ),
        ],
      ),
    );

    expect(find.textContaining('includes a refund credit'), findsOneWidget);
    expect(find.text('Covered by a refund credit'), findsOneWidget);
    expect(find.text('Your first 30 days'), findsNothing);
    // App Store guideline 3.1.3(f): no Catch amount for the credit.
    expect(find.textContaining('₹25'), findsNothing);
    expect(find.textContaining('₹450'), findsNothing);
  });

  testWidgets('the plan shows tools-only as status, never its price', (
    tester,
  ) async {
    await _pump(
      tester,
      OrganizerPaymentsState(
        isOwner: true,
        currencyCode: 'INR',
        now: organizerNow,
        setup: razorpaySetup(),
        bills: const [],
        plan: HostPlanStatus(
          kind: HostPlanKind.toolsOnly,
          state: HostPlanState.active,
          startsAt: DateTime(2026, 10),
          endsAt: DateTime(2027, 1, 8),
        ),
      ),
    );
    expect(find.text('Tools-only plan until Jan 8, 2027'), findsOneWidget);
    expect(find.text('No bills yet'), findsOneWidget);
  });

  testWidgets('without a connection the tile offers Connect Razorpay', (
    tester,
  ) async {
    final calls = await _pump(
      tester,
      OrganizerPaymentsState(
        isOwner: true,
        currencyCode: 'INR',
        now: organizerNow,
        setup: razorpaySetup(connected: false),
        bills: const [],
      ),
    );

    expect(find.text('Not connected'), findsWidgets);
    expect(find.text('No bills yet.'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('payments-razorpay-connect')));
    expect(calls.actions, [OrganizerPaymentsAction.connect]);
  });

  testWidgets('a broken connection offers Reconnect', (tester) async {
    final calls = await _pump(
      tester,
      OrganizerPaymentsState(
        isOwner: true,
        currencyCode: 'INR',
        now: organizerNow,
        setup: razorpaySetup(ready: false),
        bills: const [],
      ),
    );

    expect(find.text('Needs reconnecting'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('payments-razorpay-reconnect')));
    expect(calls.actions, [OrganizerPaymentsAction.reconnect]);
  });

  testWidgets('failed bills offer a retry', (tester) async {
    final calls = await _pump(
      tester,
      OrganizerPaymentsState(
        isOwner: true,
        currencyCode: 'INR',
        now: organizerNow,
        setup: razorpaySetup(),
        billsError: StateError('offline'),
      ),
    );

    expect(find.text('We couldn’t load your bills.'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    expect(calls.actions, [OrganizerPaymentsAction.retryBills]);
  });

  testWidgets('a host who is not the owner sees why there is no money', (
    tester,
  ) async {
    await _pump(
      tester,
      OrganizerPaymentsState(
        isOwner: false,
        currencyCode: 'INR',
        now: organizerNow,
      ),
    );

    expect(find.text('Only the owner sees money'), findsOneWidget);
    expect(find.text('Guests pay you directly'), findsNothing);
  });

  group('trial status', () {
    OrganizerPaymentsState withTrial(HostTrialStatus? trial) =>
        OrganizerPaymentsState(
          isOwner: true,
          currencyCode: 'INR',
          now: organizerNow,
          setup: razorpaySetup(),
          bills: const [],
          trial: trial,
        );

    testWidgets('a running trial shows days left and its end, no price', (
      tester,
    ) async {
      await _pump(
        tester,
        withTrial(
          HostTrialStatus(
            state: HostTrialState.active,
            startsAt: DateTime(2026, 10, 20),
            endsAt: DateTime(2026, 11, 19),
            daysLeft: 12,
          ),
        ),
      );
      expect(find.text('Free trial · 12 days left'), findsOneWidget);
      expect(
        find.text('Your free trial ends on Nov 19, 2026.'),
        findsOneWidget,
      );
    });

    testWidgets('an ended trial is neutral status with its date', (
      tester,
    ) async {
      await _pump(
        tester,
        withTrial(
          HostTrialStatus(
            state: HostTrialState.ended,
            startsAt: DateTime(2026, 9),
            endsAt: DateTime(2026, 10),
            daysLeft: null,
          ),
        ),
      );
      expect(find.text('Trial ended on Oct 1, 2026'), findsOneWidget);
    });

    testWidgets('before the first event the trial waits for it', (
      tester,
    ) async {
      await _pump(
        tester,
        withTrial(
          const HostTrialStatus(
            state: HostTrialState.notStarted,
            startsAt: null,
            endsAt: null,
            daysLeft: null,
          ),
        ),
      );
      expect(
        find.text('Free trial starts with your first event'),
        findsOneWidget,
      );
    });

    testWidgets('unknown terms or no status show nothing', (tester) async {
      await _pump(
        tester,
        withTrial(
          const HostTrialStatus(
            state: HostTrialState.unconfigured,
            startsAt: null,
            endsAt: null,
            daysLeft: null,
          ),
        ),
      );
      expect(find.byKey(const ValueKey('payments-trial-status')), findsNothing);
      await _pump(tester, withTrial(null));
      expect(find.byKey(const ValueKey('payments-trial-status')), findsNothing);
    });
  });

  testWidgets('revoked Razorpay access says so and offers Reconnect', (
    tester,
  ) async {
    final calls = await _pump(
      tester,
      OrganizerPaymentsState(
        isOwner: true,
        currencyCode: 'INR',
        now: organizerNow,
        setup: razorpaySetup(
          ready: false,
          lastErrorCode: 'authorizationRevoked',
        ),
        bills: const [],
      ),
    );
    expect(find.text('Needs reconnecting'), findsWidgets);
    expect(
      find.textContaining(
        "Catch's access to your Razorpay account was removed",
      ),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('payments-razorpay-reconnect')));
    expect(calls.actions, [OrganizerPaymentsAction.reconnect]);
  });
}
