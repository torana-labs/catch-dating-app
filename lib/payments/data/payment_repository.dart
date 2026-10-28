import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/auth/data/authenticated_session.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/payments/data/organizer_event_checkout.dart';
import 'package:catch_dating_app/payments/data/payment_callable_requests.dart';
import 'package:catch_dating_app/payments/data/payment_callable_responses.dart';
import 'package:catch_dating_app/payments/data/razorpay_checkout.dart';
import 'package:catch_dating_app/payments/domain/payment.dart';
import 'package:catch_dating_app/payments/domain/payment_confirmation_data.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:url_launcher/url_launcher.dart';

part 'payment_repository.g.dart';

class PaymentRepository {
  PaymentRepository(
    this._functions, {
    RazorpayCheckoutFactory? razorpayFactory,
    ExternalUrlLauncher? externalUrlLauncher,
    bool Function()? isSessionCurrent,
    bool? isWebOverride,
    TargetPlatform? targetPlatformOverride,
  }) : // Keep the public adapter-factory name stable for app-package injection.
       // ignore: prefer_initializing_formals
       _razorpayFactory = razorpayFactory,
       _isSessionCurrent = isSessionCurrent ?? (() => true),
       _externalUrlLauncher =
           externalUrlLauncher ??
           ((uri, {mode = LaunchMode.platformDefault}) =>
               launchUrl(uri, mode: mode)),
       // Keep these named parameters stable for payment tests and platform overrides.
       // ignore: prefer_initializing_formals
       _isWebOverride = isWebOverride,
       // ignore: prefer_initializing_formals
       _targetPlatformOverride = targetPlatformOverride;

  final FirebaseFunctions _functions;
  final RazorpayCheckoutFactory? _razorpayFactory;
  final ExternalUrlLauncher _externalUrlLauncher;
  final bool? _isWebOverride;
  final TargetPlatform? _targetPlatformOverride;
  final bool Function() _isSessionCurrent;
  _PaymentAttempt? _activeAttempt;
  bool _disposed = false;

  bool get supportsPaidBookings {
    if (_isWebOverride ?? kIsWeb) return false;

    final platform = _targetPlatformOverride ?? defaultTargetPlatform;

    return switch (platform) {
      TargetPlatform.android || TargetPlatform.iOS => _razorpayFactory != null,
      _ => false,
    };
  }

  bool supportsPaidBookingsForCurrency(String currencyCode) {
    final normalized = currencyCode.trim().toUpperCase();
    if (normalized == defaultCurrencyCode) return supportsPaidBookings;
    return normalized.length == 3;
  }

  // ── Paid event booking ──────────────────────────────────────────────────────

