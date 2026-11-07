import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/hosts/organizer/payments_body.dart';
import 'package:catch_dating_app/hosts/organizer/payments_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'organizer_fixtures.dart';

class _Calls {
  final actions = <PaymentsAction>[];
  final paid = <HostOrganizerBill>[];
}

Future<_Calls> _pump(WidgetTester tester, PaymentsState state) async {
  final calls = _Calls();
  await pumpOrganizerBody(
    tester,
    PaymentsBody(
      state: state,
      onAction: calls.actions.add,
      onPay: calls.paid.add,
    ),
  );
  return calls;
}

void main() {
  testWidgets('an owner sees Razorpay, the bill and its cap, the plan, the '
      'bills and set-up', (tester) async {
    final current = organizerBill();
    final calls = await _pump(
      tester,
      PaymentsState(
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
    expect(find.text('₹7,400'), findsWidgets);
    expect(
      find.text(
        '₹2,600 to the ₹10,000 cap. After that, nothing more this cycle.',
      ),
      findsOneWidget,
    );
    expect(find.text('Your plan'), findsOneWidget);
    expect(find.text('Due'), findsOneWidget);
    expect(find.text('Paid'), findsOneWidget);
    expect(find.text('Free'), findsOneWidget);
    expect(find.text('Your first 30 days'), findsOneWidget);

    await tester.tap(find.text('Compare plans'));
    await tester.tap(find.byKey(const ValueKey('payments-pay-bill')));
    await tester.tap(find.byKey(const ValueKey('payments-row-razorpay')));
    await tester.tap(find.text('Refunds'));
    expect(calls.actions, [
      PaymentsAction.comparePlans,
      PaymentsAction.disconnect,
      PaymentsAction.refunds,
    ]);
    expect(calls.paid, [current]);
  });

  testWidgets('without a connection the tile offers Connect Razorpay', (
    tester,
  ) async {
    final calls = await _pump(
      tester,
      PaymentsState(
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
    expect(calls.actions, [PaymentsAction.connect]);
  });

  testWidgets('a broken connection offers Reconnect', (tester) async {
    final calls = await _pump(
      tester,
      PaymentsState(
        isOwner: true,
        currencyCode: 'INR',
        now: organizerNow,
        setup: razorpaySetup(ready: false),
        bills: const [],
      ),
    );

    expect(find.text('Needs reconnecting'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('payments-razorpay-reconnect')));
    expect(calls.actions, [PaymentsAction.reconnect]);
  });

  testWidgets('failed bills offer a retry', (tester) async {
    final calls = await _pump(
      tester,
      PaymentsState(
        isOwner: true,
        currencyCode: 'INR',
        now: organizerNow,
        setup: razorpaySetup(),
        billsError: StateError('offline'),
      ),
    );

    expect(find.text('We couldn’t load your bills.'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    expect(calls.actions, [PaymentsAction.retryBills]);
  });

  testWidgets('a host who is not the owner sees why there is no money', (
    tester,
  ) async {
    await _pump(
      tester,
      PaymentsState(isOwner: false, currencyCode: 'INR', now: organizerNow),
    );

    expect(find.text('Only the owner sees money'), findsOneWidget);
    expect(find.text('Guests pay you directly'), findsNothing);
  });
}
