/// Firebase/platform service where an app-facing failure originated.
enum BackendService {
  auth,
  firestore,
  functions,
  storage,
  remoteConfig,
  appCheck,
  messaging,
  payments,
  external,
  local,
  unknown,
}

extension BackendServiceLogKey on BackendService {
  String get logKey => switch (this) {
    BackendService.auth => 'auth',
    BackendService.firestore => 'firestore',
    BackendService.functions => 'functions',
    BackendService.storage => 'storage',
    BackendService.remoteConfig => 'remote_config',
    BackendService.appCheck => 'app_check',
    BackendService.messaging => 'messaging',
    BackendService.payments => 'payments',
    BackendService.external => 'external',
    BackendService.local => 'local',
    BackendService.unknown => 'unknown',
  };
}

enum AppErrorSeverity { info, warning, error, fatal }

/// Non-PII operation context attached to app-facing backend failures.
///
/// Keep [resource] to collection/bucket/document-kind names such as `users`,
/// `events`, or `profile_photos`. Do not put raw user IDs, phone numbers, file
/// names, messages, or other user content in this object.
class BackendErrorContext {
  const BackendErrorContext({
    required this.service,
    required this.action,
    this.resource,
    this.metadata = const {},
  });

  final BackendService service;
  final String action;
  final String? resource;
  final Map<String, String> metadata;

  Map<String, String> toLogContext() => {
    'service': service.logKey,
    'action': action,
    if (resource != null && resource!.isNotEmpty) 'resource': resource!,
    ...metadata,
  };
}

/// Base class for all app-level exceptions that can be shown to the user.
///
/// Subclasses carry a human-readable [message] and a machine-readable [code].
/// The optional [cause] holds the original error for debugging — it is never
/// shown to users.
///
/// Override [toString] returns [message] so exceptions display cleanly in
/// error widgets without extra formatting.
sealed class AppException implements Exception {
  const AppException(
    this.code,
    this.message, {
    this.debugMessage,
    this.cause,
    this.stackTrace,
    this.context,
    this.severity = AppErrorSeverity.warning,
    this.retryable = false,
  });

  final String code;
  final String message;
  final String? debugMessage;
  final Object? cause;
  final StackTrace? stackTrace;
  final BackendErrorContext? context;
  final AppErrorSeverity severity;
  final bool retryable;

  @override
  String toString() => message;
}

// ── Auth/session ─────────────────────────────────────────────────────────────

class SignInRequiredException extends AppException {
  const SignInRequiredException(
    String action, {
    super.debugMessage,
    super.cause,
    super.stackTrace,
    super.context,
  }) : super('sign-in-required', 'You need to be signed in to $action.');
}

// ── Network ───────────────────────────────────────────────────────────────────

class NetworkException extends AppException {
  const NetworkException(
    super.code,
    super.message, {
    super.debugMessage,
    super.cause,
    super.stackTrace,
    super.context,
  }) : super(retryable: true);
}

// ── Permissions ───────────────────────────────────────────────────────────────

class PermissionException extends AppException {
  const PermissionException(
    String message, {
    super.debugMessage,
    super.cause,
    super.stackTrace,
    super.context,
  }) : super('permission-denied', message);
}

// ── Validation ────────────────────────────────────────────────────────────────

class ValidationException extends AppException {
  const ValidationException(
    String message, {
    String code = 'validation-failed',
    String? debugMessage,
    Object? cause,
    StackTrace? stackTrace,
    BackendErrorContext? context,
  }) : super(
         code,
         message,
         debugMessage: debugMessage,
         cause: cause,
         stackTrace: stackTrace,
         context: context,
       );
}

// ── Payments ──────────────────────────────────────────────────────────────────

class PaymentCancelledException extends AppException {
  const PaymentCancelledException({
    super.debugMessage,
    super.cause,
    super.stackTrace,
    super.context,
  }) : super(
         'payment-cancelled',
         'Payment was cancelled.',
         severity: AppErrorSeverity.info,
       );
}

