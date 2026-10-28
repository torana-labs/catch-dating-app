part of 'payment_repository.dart';

/// Organizer-routed paid bookings. Kept beside [PaymentRepository] so it
/// shares the attempt lease, deadline and session-ownership checks.
extension OrganizerPaymentCheckout on PaymentRepository {
  /// Resumes or prepares the guest's organizer-routed payment. The server
  /// quote fixes the amount and refund deadline the payment page shows; the
  /// order belongs to the organizer's own Razorpay account.
  Future<OrganizerCheckoutSession> prepareOrganizerCheckout({
    required String eventId,
    required String displayName,
  }) async {
    if (!supportsPaidBookings) {
      throw const PaidBookingUnsupportedException();
    }
    _requireCurrentSession();
    // The UID-owned ledger survives app restarts: resume it before quoting.
    var response = await _organizerCheckout({
      'action': 'find',
      'eventId': eventId,
    }, eventId: eventId);
    var payment = response.payment;
    if (!response.admitted && (payment == null || payment.isClosed)) {
      _requireCurrentSession();
      final quoted = await _organizerCheckout({
        'action': 'quote',
        'eventId': eventId,
      }, eventId: eventId);
      final quote = quoted.quote;
      if (quote == null) {
        throw const PaymentFailedException(
          'This event is not taking paid bookings right now.',
        );
      }
      _requireCurrentSession();
      response = await _organizerCheckout({
        'action': 'prepare',
        'eventId': eventId,
        'requestId': _newOrganizerRequestId(),
        'displayName': displayName.trim(),
        'reviewedQuote': quote,
        'inviteToken': null,
      }, eventId: eventId);
      payment = response.payment;
    }
    _requireCurrentSession();
    if (payment == null) {
      throw const PaymentFailedException(
        'Your payment is being checked. Open the event again in a moment.',
      );
    }
    if (!response.admitted && payment.checkout == null) {
      throw const PaymentFailedException(
        'Your payment is being checked. Open the event again in a moment.',
      );
    }
    return OrganizerCheckoutSession(
      eventId: eventId,
      payment: payment,
      admitted: response.admitted,
    );
  }

  /// Confirmation for a session the server already admitted.
  PaymentConfirmationData organizerConfirmation(
    OrganizerCheckoutSession session,
  ) => PaymentConfirmationData(
    paymentId: session.payment.paymentId,
    orderId: session.payment.checkout?.orderId ?? session.payment.paymentId,
    amountInPaise: session.payment.amountPaise,
    currency: session.payment.currency,
    eventId: session.eventId,
  );

  /// Opens Razorpay's secure checkout for the method the guest chose on
  /// Catch's payment page, keyed to the organizer's account.
  Future<PaymentConfirmationData> payOrganizerCheckout({
    required OrganizerCheckoutSession session,
    required OrganizerPaymentMethod method,
    required String displayName,
    required String description,
    required String userEmail,
    required String userContact,
  }) async {
    if (session.admitted) return organizerConfirmation(session);
    if (!supportsPaidBookings) {
      throw const PaidBookingUnsupportedException();
    }
    _requireCurrentSession();
    if (_activeAttempt != null) {
      throw const PaymentFailedException(
        'Another payment is already in progress.',
      );
    }
    final attempt = _PaymentAttempt(session.eventId);
    _activeAttempt = attempt;
    unawaited(
      _openOrganizerCheckout(
        attempt,
        session.payment,
        method: method,
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
    _PaymentAttempt attempt,
    OrganizerCheckoutPayment payment, {
    required OrganizerPaymentMethod method,
    required String displayName,
    required String description,
    required String userEmail,
    required String userContact,
  }) async {
    try {
      final checkout = _razorpayFactory!();
      attempt.checkout = checkout;
      final order = payment.checkout!;
      if (order.expiresAtMillis <= DateTime.now().millisecondsSinceEpoch) {
        throw const PaymentFailedException(
          'This checkout has expired. Please try again.',
        );
      }
      checkout.configure(
        onSuccess: (result) =>
            _onOrganizerSuccess(attempt, payment, order, result),
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
          'method': method.razorpayMethod,
        },
        'config': method.razorpayDisplayConfig(),
        'theme': {'color': '#16140F'},
      });
    } catch (error, stackTrace) {
      // The caller awaits the attempt result, not this unawaited task;
      // _failAttempt forwards the normalized error and stack to that result.
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
      // The caller awaits the attempt result, not this SDK callback;
      // _failAttempt forwards the normalized error and stack to that result.
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
}

String _newOrganizerRequestId() {
  final random = Random.secure();
  return [
    for (var i = 0; i < 16; i++)
      random.nextInt(256).toRadixString(16).padLeft(2, '0'),
  ].join();
}
