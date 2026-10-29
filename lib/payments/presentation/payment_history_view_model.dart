import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_history_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'payment_history_view_model.g.dart';

@riverpod
AsyncValue<PaymentHistoryViewModel> paymentHistoryViewModel(
  Ref ref,
  String userId,
) {
  final paymentsAsync = ref.watch(watchPaymentsForUserProvider(userId));

  return switch (paymentsAsync) {
    AsyncData(:final value) => AsyncData(
      _paymentHistoryWithEventTitles(ref, value),
    ),
    AsyncError(:final error, :final stackTrace) => AsyncError(
      error,
      stackTrace,
    ),
    _ => const AsyncLoading(),
  };
}

PaymentHistoryViewModel _paymentHistoryWithEventTitles(
  Ref ref,
  List<Payment> payments,
) {
  final eventIds = {for (final payment in payments) payment.eventId};
  if (eventIds.isEmpty) {
    return buildPaymentHistoryViewModel(payments: payments, events: const []);
  }

  final eventsAsync = ref.watch(
    watchEventsByIdsProvider(EventsByIdQuery(eventIds)),
  );
  return switch (eventsAsync) {
    AsyncData(:final value) => buildPaymentHistoryViewModel(
      payments: payments,
      events: value,
    ),
    AsyncError(:final error) => buildPaymentHistoryViewModel(
      payments: payments,
      events: const [],
      eventTitleStatus: PaymentEventTitleStatus.error,
      eventTitleError: error,
    ),
    _ => buildPaymentHistoryViewModel(
      payments: payments,
      events: const [],
      eventTitleStatus: PaymentEventTitleStatus.loading,
    ),
  };
}
