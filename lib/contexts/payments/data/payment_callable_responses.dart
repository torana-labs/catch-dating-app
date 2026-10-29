final class RazorpayOrderCallableResponse {
  const RazorpayOrderCallableResponse({
    required this.orderId,
    required this.amountInPaise,
    required this.currency,
    required this.keyId,
  });

  factory RazorpayOrderCallableResponse.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      final orderId = map['orderId'] as String?;
      final amount = (map['amount'] as num?)?.toInt();
      final currency = map['currency'] as String?;
      final keyId = map['keyId'] as String?;

      if (orderId != null &&
          orderId.isNotEmpty &&
          amount != null &&
          amount > 0 &&
          currency != null &&
          currency.isNotEmpty &&
          keyId != null &&
          keyId.isNotEmpty) {
        return RazorpayOrderCallableResponse(
          orderId: orderId,
          amountInPaise: amount,
          currency: currency,
          keyId: keyId,
        );
      }
    }

    throw const RazorpayOrderCallableResponseFormatException();
  }

  final String orderId;
  final int amountInPaise;
  final String currency;
  final String keyId;
}

final class RazorpayOrderCallableResponseFormatException implements Exception {
  const RazorpayOrderCallableResponseFormatException();
}

final class StripeCheckoutSessionCallableResponse {
  const StripeCheckoutSessionCallableResponse({
    required this.sessionId,
    required this.paymentId,
    required this.amountMinor,
    required this.currency,
    required this.checkoutUrl,
  });

  factory StripeCheckoutSessionCallableResponse.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      final sessionId = map['sessionId'] as String?;
      final paymentId = map['paymentId'] as String?;
      final amountMinor = (map['amountMinor'] as num?)?.toInt();
      final currency = map['currency'] as String?;
      final checkoutUrl = map['checkoutUrl'] as String?;
      final provider = map['provider'] as String?;

      if (sessionId != null &&
          sessionId.isNotEmpty &&
          paymentId != null &&
          paymentId.isNotEmpty &&
          amountMinor != null &&
          amountMinor > 0 &&
          currency != null &&
          currency.isNotEmpty &&
          checkoutUrl != null &&
          checkoutUrl.isNotEmpty &&
          provider == 'stripe') {
        return StripeCheckoutSessionCallableResponse(
          sessionId: sessionId,
          paymentId: paymentId,
          amountMinor: amountMinor,
          currency: currency,
          checkoutUrl: Uri.parse(checkoutUrl),
        );
      }
    }

    throw const StripeCheckoutSessionCallableResponseFormatException();
  }

  final String sessionId;
  final String paymentId;
  final int amountMinor;
  final String currency;
  final Uri checkoutUrl;
}

final class StripeCheckoutSessionCallableResponseFormatException
    implements Exception {
  const StripeCheckoutSessionCallableResponseFormatException();
}

final class StripeHostOnboardingLinkCallableResponse {
  const StripeHostOnboardingLinkCallableResponse({
    required this.accountId,
    required this.onboardingUrl,
  });

  factory StripeHostOnboardingLinkCallableResponse.fromCallableData(
    Object? data,
  ) {
    if (data case final Map<Object?, Object?> map) {
      final accountId = map['accountId'] as String?;
      final onboardingUrl = map['onboardingUrl'] as String?;
      if (accountId != null &&
          accountId.isNotEmpty &&
          onboardingUrl != null &&
          onboardingUrl.isNotEmpty) {
        return StripeHostOnboardingLinkCallableResponse(
          accountId: accountId,
          onboardingUrl: Uri.parse(onboardingUrl),
        );
      }
    }

    throw const StripeHostOnboardingLinkCallableResponseFormatException();
  }

  final String accountId;
  final Uri onboardingUrl;
}

final class StripeHostOnboardingLinkCallableResponseFormatException
    implements Exception {
  const StripeHostOnboardingLinkCallableResponseFormatException();
}
