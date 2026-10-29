import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_screen.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_state.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/contract_preview.dart';
import '../support/page_preview.dart';
import 'fixtures.dart';
import 'payment_fixture.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Screen states',
  type: PaymentHistoryScreen,
  path: '[P3 utility surfaces]/Payment history',
)
Widget paymentHistoryScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'PaymentHistoryScreen',
    contractId: 'screen.payments.history',
    children: [
      WidgetbookPageStateCard(
        label: 'uid loading',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            uidStream: widgetbookUtilityLoadingStream<String?>(),
            paymentsStream: Stream.value(widgetbookUtilityPayments),
            child: const PaymentHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'uid error',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            uidStream: widgetbookUtilityErrorStream('Auth session failed'),
            paymentsStream: Stream.value(widgetbookUtilityPayments),
            child: const PaymentHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'signed out',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            uidStream: Stream<String?>.value(null),
            paymentsStream: Stream.value(widgetbookUtilityPayments),
            child: const PaymentHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'payments loading',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            paymentsStream: widgetbookUtilityLoadingStream<List<Payment>>(),
            child: const PaymentHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'payments error',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            paymentsStream: widgetbookUtilityErrorStream('Payments failed'),
            child: const PaymentHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty history',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            paymentsStream: Stream.value(const <Payment>[]),
            child: const PaymentHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'status variants',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            paymentsStream: Stream.value(widgetbookUtilityPayments),
            eventsById: {
              for (final payment in widgetbookUtilityPayments)
                payment.eventId: widgetbookUtilityEventFixture(
                  id: payment.eventId,
                  meetingPoint: widgetbookUtilityEventTitleForPayment(payment),
                  notes: 'Receipt context',
                  latitude: 19.0676,
                  longitude: 72.8227,
                ),
            },
            child: const PaymentHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event title missing',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            payments: widgetbookUtilityPayments.take(1).toList(),
            paymentsStream: Stream.value(
              widgetbookUtilityPayments.take(1).toList(),
            ),
            eventsById: const {},
            child: const PaymentHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event titles loading',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            eventsStream: widgetbookUtilityLoadingStream<List<Event>>(),
            child: const PaymentHistoryScreen(),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event titles error',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            eventsStream: widgetbookUtilityErrorStream<List<Event>>(
              'Event titles failed',
            ),
            child: const PaymentHistoryScreen(),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Provider states',
  type: PaymentHistoryBody,
  path: '[P3 utility surfaces]/Payment history',
)
Widget paymentHistoryListControllerStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'PaymentHistoryBody',
    contractId: 'screen.payments.history.provider-list',
    children: [
      WidgetbookPageStateCard(
        label: 'loaded',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            paymentsStream: Stream.value(widgetbookUtilityPayments),
            child: const PaymentHistoryBody(userId: widgetbookUtilityViewerUid),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'payments loading',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookPaymentScope(
            paymentsStream: widgetbookUtilityLoadingStream<List<Payment>>(),
            child: const PaymentHistoryBody(userId: widgetbookUtilityViewerUid),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'List states',
  type: PaymentHistoryList,
  path: '[P3 utility surfaces]/Payment history',
)
Widget paymentHistoryListStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'PaymentHistoryList',
    contractId: 'screen.payments.history.list',
    children: [
      WidgetbookPageStateCard(
        label: 'empty',
        child: const WidgetbookUtilityDeviceFrame(
          child: PaymentHistoryList(
            paymentHistory: PaymentHistoryViewModel(rows: []),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'status variants',
        child: WidgetbookUtilityDeviceFrame(
          child: PaymentHistoryList(
            paymentHistory: _paymentHistoryViewModel(widgetbookUtilityPayments),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Loading states',
  type: PaymentHistorySkeleton,
  path: '[P3 utility surfaces]/Payment history',
)
Widget paymentHistorySkeletonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'PaymentHistorySkeleton',
    contractId: 'screen.payments.history.skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'loading list',
        child: WidgetbookUtilityDeviceFrame(child: PaymentHistorySkeleton()),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Row skeleton states',
  type: PaymentHistoryTileSkeleton,
  path: '[P3 utility surfaces]/Payment history',
)
Widget paymentHistoryTileSkeletonStates(BuildContext context) {
  return const WidgetbookPageCatalogFrame(
    title: 'PaymentHistoryTileSkeleton',
    contractId: 'screen.payments.history.row_skeleton',
    children: [
      WidgetbookPageStateCard(
        label: 'loading row',
        child: PaymentHistoryTileSkeleton(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Row states',
  type: PaymentHistoryTile,
  path: '[P3 utility surfaces]/Payment history',
)
Widget paymentHistoryTileStates(BuildContext context) {
  final paidPayment = widgetbookUtilityPayments.firstWhere(
    (payment) => payment.status == PaymentStatus.completed,
  );
  final pendingPayment = widgetbookUtilityPayments.firstWhere(
    (payment) => payment.status == PaymentStatus.pending,
  );
  final failedPayment = widgetbookUtilityPayments.firstWhere(
    (payment) => payment.status == PaymentStatus.refundFailed,
  );

  return WidgetbookPageCatalogFrame(
    title: 'PaymentHistoryTile',
    contractId: 'screen.payments.history.row',
    children: [
      WidgetbookPageStateCard(
        label: 'paid',
        child: WidgetbookUtilityDeviceFrame(
          child: PaymentHistoryTile(
            row: PaymentHistoryRow(
              payment: paidPayment,
              eventTitle: widgetbookUtilityEventTitleForPayment(paidPayment),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pending',
        child: WidgetbookUtilityDeviceFrame(
          child: PaymentHistoryTile(
            row: PaymentHistoryRow(
              payment: pendingPayment,
              eventTitle: widgetbookUtilityEventTitleForPayment(pendingPayment),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'refund attention',
        child: WidgetbookUtilityDeviceFrame(
          child: PaymentHistoryTile(
            row: PaymentHistoryRow(
              payment: failedPayment,
              eventTitle: widgetbookUtilityEventTitleForPayment(failedPayment),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Receipt states',
  type: PaymentReceiptSheet,
  path: '[P3 utility surfaces]/Payment history',
)
Widget paymentReceiptSheetStates(BuildContext context) {
  final failedPayment = widgetbookUtilityPayments.firstWhere(
    (payment) => payment.status == PaymentStatus.refundFailed,
  );
  return WidgetbookPageCatalogFrame(
    title: 'PaymentReceiptSheet',
    contractId: 'screen.payments.history.detail_sheet',
    children: [
      WidgetbookPageStateCard(
        label: 'paid receipt',
        child: WidgetbookUtilitySheetFrame(
          child: PaymentReceiptSheet(
            payment: widgetbookUtilityPayments.first,
            eventTitle: 'Sundowner 5K receipt',
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'failed signup help',
        child: WidgetbookUtilitySheetFrame(
          child: PaymentReceiptSheet(
            payment: failedPayment,
            eventTitle: 'Refund needs attention',
            onHelp: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

PaymentHistoryViewModel _paymentHistoryViewModel(Iterable<Payment> payments) {
  return PaymentHistoryViewModel(
    rows: [
      for (final payment in payments)
        PaymentHistoryRow(
          payment: payment,
          eventTitle: widgetbookUtilityEventTitleForPayment(payment),
        ),
    ],
  );
}
