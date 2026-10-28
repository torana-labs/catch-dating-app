/// Wire types for `managePublicEventCheckout`, the organizer-routed paid
/// admission. Guests pay the organizer's own Razorpay account; Catch only
/// verifies, admits and refunds through the organizer's connection.
library;

/// Payment ledger ids of organizer-routed admissions. A Consumer booking with
/// such a `paymentId` is cancelled and refunded through the organizer.
bool isOrganizerPaymentId(String? paymentId) =>
    paymentId != null && paymentId.startsWith('pp_');

final class OrganizerCheckout {
  const OrganizerCheckout({
    required this.publicToken,
    required this.orderId,
    required this.amountPaise,
    required this.currency,
    required this.description,
    required this.expiresAtMillis,
  });

  final String publicToken;
  final String orderId;
  final int amountPaise;
  final String currency;
  final String description;
  final int expiresAtMillis;
}

final class OrganizerCheckoutPayment {
  const OrganizerCheckoutPayment({
    required this.paymentId,
    required this.status,
    required this.amountPaise,
    required this.currency,
    this.checkout,
    this.refundQuotePaise,
  });

  final String paymentId;
  final String status;
  final int amountPaise;
  final String currency;
  final OrganizerCheckout? checkout;

  /// Server-quoted guest refund; null when the guest can no longer cancel.
  final int? refundQuotePaise;

  /// The ledger can no longer admit; a new attempt needs a fresh quote.
  bool get isClosed =>
      const {'expired', 'refunded', 'cancelled', 'failed'}.contains(status);

  /// Provider capture is known and admission is converging on the server.
  bool get isConfirming => const {
    'verifying',
    'captured',
    'orderUnknown',
    'creatingOrder',
  }.contains(status);
}

final class OrganizerCheckoutResponse {
  const OrganizerCheckoutResponse({
    required this.quote,
    required this.payment,
    required this.admitted,
  });

  /// The exact server quote, echoed back unchanged as `reviewedQuote`.
  final Map<String, Object?>? quote;
  final OrganizerCheckoutPayment? payment;
  final bool admitted;

  factory OrganizerCheckoutResponse.fromCallableData(
    Object? data, {
    required String eventId,
    String? paymentId,
  }) {
    Never invalid() => throw const OrganizerCheckoutFormatException();
    if (data is! Map) invalid();
    if (data['serverTimeMillis'] is! num) invalid();
    final rawQuote = data['quote'];
    Map<String, Object?>? quote;
    if (rawQuote != null) {
      if (rawQuote is! Map ||
          rawQuote['eventId'] != eventId ||
          rawQuote['currency'] != 'INR' ||
          _int(rawQuote['amountPaise']) == null) {
        invalid();
      }
      quote = _jsonMap(rawQuote);
    }
    OrganizerCheckoutPayment? payment;
    final rawPayment = data['payment'];
    if (rawPayment != null) {
      if (rawPayment is! Map ||
          rawPayment['eventId'] != eventId ||
          (paymentId != null && rawPayment['paymentId'] != paymentId)) {
        invalid();
      }
      final id = rawPayment['paymentId'];
      final status = rawPayment['status'];
      final amount = _int(rawPayment['amountPaise']);
      final currency = rawPayment['currency'];
      if (id is! String ||
          !isOrganizerPaymentId(id) ||
          status is! String ||
          amount == null ||
          currency is! String) {
        invalid();
      }
      final rawCheckout = rawPayment['checkout'];
      OrganizerCheckout? checkout;
      if (rawCheckout != null) {
        if (rawCheckout is! Map) invalid();
        final token = rawCheckout['publicToken'];
        final orderId = rawCheckout['orderId'];
        final checkoutAmount = _int(rawCheckout['amountPaise']);
        final description = rawCheckout['description'];
        final expires = _int(rawCheckout['expiresAtMillis']);
        if (token is! String ||
            token.isEmpty ||
            orderId is! String ||
            !orderId.startsWith('order_') ||
            checkoutAmount != amount ||
            rawCheckout['currency'] != currency ||
            description is! String ||
            expires == null) {
          invalid();
        }
        checkout = OrganizerCheckout(
          publicToken: token,
          orderId: orderId,
          amountPaise: checkoutAmount!,
          currency: currency,
          description: description,
          expiresAtMillis: expires,
        );
      }
      final cancellationQuote = rawPayment['cancellationQuote'];
      payment = OrganizerCheckoutPayment(
        paymentId: id,
        status: status,
        amountPaise: amount,
        currency: currency,
        checkout: checkout,
        refundQuotePaise: cancellationQuote is Map
            ? _int(cancellationQuote['refundAmountPaise'])
            : null,
      );
    }
    final admission = data['admission'];
    if (admission != null &&
        (admission is! Map || admission['eventId'] != eventId)) {
      invalid();
    }
    if (quote != null && (payment != null || admission != null)) invalid();
    return OrganizerCheckoutResponse(
      quote: quote,
      payment: payment,
      admitted: admission != null,
    );
  }
}

final class OrganizerCheckoutFormatException implements Exception {
  const OrganizerCheckoutFormatException();
}

int? _int(Object? value) =>
    value is num && value == value.truncate() ? value.toInt() : null;

Map<String, Object?> _jsonMap(Map<Object?, Object?> value) => {
  for (final entry in value.entries)
    entry.key as String: switch (entry.value) {
      final Map<Object?, Object?> nested => _jsonMap(nested),
      final other => other,
    },
};
