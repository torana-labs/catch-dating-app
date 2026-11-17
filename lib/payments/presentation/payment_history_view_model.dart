import 'package:catch_dating_app/contexts/bookings/bookings.dart';
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
      _paymentHistoryWithEventTitles(ref, userId, value),
    ),
    AsyncError(:final error, :final stackTrace) => AsyncError(
      error,
      stackTrace,
    ),
    _ => const AsyncLoading(),
  };
}

/// Names each payment's event from the guest's own event cards: one
/// listener, never a join on `events`.
PaymentHistoryViewModel _paymentHistoryWithEventTitles(
  Ref ref,
  String userId,
  List<Payment> payments,
) {
  if (payments.isEmpty) {
    return buildPaymentHistoryViewModel(
      payments: payments,
      cardsById: const {},
    );
  }
  final cardsAsync = ref.watch(watchOwnEventCardsByIdProvider(userId));
  return switch (cardsAsync) {
    AsyncData(:final value) => buildPaymentHistoryViewModel(
      payments: payments,
      cardsById: value,
    ),
    AsyncError(:final error) => buildPaymentHistoryViewModel(
      payments: payments,
      cardsById: const {},
      eventTitleStatus: PaymentEventTitleStatus.error,
      eventTitleError: error,
    ),
    _ => buildPaymentHistoryViewModel(
      payments: payments,
      cardsById: const {},
      eventTitleStatus: PaymentEventTitleStatus.loading,
    ),
  };
}
