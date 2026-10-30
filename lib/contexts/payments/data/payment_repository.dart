import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/payments/data/organizer_event_checkout.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_callable_requests.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_callable_responses.dart';
import 'package:catch_dating_app/contexts/payments/data/razorpay_checkout.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/kernel/country_markets.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:url_launcher/url_launcher.dart';

part 'payment_repository.g.dart';
part 'payment_repository_organizer.dart';

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

  /// Starts a paid booking outside the organizer's checkout.
  ///
  /// INR seats are sold only through the organizer's own Razorpay account
  /// (see [OrganizerPaymentCheckout.prepareOrganizerCheckout]). Catch never
  /// creates an order on its own merchant account, so INR is refused here
  /// before any backend call. Other currencies open Stripe Checkout.
  Future<PaymentConfirmationData> processPayment({
    required String eventId,
    required String currencyCode,
    String? inviteCode,
    String? inviteLinkId,
    String? crossPathsPairHoldId,
  }) async {
    if (currencyCode.trim().toUpperCase() == defaultCurrencyCode) {
      throw const PaidBookingUnavailableException(
        PaidBookingUnavailableReason.notOfferedInApp,
      );
    }
    return _processStripeCheckout(
      eventId: eventId,
      inviteCode: inviteCode,
      inviteLinkId: inviteLinkId,
      crossPathsPairHoldId: crossPathsPairHoldId,
    );
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
      final details = error.details;
      // The server names this refusal; it never falls back to Catch's account.
      if (error.code == 'failed-precondition' &&
          details is Map &&
          details['reason'] == 'organizerPaymentsNotReady') {
        return PaidBookingUnavailableException(
          PaidBookingUnavailableReason.organizerPaymentsNotReady,
          debugMessage: '${error.plugin}/${error.code}: ${error.message}',
          cause: error,
          stackTrace: stackTrace,
          context: context,
        );
      }
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
