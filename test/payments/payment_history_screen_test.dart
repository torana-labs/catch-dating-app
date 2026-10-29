import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_history_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_keys.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_screen.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

/// Wraps [child] in a MaterialApp with an iPhone SE-sized surface so that
/// bottom sheets don't overflow during tests.
Widget _wrapPhoneSized(Widget child) {
  return MaterialApp(
    theme: AppTheme.light,
    builder: catchNoticeOverlayBuilder,
    home: SizedBox(width: 375, height: 812, child: child),
  );
}

void main() {
  group('PaymentHistoryScreen', () {
    for (final item in [
      (PaymentCancellationRefundState.pending, 25000, 0, 'Refund pending'),
      (
        PaymentCancellationRefundState.complete,
        12500,
        12500,
        'Partially refunded',
      ),
      (PaymentCancellationRefundState.complete, 0, 0, 'Booking cancelled'),
      (
        PaymentCancellationRefundState.reviewRequired,
        25000,
        0,
        'Refund needs review',
      ),
    ]) {
      testWidgets('renders cancellation state ${item.$4}', (tester) async {
        if (item.$1 == PaymentCancellationRefundState.reviewRequired) {
          tester.view.physicalSize = const Size(390, 844);
          tester.view.devicePixelRatio = 1;
          tester.platformDispatcher.textScaleFactorTestValue = 2;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        }

        final payment =
            _payment(
              id: 'pay-cancelled',
              orderId: 'order-1',
              eventId: 'event-1',
              status: PaymentStatus.completed,
              createdAt: DateTime(2026, 5),
            ).copyWith(
              cancellationRefund: PaymentCancellationRefund(
                state: item.$1,
                targetAmountMinor: item.$2,
                confirmedAmountMinor: item.$3,
              ),
            );
        await _pumpPaymentHistory(
          tester,
          payments: [payment],
          events: {'event-1': buildEvent()},
        );
        expect(find.text(item.$4), findsOneWidget);
        expect(find.text('Paid'), findsNothing);
        expect(tester.takeException(), isNull);
        if (item.$1 == PaymentCancellationRefundState.reviewRequired) {
          await tester.tap(
            find.byKey(PaymentHistoryKeys.paymentTile('pay-cancelled')),
          );
          await _pumpPaymentSheet(tester);
          expect(tester.takeException(), isNull);
        }
      });
    }

    testWidgets('shows booking failure details for sign-up failures', (
      tester,
    ) async {
      await _pumpPaymentHistory(
        tester,
        payments: [
          _payment(
            id: 'pay-1',
            orderId: 'order-1',
            eventId: 'event-1',
            status: PaymentStatus.completed,
            signUpFailed: true,
            createdAt: DateTime(2025, 1, 2),
          ),
        ],
        events: {'event-1': buildEvent()},
      );

      expect(_topBarMaterial(tester).color, CatchTokens.editorialLight.bg);
      expect(find.text('Booking failed'), findsOneWidget);
      expect(
        find.text('No spot was reserved. Refund may still be pending.'),
        findsOneWidget,
      );
    });

    testWidgets('shows refunded recovery details for sign-up failures', (
      tester,
    ) async {
      await _pumpPaymentHistory(
        tester,
        payments: [
          _payment(
            id: 'pay-2',
            orderId: 'order-2',
            eventId: 'event-2',
            status: PaymentStatus.refunded,
            signUpFailed: true,
            createdAt: DateTime(2025, 1, 3),
          ),
        ],
        events: {'event-2': buildEvent(id: 'event-2')},
      );

      expect(find.text('Refunded'), findsOneWidget);
      expect(
        find.text('Booking failed, but your payment was refunded.'),
        findsOneWidget,
      );
    });

    testWidgets('tapping a payment tile opens detail bottom sheet', (
      tester,
    ) async {
      await _pumpPaymentHistory(
        tester,
        payments: [
          _payment(
            id: 'pay-3',
            orderId: 'order-3',
            paymentId: 'pay_XYZ789',
            eventId: 'event-3',
            amount: 19900,
            status: PaymentStatus.completed,
            createdAt: DateTime(2025, 2, 10),
          ),
        ],
        events: {'event-3': buildEvent(id: 'event-3')},
      );

      await tester.tap(find.byKey(PaymentHistoryKeys.paymentTile('pay-3')));
      await _pumpPaymentSheet(tester);

      expect(find.text('Payment ID'), findsOneWidget);
      expect(find.text('pay_XYZ789'), findsOneWidget);
      expect(find.text('Order ID'), findsOneWidget);
      expect(find.text('order-3'), findsOneWidget);
      expect(find.text('10 Feb 2025 · 12:00 AM'), findsWidgets);
    });

    testWidgets('detail sheet labels and performs support guidance honestly', (
      tester,
    ) async {
      await _pumpPaymentHistory(
        tester,
        payments: [
          _payment(
            id: 'pay-4',
            orderId: 'order-4',
            eventId: 'event-4',
            status: PaymentStatus.completed,
            signUpFailed: true,
            createdAt: DateTime(2025, 3),
          ),
        ],
        events: {'event-4': buildEvent(id: 'event-4')},
      );

      await tester.tap(find.byKey(PaymentHistoryKeys.paymentTile('pay-4')));
      await _pumpPaymentSheet(tester);

      expect(find.text('How to get help with this booking'), findsOneWidget);

      await tester.ensureVisible(
        find.text('How to get help with this booking'),
      );
      await tester.pump();
      await tester.tap(find.text('How to get help with this booking'));
      await pumpFeatureUi(tester);

      expect(find.byType(PaymentReceiptSheet), findsNothing);
      expect(
        find.text(
          'Contact Catch support and include the payment and order IDs shown on this receipt.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('shows all status badge variants correctly', (tester) async {
      await _pumpPaymentHistory(
        tester,
        payments: [
          _payment(
            id: 'pay-completed',
            orderId: 'order-c',
            paymentId: 'pay-c',
            eventId: 'event-a',
            amount: 10000,
            status: PaymentStatus.completed,
            createdAt: DateTime(2025, 1, 10),
          ),
          _payment(
            id: 'pay-failed',
            orderId: 'order-f',
            paymentId: 'pay-f',
            eventId: 'event-b',
            amount: 5000,
            status: PaymentStatus.failed,
            createdAt: DateTime(2025, 1, 9),
          ),
          _payment(
            id: 'pay-pending',
            orderId: 'order-p',
            paymentId: 'pay-p',
            eventId: 'event-c',
            amount: 7500,
            status: PaymentStatus.pending,
            createdAt: DateTime(2025, 1, 8),
          ),
        ],
        events: {
          'event-a': buildEvent(id: 'event-a'),
          'event-b': buildEvent(id: 'event-b'),
          'event-c': buildEvent(id: 'event-c'),
        },
      );

      expect(find.text('Paid'), findsOneWidget);
      expect(find.text('Failed'), findsOneWidget);
      expect(find.text('Pending'), findsOneWidget);
    });

    testWidgets(
      'uses batched event titles and labels missing events honestly',
      (tester) async {
        final resolvedEvent = buildEvent(
          id: 'event-resolved',
          startTime: DateTime(2025, 4, 7, 7),
        );

        await _pumpPaymentHistory(
          tester,
          payments: [
            _payment(
              id: 'pay-resolved',
              orderId: 'order-resolved',
              eventId: resolvedEvent.id,
              status: PaymentStatus.completed,
              createdAt: DateTime(2025, 4, 8),
            ),
            _payment(
              id: 'pay-missing',
              orderId: 'order-missing',
              eventId: 'event-missing',
              status: PaymentStatus.completed,
              createdAt: DateTime(2025, 4, 7),
            ),
          ],
          events: {resolvedEvent.id: resolvedEvent},
        );

        expect(find.text(resolvedEvent.title), findsOneWidget);
        expect(find.text('Event unavailable'), findsOneWidget);
        expect(find.text('Event booking'), findsNothing);
      },
    );

    testWidgets('keeps event-title loading distinct from missing events', (
      tester,
    ) async {
      final events = StreamController<List<Event>>();
      addTearDown(events.close);

      await _pumpPaymentHistory(
        tester,
        payments: [
          _payment(
            id: 'pay-loading',
            orderId: 'order-loading',
            eventId: 'event-loading',
            status: PaymentStatus.completed,
            createdAt: DateTime(2025, 4, 8),
          ),
        ],
        events: const {},
        eventStream: events.stream,
        settle: false,
      );

      expect(find.byType(PaymentHistorySkeleton), findsOneWidget);
      expect(find.text('Event unavailable'), findsNothing);

      final resolvedEvent = buildEvent(id: 'event-loading');
      events.add([resolvedEvent]);
      await pumpFeatureUi(tester);
      expect(find.text(resolvedEvent.title), findsOneWidget);
    });

    testWidgets('event-title failure exposes an event-specific retry state', (
      tester,
    ) async {
      await _pumpPaymentHistory(
        tester,
        payments: [
          _payment(
            id: 'pay-error',
            orderId: 'order-error',
            eventId: 'event-error',
            status: PaymentStatus.completed,
            createdAt: DateTime(2025, 4, 8),
          ),
        ],
        events: const {},
        eventStream: Stream.error(StateError('event titles failed')),
      );

      expect(find.text('Event unavailable'), findsOneWidget);
      expect(find.text('Reload event'), findsOneWidget);
      expect(
        find.byKey(PaymentHistoryKeys.paymentTile('pay-error')),
        findsNothing,
      );
    });
  });
}

Material _topBarMaterial(WidgetTester tester) {
  return tester.widget<Material>(
    find
        .descendant(
          of: find.byType(CatchTopBar),
          matching: find.byType(Material),
        )
        .first,
  );
}

Future<void> _pumpPaymentSheet(WidgetTester tester) async {
  await pumpFeatureUi(tester);
}

Future<void> _pumpPaymentHistory(
  WidgetTester tester, {
  required List<Payment> payments,
  required Map<String, Event> events,
  Stream<List<Event>>? eventStream,
  bool settle = true,
}) async {
  final eventIds = {for (final payment in payments) payment.eventId};

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        watchPaymentsForUserProvider(
          'runner-1',
        ).overrideWith((ref) => Stream.value(payments)),
        if (eventIds.isNotEmpty)
          watchEventsByIdsProvider(EventsByIdQuery(eventIds)).overrideWith(
            (ref) => eventStream ?? Stream.value(events.values.toList()),
          ),
      ],
      child: _wrapPhoneSized(const PaymentHistoryScreen()),
    ),
  );
  if (settle) {
    await pumpFeatureUi(tester);
  } else {
    await tester.pump();
    await tester.pump();
  }
}

Payment _payment({
  required String id,
  required String orderId,
  required String eventId,
  required PaymentStatus status,
  required DateTime createdAt,
  String? paymentId,
  int amount = 25000,
  bool signUpFailed = false,
}) {
  return Payment(
    id: id,
    userId: 'runner-1',
    orderId: orderId,
    paymentId: paymentId ?? id,
    eventId: eventId,
    amount: amount,
    status: status,
    signUpFailed: signUpFailed,
    createdAt: createdAt,
  );
}
