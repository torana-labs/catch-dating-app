/// App-wide operation-context layer for FRONTEND / local / platform failures.
///
/// This is the non-backend parallel to `BackendErrorContext` /
/// `withBackendErrorContext`. The backend layer
/// (`lib/platform/errors/backend_error_util.dart`) is the correct seam for Firebase
/// service calls. This layer is the correct seam for everything else the app
/// *does locally or through a platform plugin*:
///
/// - validation of user-correctable input,
/// - local persistence (`SharedPreferences`, secure storage, draft caches),
/// - route / deep-link parsing,
/// - platform / plugin side effects (image picker, url_launcher, share,
///   permissions, geolocation, notifications),
/// - provider / mutation UI surfacing of caught errors, and
/// - uncaught async callbacks / framework global error reporting.
///
/// It deliberately reuses [BackendService] and [BackendErrorContext] under the
/// hood so the entire app shares ONE log/analytics context shape and ONE
/// normalizer ([normalizeBackendError]). [AppErrorContext] below is a thin,
/// frontend-named adapter — call sites express *what the app was trying to do*
/// without pretending a local operation is a backend call.
///
/// Privacy: keep [AppErrorContext.resource]/[AppErrorContext.action] to stable,
/// low-cardinality, non-PII strings (e.g. `image_picker`, `event draft`,
/// `parse deep link`). Never put user IDs, phone numbers, file names, message
/// text, bios, photo URLs, exact coordinates, or payment ids into this context.
library;

import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';

/// Logical category of a non-backend app operation.
///
/// Maps onto [BackendService] so the existing log/analytics pipeline keeps a
/// single `service` dimension. Frontend operations live under
/// [BackendService.local] (on-device work) or [BackendService.external]
/// (platform plugins / OS hand-offs).
enum AppOperation {
  /// Local validation of user-correctable input.
  validation,

  /// Local persistence: SharedPreferences, secure storage, draft caches.
  localPersistence,

  /// Route / deep-link / query-param parsing.
  navigation,

  /// Platform / plugin side effect: picker, launcher, share, permissions,
  /// geolocation, notifications.
  plugin,

  /// Provider / mutation / controller UI surfacing of a caught error.
  ui,

  /// Uncaught async callbacks, timers, listeners, framework global reporting.
  runtime,
}

extension AppOperationService on AppOperation {
  /// The [BackendService] dimension this operation logs under.
  BackendService get service => switch (this) {
    AppOperation.validation => BackendService.local,
    AppOperation.localPersistence => BackendService.local,
    AppOperation.navigation => BackendService.local,
    AppOperation.plugin => BackendService.external,
    AppOperation.ui => BackendService.local,
    AppOperation.runtime => BackendService.local,
  };

  /// Stable, low-cardinality label written into the `operation` log key.
  String get logKey => switch (this) {
    AppOperation.validation => 'validation',
    AppOperation.localPersistence => 'local_persistence',
    AppOperation.navigation => 'navigation',
    AppOperation.plugin => 'plugin',
    AppOperation.ui => 'ui',
    AppOperation.runtime => 'runtime',
  };
}

/// Optional mapper that promotes a raw frontend error into a specific
/// [AppException] before the generic normalizer runs.
typedef AppErrorMapper =
    AppException? Function(
      Object error,
      StackTrace stackTrace,
      BackendErrorContext context,
    );

/// Non-PII operation context for a FRONTEND/local/plugin operation.
///
/// Lightweight wrapper over [BackendErrorContext]: it tags the failure with an
/// [AppOperation] category and forwards [action]/[resource]/[metadata] into the
/// shared backend context shape, so logs/analytics stay uniform across backend
/// and frontend failures.
class AppErrorContext {
  const AppErrorContext({
    required this.operation,
    required this.action,
    this.resource,
    this.metadata = const {},
  });

  /// What kind of local/frontend work this was.
  final AppOperation operation;

  /// Human-readable verb phrase, e.g. `save event draft`, `open settings`.
  final String action;

  /// Stable resource/seam name, e.g. `image_picker`, `event draft`,
  /// `deep_link`. Never raw user content.
  final String? resource;

  /// Extra low-cardinality, non-PII key/values for logs/analytics.
  final Map<String, String> metadata;

  /// Adapts this frontend context to the shared [BackendErrorContext] used by
  /// [normalizeBackendError], [ErrorLogger], and analytics.
  BackendErrorContext toBackendContext() => BackendErrorContext(
    service: operation.service,
    action: action,
    resource: resource,
    metadata: {'operation': operation.logKey, ...metadata},
  );
}

/// Normalizes any [error] thrown by a frontend/local/plugin operation into a
/// typed [AppException], reusing the backend normalizer.
///
/// Pass an [AppException] subclass via [mapper] (or throw one directly) when a
/// frontend failure is a stable, user-correctable product concept — e.g. wrap
/// invalid input in a [ValidationException]. Everything else maps to a typed
/// app exception with non-PII context so it can be logged/reported and rendered
/// through `appErrorDescriptor` / the `CatchError*` surfaces.
AppException normalizeAppError(
  Object error, {
  StackTrace? stackTrace,
  required AppErrorContext context,
  AppErrorMapper? mapper,
}) {
  return normalizeBackendError(
    error,
    stackTrace: stackTrace,
    context: context.toBackendContext(),
    mapper: mapper,
  );
}

/// Wraps a FRONTEND/local/plugin [operation] so any thrown error is normalized
/// to a typed [AppException] with non-PII [context].
///
/// Mirrors `withBackendErrorContext` for the non-backend channel. Use it around
/// plugin calls (picker/launcher/share/permissions/geolocation) and local
/// persistence so callers and UI always see typed app exceptions instead of raw
/// plugin/platform errors.
Future<T> withAppErrorContext<T>(
  Future<T> Function() operation, {
  required AppErrorContext context,
  AppErrorMapper? mapper,
}) {
  return withBackendErrorContext(
    operation,
    context: context.toBackendContext(),
    mapper: mapper,
  );
}

/// Best-effort variant for fire-and-forget local work that must NOT crash the
/// caller (e.g. saving a draft in the background) but must NOT silently
/// disappear either.
///
/// Runs [operation]; on failure it normalizes the error via [normalizeAppError]
/// and routes it through [logError] (`ErrorLogger.logAppException`) instead of
/// rethrowing. Returns `true` on success, `false` when the operation failed and
/// was logged. This replaces bare `catch (_) {}` / `.catchError((_) {})`
/// swallows that previously made local failures invisible to developers.
Future<bool> runLoggingAppErrors(
  Future<void> Function() operation, {
  required AppErrorContext context,
  required ErrorLogger logError,
  AppErrorMapper? mapper,
}) async {
  try {
    await operation();
    return true;
  } catch (error, stackTrace) {
    logAppError(
      error,
      stackTrace: stackTrace,
      context: context,
      logError: logError,
      mapper: mapper,
    );
    return false;
  }
}

/// Normalizes [error] with frontend [context] and records it through
/// [logError] without rethrowing.
///
/// Use this in a `catch` block where the operation legitimately continues
/// (best-effort cleanup, UI fallback state) but the failure should still be
/// observable to developers. It is the explicit, documented alternative to a
/// silent swallow.
void logAppError(
  Object error, {
  StackTrace? stackTrace,
  required AppErrorContext context,
  required ErrorLogger logError,
  AppErrorMapper? mapper,
}) {
  logError.logAppException(
    normalizeAppError(
      error,
      stackTrace: stackTrace,
      context: context,
      mapper: mapper,
    ),
  );
}
