import 'package:catch_dating_app/contexts/payments/domain/payment.dart';

/// Data carried from a payment attempt to the confirmation screen.
class PaymentConfirmationData {
  const PaymentConfirmationData({
    required this.paymentId,
    required this.orderId,
    required this.amountInPaise,
    required this.currency,
    required this.eventId,
    this.provider = 'razorpay',
    this.status = PaymentStatus.completed,
    this.checkoutUrl,
  });

  final String paymentId;
  final String orderId;
  final int amountInPaise;
  final String currency;
  final String eventId;
  final String provider;
  final PaymentStatus status;
  final Uri? checkoutUrl;

  bool get isPendingExternalCheckout =>
      provider == 'stripe' && status == PaymentStatus.pending;
}