class PaymentFailedException extends AppException {
  const PaymentFailedException(
    String detail, {
    super.debugMessage,
    super.cause,
    super.stackTrace,
    super.context,
  }) : super('payment-failed', 'Payment failed: $detail');
}

class PaymentVerificationFailedException extends AppException {
  const PaymentVerificationFailedException({
    super.debugMessage,
    super.cause,
    super.stackTrace,
    super.context,
  }) : super(
         'payment-verification-failed',
         'Payment could not be verified. Please contact support.',
         severity: AppErrorSeverity.error,
       );
}

// ── Event booking ───────────────────────────────────────────────────────────────

class PaidBookingUnsupportedException extends AppException {
  const PaidBookingUnsupportedException({
    String message = 'Paid bookings are only available on Android and iOS.',
    super.debugMessage,
    super.cause,
    super.stackTrace,
    super.context,
  }) : super('paid-booking-unsupported', message);
}

/// Why a paid booking cannot start. Catch never collects the payment itself
/// instead, so these are terminal until the organizer side changes.
enum PaidBookingUnavailableReason {
  /// The organizer's own Razorpay account is not connected and ready.
  organizerPaymentsNotReady,

  /// The event's paid seats are not sold through the organizer's checkout.
  notOfferedInApp,
}

class PaidBookingUnavailableException extends AppException {
  const PaidBookingUnavailableException(
    this.reason, {
    super.debugMessage,
    super.cause,
    super.stackTrace,
    super.context,
  }) : super(
         'paid-booking-unavailable',
         reason == PaidBookingUnavailableReason.organizerPaymentsNotReady
             ? 'The organiser has not finished connecting their payment account.'
             : 'This event is not taking paid bookings in the app.',
       );

  final PaidBookingUnavailableReason reason;
}

class EventBookingFailedException extends AppException {
  const EventBookingFailedException(
    String message, {
    super.debugMessage,
    super.cause,
    super.stackTrace,
    super.context,
  }) : super('event-booking-failed', message);
}

// ── Backend / data layer ──────────────────────────────────────────────────────

class BackendOperationException extends AppException {
  const BackendOperationException({
    required String code,
    required String message,
    required BackendErrorContext context,
    Object? cause,
    StackTrace? stackTrace,
    String? debugMessage,
    bool retryable = false,
    AppErrorSeverity severity = AppErrorSeverity.warning,
  }) : super(
         code,
         message,
         debugMessage: debugMessage,
         cause: cause,
         stackTrace: stackTrace,
         context: context,
         retryable: retryable,
         severity: severity,
       );
}

class DocumentNotFoundException extends AppException {
  const DocumentNotFoundException(
    String resource, {
    super.debugMessage,
    super.cause,
    super.stackTrace,
    super.context,
  }) : super('not-found', 'Could not find $resource.');
}

// ── Storage ──────────────────────────────────────────────────────────────────

class StorageException extends AppException {
  const StorageException(
    String message, {
    String code = 'storage-error',
    String? debugMessage,
    Object? cause,
    StackTrace? stackTrace,
    BackendErrorContext? context,
    bool retryable = false,
  }) : super(
         code,
         message,
         debugMessage: debugMessage,
         cause: cause,
         stackTrace: stackTrace,
         context: context,
         retryable: retryable,
       );
}

class StorageUploadPreflightException extends StorageException {
  const StorageUploadPreflightException({
    required this.constraint,
    required String message,
    super.debugMessage,
    super.cause,
    super.stackTrace,
    super.context,
  }) : super(message, code: 'storage-upload-preflight-$constraint');

  final String constraint;
}

// ── External Actions ─────────────────────────────────────────────────────────

class ExternalActionException extends AppException {
  const ExternalActionException(
    String message, {
    super.debugMessage,
    super.cause,
    super.stackTrace,
    super.context,
  }) : super('external-action-error', message);
}