  /// Initiates the full Razorpay payment + sign-up flow for a paid event.
  ///
  /// On success the Cloud Function [verifyRazorpayPayment] atomically verifies
  /// the payment and writes the user's event participation edge.
  ///
  /// Returns [PaymentConfirmationData] with the payment details for the
  /// confirmation screen.
  Future<PaymentConfirmationData> processPayment({
    required String eventId,
    required String currencyCode,
    required String description,
    required String userName,
    required String userEmail,
    required String userContact,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) async {
    if (currencyCode.trim().toUpperCase() != defaultCurrencyCode) {
      return _processStripeCheckout(
        eventId: eventId,
        inviteCode: inviteCode,
        inviteLinkId: inviteLinkId,
        crossPathsPairHoldId: crossPathsPairHoldId,
      );
    }
    return _processRazorpayPayment(
      eventId: eventId,
      description: description,
      userName: userName,
      userEmail: userEmail,
      userContact: userContact,
      inviteCode: inviteCode,
      inviteLinkId: inviteLinkId,
      crossPathsPairHoldId: crossPathsPairHoldId,
    );
  }

  Future<PaymentConfirmationData> _processRazorpayPayment({
    required String eventId,
    required String description,
    required String userName,
    required String userEmail,
    required String userContact,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
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

    // Reserve the shared repository before creating the order. Events and
    // Cross Paths can call it independently, including during verification.
    final attempt = _PaymentAttempt(eventId);
    _activeAttempt = attempt;
    unawaited(
      _openRazorpay(
        attempt,
        description: description,
        userName: userName,
        userEmail: userEmail,
        userContact: userContact,
        inviteCode: inviteCode,
        inviteLinkId: inviteLinkId,
        crossPathsPairHoldId: crossPathsPairHoldId,
      ),
    );
    return attempt.result.future;
  }

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

  Future<void> _openRazorpay(
    _PaymentAttempt attempt, {
    required String description,
    required String userName,
    required String userEmail,
    required String userContact,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) async {
    try {
      // The production factory reserves the app-wide native checkout lease
      // synchronously, before any account-bound order request.
      final checkout = _razorpayFactory!();
      attempt.checkout = checkout;
      final orderResult = await _createOrder(
        eventId: attempt.eventId,
        inviteCode: inviteCode,
        inviteLinkId: inviteLinkId,
        crossPathsPairHoldId: crossPathsPairHoldId,
      );
      if (!_ownsAttempt(attempt)) return;
      final order = _parseOrderResponse(orderResult.data);
      checkout.configure(
        onSuccess: (response) => _onSuccess(attempt, order, response),
        onFailure: (response) => _onError(attempt, response),
      );
      if (!_ownsAttempt(attempt)) return;

      // This is the caller deadline, not proof of a cancelled provider charge.
      // The native adapter must retain native-open exclusion until its own
      // operation settles, even after clear() detaches these callbacks.
      attempt.deadline = Timer(const Duration(minutes: 10), () {
        _failAttempt(
          attempt,
          const PaymentFailedException(
            'The payment took too long. Please check its status before retrying.',
          ),
        );
      });
      checkout.open({
        'key': order.keyId,
        'order_id': order.orderId,
        'amount': order.amountInPaise,
        'currency': order.currency,
        'name': 'Catch',
        'description': description,
        'prefill': {
          'name': userName,
          'email': userEmail,
          'contact': userContact,
        },
        'theme': {'color': '#16140F'},
      });
    } catch (error, stackTrace) {
      // Forward the normalized failure and stack to the caller's attempt result.
      // Rethrowing here would escape the unawaited checkout task.
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

  Future<PaymentConfirmationData> _processStripeCheckout({
    required String eventId,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) async {
    _requireCurrentSession();
    final result = await _createStripeCheckoutSession(
      eventId: eventId,
      inviteCode: inviteCode,
      inviteLinkId: inviteLinkId,
      crossPathsPairHoldId: crossPathsPairHoldId,
    );
    _requireCurrentSession();
    final session = _parseStripeCheckoutResponse(result.data);
    final opened = await withBackendErrorContext(
      () => _externalUrlLauncher(
        session.checkoutUrl,
        mode: LaunchMode.externalApplication,
      ),
      context: const BackendErrorContext(
        service: BackendService.external,
        action: 'open Stripe checkout',
        resource: 'payments',
      ),
      mapper: _paymentErrorMapper(
        fallbackMessage: 'Unable to open Stripe checkout.',
      ),
    );
    _requireCurrentSession();
    if (!opened) {
      throw const PaymentFailedException('Unable to open Stripe checkout.');
    }
    return PaymentConfirmationData(
      paymentId: session.paymentId,
      orderId: session.sessionId,
      amountInPaise: session.amountMinor,
      currency: session.currency,
      eventId: eventId,
      provider: 'stripe',
      status: PaymentStatus.pending,
      checkoutUrl: session.checkoutUrl,
    );
  }

  // ── Free event booking ──────────────────────────────────────────────────────

  /// Signs the current user up for a free event via the [signUpForFreeEvent]
  /// Cloud Function, which validates the event is free and checks capacity.
  Future<void> bookFreeEvent({
    required String eventId,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('signUpForFreeEvent')
        .call(
          EventBookingCallableRequest(
            eventId: eventId,
            inviteCode: inviteCode,
            inviteLinkId: inviteLinkId,
            crossPathsPairHoldId: crossPathsPairHoldId,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'book an event',
      resource: 'events',
    ),
    mapper: _eventBookingErrorMapper(
      fallbackMessage: 'Unable to book this event right now.',
    ),
  );

  // ── Razorpay callbacks ────────────────────────────────────────────────────

  Future<void> _onSuccess(
    _PaymentAttempt attempt,
    RazorpayOrderCallableResponse order,
    RazorpaySuccessResponse response,
  ) async {
    if (!_ownsAttempt(attempt) || attempt.verifying) return;
    // A response for another order (including a late native replay) cannot
    // consume this attempt. A matching malformed response remains a failure.
    if (response.orderId != null && response.orderId != order.orderId) return;
    final paymentId = response.paymentId;
    final orderId = response.orderId;
    final signature = response.signature;
    if (paymentId == null || orderId == null || signature == null) {
      _failAttempt(attempt, const PaymentVerificationFailedException());
      return;
    }
    attempt.verifying = true;
    try {
      await withBackendErrorContext(
        () => _functions
            .httpsCallable('verifyRazorpayPayment')
            .call(
              VerifyRazorpayPaymentCallableRequest(
                paymentId: paymentId,
                orderId: orderId,
                signature: signature,
              ).toJson(),
            ),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'verify payment',
          resource: 'payments',
        ),
        mapper: _paymentErrorMapper(
          fallbackMessage: 'Unable to complete the payment verification.',
        ),
      );
      if (!_ownsAttempt(attempt)) return;
      _releaseAttempt(attempt);
      attempt.result.complete(
        PaymentConfirmationData(
          paymentId: paymentId,
          orderId: orderId,
          amountInPaise: order.amountInPaise,
          currency: order.currency,
          eventId: attempt.eventId,
        ),
      );
    } catch (error, stackTrace) {
      // The caller awaits the attempt result, not this SDK callback.
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

  void _onError(_PaymentAttempt attempt, RazorpayFailureResponse response) {
    if (!_ownsAttempt(attempt) || attempt.verifying) return;
    _failAttempt(attempt, _mapCheckoutFailure(response));
  }

  void _requireCurrentSession() {
    if (_disposed || !_isSessionCurrent()) {
      throw const SignInRequiredException('complete this payment');
    }
  }

  bool _ownsAttempt(_PaymentAttempt attempt) {
    if (!identical(_activeAttempt, attempt)) return false;
    if (_disposed || !_isSessionCurrent()) {
      _failAttempt(
        attempt,
        const SignInRequiredException('complete this payment'),
      );
      return false;
    }
    return true;
  }

  void _failAttempt(
    _PaymentAttempt attempt,
    Object error, [
    StackTrace? stackTrace,
  ]) {
    if (!identical(_activeAttempt, attempt)) return;
    _releaseAttempt(attempt);
    attempt.result.completeError(error, stackTrace);
  }

  void _releaseAttempt(_PaymentAttempt attempt) {
    _activeAttempt = null;
    attempt.deadline?.cancel();
    try {
      attempt.checkout?.clear();
    } catch (error, stackTrace) {
      // Listener cleanup must not replace an authoritative payment result.
      FlutterError.reportError(
        FlutterErrorDetails(
          exception: error,
          stack: stackTrace,
          library: 'payments',
          context: ErrorDescription('while detaching checkout callbacks'),
        ),
      );
    }
  }

  void dispose() {
    if (_disposed) return;
    _disposed = true;
    final attempt = _activeAttempt;
    if (attempt != null) {
      _failAttempt(
        attempt,
        const SignInRequiredException('complete this payment'),
      );
    }
  }

  Future<HttpsCallableResult<Object?>> _createOrder({
    required String eventId,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('createRazorpayOrder')
        .call<Object?>(
          CreateRazorpayOrderCallableRequest(
            eventId: eventId,
            inviteCode: inviteCode,
            inviteLinkId: inviteLinkId,
            crossPathsPairHoldId: crossPathsPairHoldId,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'create payment order',
      resource: 'payments',
    ),
    mapper: _paymentErrorMapper(
      fallbackMessage: 'Unable to start the payment.',
    ),
  );

  Future<HttpsCallableResult<Object?>> _createStripeCheckoutSession({
    required String eventId,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('createStripeCheckoutSession')
        .call<Object?>(
          CreateStripeCheckoutSessionCallableRequest(
            eventId: eventId,
            inviteCode: inviteCode?.trim(),
            inviteLinkId: inviteLinkId?.trim(),
            crossPathsPairHoldId: crossPathsPairHoldId?.trim(),
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'create Stripe checkout session',
      resource: 'payments',
    ),
    mapper: _paymentErrorMapper(
      fallbackMessage: 'Unable to start Stripe checkout.',
    ),
  );

  RazorpayOrderCallableResponse _parseOrderResponse(Object? data) {
    try {
      return RazorpayOrderCallableResponse.fromCallableData(data);
    } on RazorpayOrderCallableResponseFormatException {
      throw const PaymentVerificationFailedException();
    }
  }

  StripeCheckoutSessionCallableResponse _parseStripeCheckoutResponse(
    Object? data,
  ) {
    try {
      return StripeCheckoutSessionCallableResponse.fromCallableData(data);
    } on StripeCheckoutSessionCallableResponseFormatException {
      throw const PaymentVerificationFailedException();
    }
  }

  AppException _normalizePaymentError(
    Object error, {
    required String fallbackMessage,
    StackTrace? stackTrace,
  }) {
    return normalizeBackendError(
      error,
      stackTrace: stackTrace,
      context: const BackendErrorContext(
        service: BackendService.payments,
        action: 'process payment',
        resource: 'payments',
      ),
      mapper: _paymentErrorMapper(fallbackMessage: fallbackMessage),
    );
  }

  AppException _mapCheckoutFailure(RazorpayFailureResponse response) {
    if (response.isCancelled) {
      return const PaymentCancelledException(
        context: BackendErrorContext(
          service: BackendService.payments,
          action: 'checkout',
          resource: 'payments',
        ),
      );
    }

    final message = response.message;
    return PaymentFailedException(
      message == null || message.isEmpty ? 'Unknown payment error.' : message,
      context: const BackendErrorContext(
        service: BackendService.payments,
        action: 'checkout',
        resource: 'payments',
      ),
    );
  }
}

// Mutable lifecycle belongs to one reserved operation; receipt fields are
// captured from its immutable event id and server order, never shared globals.
final class _PaymentAttempt {
  _PaymentAttempt(this.eventId);
  final String eventId;
  final result = Completer<PaymentConfirmationData>();
  RazorpayCheckout? checkout;
  Timer? deadline;
  bool verifying = false;
}

BackendErrorMapper _paymentErrorMapper({required String fallbackMessage}) {
  return (error, stackTrace, context) {
    if (error is FirebaseFunctionsException) {
      return PaymentFailedException(
        error.message == null || error.message!.isEmpty
            ? fallbackMessage
            : error.message!,
        debugMessage: '${error.plugin}/${error.code}: ${error.message}',
        cause: error,
        stackTrace: stackTrace,
        context: context,
      );
    }
    return PaymentFailedException(
      // Unexpected SDK/runtime errors may contain implementation details or
      // user data. Keep those diagnostics off the user-facing message.
      fallbackMessage,
      debugMessage: '${error.runtimeType}: $error',
      cause: error,
      stackTrace: stackTrace,
      context: context,
    );
  };
}

BackendErrorMapper _eventBookingErrorMapper({required String fallbackMessage}) {
  return (error, stackTrace, context) {
    if (error is FirebaseFunctionsException) {
      if (error.code == 'unauthenticated') {
        return SignInRequiredException(
          'book an event',
          debugMessage: '${error.plugin}/${error.code}: ${error.message}',
          cause: error,
          stackTrace: stackTrace,
          context: context,
        );
      }

      final message = error.message;
      return EventBookingFailedException(
        message == null || message.isEmpty ? fallbackMessage : message,
        debugMessage: '${error.plugin}/${error.code}: ${error.message}',
        cause: error,
        stackTrace: stackTrace,
        context: context,
      );
    }
    return null;
  };
}

// keepalive: payment repository is a shared Functions/link facade for checkout
// and confirmation flows.
@Riverpod(keepAlive: true)
PaymentRepository paymentRepository(Ref ref) {
  final auth = ref.watch(authenticatedSessionProvider);
  final session = !auth.isLoading && !auth.hasError ? auth.asData?.value : null;
  final repo = PaymentRepository(
    ref.watch(firebaseFunctionsProvider),
    razorpayFactory: ref.watch(razorpayCheckoutFactoryProvider),
    externalUrlLauncher: ref.watch(externalUrlLauncherProvider),
    isSessionCurrent: () {
      if (!ref.mounted || session == null) return false;
      final current = ref.read(authenticatedSessionProvider);
      return !current.isLoading &&
          !current.hasError &&
          identical(current.asData?.value, session);
    },
  );
  ref.onDispose(repo.dispose);
  return repo;
}
