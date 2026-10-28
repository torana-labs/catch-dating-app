part of 'payment_repository.dart';

/// Organizer-routed paid bookings. Kept beside [PaymentRepository] so it
/// shares the attempt lease, deadline and session-ownership checks.
extension OrganizerPaymentCheckout on PaymentRepository {
  /// Books a paid event whose organizer collects through their own Razorpay
  /// account. The order, signature check, admission and any refund stay on
  /// the organizer's connection; Catch's merchant account is never involved.
  Future<PaymentConfirmationData> processOrganizerPayment({
    required String eventId,
    required String displayName,
    required String description,
    required String userEmail,
    required String userContact,
  }) async {
    if (!supportsPaidBookings) {
      throw const PaidBookingUnsupportedException();
    }
    _requireCurrentSession();
    if (_activeAttempt != null) {
      throw const PaymentFailedException(
        'Another payment is already in progress.',
      );
    }
    final attempt = _PaymentAttempt(eventId);
    _activeAttempt = attempt;
    unawaited(
      _openOrganizerCheckout(
        attempt,
        displayName: displayName,
        description: description,
        userEmail: userEmail,
        userContact: userContact,
      ),
    );
    return attempt.result.future;
  }

  /// Cancels an organizer-routed booking at the refund the server quotes now.
  Future<void> cancelOrganizerBooking({
    required String eventId,
    required String paymentId,
  }) async {
    _requireCurrentSession();
    final current = await _organizerCheckout(
      {'action': 'status', 'paymentId': paymentId, 'callback': null},
      eventId: eventId,
      paymentId: paymentId,
    );
    final refund = current.payment?.refundQuotePaise;
    if (refund == null) {
      throw const PaymentFailedException(
        'This booking can no longer be cancelled.',
      );
    }
    _requireCurrentSession();
    await _organizerCheckout(
      {
        'action': 'cancelAdmission',
        'paymentId': paymentId,
        'expectedRefundAmountPaise': refund,
      },
      eventId: eventId,
      paymentId: paymentId,
    );
  }

  Future<void> _openOrganizerCheckout(
    _PaymentAttempt attempt, {
    required String displayName,
    required String description,
    required String userEmail,
    required String userContact,
  }) async {
    final eventId = attempt.eventId;
    try {
      final checkout = _razorpayFactory!();
      attempt.checkout = checkout;
      // The UID-owned ledger survives app restarts: resume it before quoting.
      var response = await _organizerCheckout({
        'action': 'find',
        'eventId': eventId,
      }, eventId: eventId);
      if (!_ownsAttempt(attempt)) return;
      var payment = response.payment;
      if (!response.admitted && (payment == null || payment.isClosed)) {
        final quoted = await _organizerCheckout({
          'action': 'quote',
          'eventId': eventId,
        }, eventId: eventId);
        if (!_ownsAttempt(attempt)) return;
        final quote = quoted.quote;
        if (quote == null) {
          throw const PaymentFailedException(
            'This event is not taking paid bookings right now.',
          );
        }
        response = await _organizerCheckout({
          'action': 'prepare',
          'eventId': eventId,
          'requestId': _newRequestId(),
          'displayName': displayName.trim(),
          'reviewedQuote': quote,
          'inviteToken': null,
        }, eventId: eventId);
        if (!_ownsAttempt(attempt)) return;
        payment = response.payment;
      }
      if (response.admitted && payment != null) {
        _completeOrganizerAttempt(attempt, payment);
        return;
      }
      final order = payment?.checkout;
      if (payment == null || order == null) {
        throw const PaymentFailedException(
          'Your payment is being checked. Open the event again in a moment.',
        );
      }
      if (order.expiresAtMillis <= DateTime.now().millisecondsSinceEpoch) {
        throw const PaymentFailedException(
          'This checkout has expired. Please try again.',
        );
      }
      checkout.configure(
        onSuccess: (result) =>
            _onOrganizerSuccess(attempt, payment!, order, result),
        onFailure: (result) => _onError(attempt, result),
      );
      if (!_ownsAttempt(attempt)) return;
      attempt.deadline = Timer(const Duration(minutes: 10), () {
        _failAttempt(
          attempt,
          const PaymentFailedException(
            'The payment took too long. Please check its status before retrying.',
          ),
        );
      });
      checkout.open({
        'key': order.publicToken,
        'order_id': order.orderId,
        'amount': order.amountPaise,
        'currency': order.currency,
        'name': 'Catch',
        'description': description,
        'prefill': {
          'name': displayName,
          'email': userEmail,
          'contact': userContact,
        },
        'theme': {'color': '#16140F'},
      });
    } catch (error, stackTrace) {
      _failAttempt(
        attempt,
        _normalizePaymentError(
          error,
          stackTrace: stackTrace,
          fallbackMessage: 'Unable to launch the payment checkout.',
        ),
        stackTrace,
      );
    }
  }

