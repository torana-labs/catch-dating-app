import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';

enum PaymentEventTitleStatus { loading, error, ready }

class PaymentHistoryViewModel {
  const PaymentHistoryViewModel({
    required this.rows,
    this.eventTitleStatus = PaymentEventTitleStatus.ready,
    this.eventTitleError,
  });

  final List<PaymentHistoryRow> rows;
  final PaymentEventTitleStatus eventTitleStatus;
  final Object? eventTitleError;

  bool get isEmpty => rows.isEmpty;
}

class PaymentHistoryRow {
  const PaymentHistoryRow({required this.payment, required this.eventTitle});

  final Payment payment;
  final String? eventTitle;
}

PaymentHistoryViewModel buildPaymentHistoryViewModel({
  required List<Payment> payments,
  required List<Event> events,
  PaymentEventTitleStatus eventTitleStatus = PaymentEventTitleStatus.ready,
  Object? eventTitleError,
}) {
  final eventsById = {for (final event in events) event.id: event};
  return PaymentHistoryViewModel(
    eventTitleStatus: eventTitleStatus,
    eventTitleError: eventTitleError,
    rows: [
      for (final payment in payments)
        PaymentHistoryRow(
          payment: payment,
          eventTitle: eventsById[payment.eventId]?.title,
        ),
    ],
  );
}