  Future<void> _onOrganizerSuccess(
    _PaymentAttempt attempt,
    OrganizerCheckoutPayment payment,
    OrganizerCheckout order,
    RazorpaySuccessResponse response,
  ) async {
    if (!_ownsAttempt(attempt) || attempt.verifying) return;
    if (response.orderId != null && response.orderId != order.orderId) return;
    final providerPaymentId = response.paymentId;
    final signature = response.signature;
    if (providerPaymentId == null ||
        response.orderId == null ||
        signature == null) {
      _failAttempt(attempt, const PaymentVerificationFailedException());
      return;
    }
    attempt.verifying = true;
    try {
      // The callback is verification input; only the server ledger admits.
      var current = await _organizerCheckout(
        {
          'action': 'status',
          'paymentId': payment.paymentId,
          'callback': {'paymentId': providerPaymentId, 'signature': signature},
        },
        eventId: attempt.eventId,
        paymentId: payment.paymentId,
      );
      for (var poll = 0; !current.admitted && poll < 5; poll++) {
        if (!(current.payment?.isConfirming ?? false)) break;
        await Future<void>.delayed(const Duration(seconds: 2));
        if (!_ownsAttempt(attempt)) return;
        current = await _organizerCheckout(
          {
            'action': 'status',
            'paymentId': payment.paymentId,
            'callback': null,
          },
          eventId: attempt.eventId,
          paymentId: payment.paymentId,
        );
      }
      if (!_ownsAttempt(attempt)) return;
      if (!current.admitted) {
        throw const PaymentFailedException(
          'Your payment is being confirmed. Open the event again in a moment.',
        );
      }
      _completeOrganizerAttempt(
        attempt,
        current.payment ?? payment,
        orderId: order.orderId,
      );
    } catch (error, stackTrace) {
      _failAttempt(
        attempt,
        _normalizePaymentError(
          error,
          stackTrace: stackTrace,
          fallbackMessage: 'Unable to complete the payment verification.',
        ),
        stackTrace,
      );
    }
  }

  void _completeOrganizerAttempt(
    _PaymentAttempt attempt,
    OrganizerCheckoutPayment payment, {
    String? orderId,
  }) {
    _releaseAttempt(attempt);
    attempt.result.complete(
      PaymentConfirmationData(
        paymentId: payment.paymentId,
        orderId: orderId ?? payment.checkout?.orderId ?? payment.paymentId,
        amountInPaise: payment.amountPaise,
        currency: payment.currency,
        eventId: attempt.eventId,
      ),
    );
  }

  Future<OrganizerCheckoutResponse> _organizerCheckout(
    Map<String, Object?> command, {
    required String eventId,
    String? paymentId,
  }) async {
    final result = await withBackendErrorContext(
      () => _functions
          .httpsCallable('managePublicEventCheckout')
          .call<Object?>(command),
      context: const BackendErrorContext(
        service: BackendService.functions,
        action: 'organizer checkout',
        resource: 'payments',
      ),
      mapper: _paymentErrorMapper(
        fallbackMessage: 'Unable to reach checkout right now.',
      ),
    );
    try {
      return OrganizerCheckoutResponse.fromCallableData(
        result.data,
        eventId: eventId,
        paymentId: paymentId,
      );
    } on OrganizerCheckoutFormatException {
      throw const PaymentVerificationFailedException();
    }
  }

  static String _newRequestId() {
    final random = Random.secure();
    return [
      for (var i = 0; i < 16; i++)
        random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ].join();
  }
}
