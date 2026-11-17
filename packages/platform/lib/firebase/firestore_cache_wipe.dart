import 'dart:async';

import 'package:catch_platform/cache/page_reload.dart'
    if (dart.library.js_interop) 'package:catch_platform/cache/page_reload_web.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'firestore_cache_wipe.g.dart';

/// Wipes Firestore's on-device cache when a signed-in period ends, so the
/// next account on the device never reads the previous one's cached
/// documents. Security rules are not checked against the cache, and a
/// listener renders cached documents before the server answers. Owner
/// decision of 1 November 2026 (caching contract, question 13): both apps
/// wipe at sign-out, and the next sign-in loads cold.
final class FirestoreCacheWipe {
  FirestoreCacheWipe({
    required this._firestore,
    required this._logger,
    this._reloadPageAfterWipe = firestoreRestartNeedsPageReload,
    this._reload = reloadPage,
  });

  final FirebaseFirestore? Function() _firestore;
  final ErrorLogger _logger;
  final bool _reloadPageAfterWipe;
  final void Function() _reload;
  Future<void>? _inFlight;

  /// Terminates the Firestore instance, then clears its persistence. Native
  /// plugins start a fresh instance on the next call; on the web, where a
  /// terminated instance cannot restart, the page reloads afterwards.
  ///
  /// Call it after the account has signed out and before another can sign
  /// in. It never throws: a failure is logged and sign-out goes on. Calls
  /// while a wipe runs share it.
  Future<void> afterSignOut() =>
      _inFlight ??= _wipe().whenComplete(() => _inFlight = null);

  Future<void> _wipe() async {
    final firestore = _firestore();
    if (firestore == null) return;
    try {
      await _terminateAndClear(firestore);
    } catch (error, stackTrace) {
      _logger.logError(
        error,
        stackTrace,
        reason: 'Could not wipe the on-device Firestore cache at sign-out',
      );
    }
    if (_reloadPageAfterWipe) _reload();
  }

  static const _terminate = BackendErrorContext(
    service: BackendService.firestore,
    action: 'stop Firestore at sign-out',
    resource: 'firestore_instance',
  );
  static const _clear = BackendErrorContext(
    service: BackendService.firestore,
    action: 'clear the on-device Firestore cache at sign-out',
    resource: 'firestore_persistence',
  );

  // A read that starts between the two calls starts a new instance, which
  // clearPersistence refuses; terminating again and retrying once covers it.
  Future<void> _terminateAndClear(FirebaseFirestore firestore) async {
    for (var attempt = 0; ; attempt++) {
      await withBackendErrorContext(firestore.terminate, context: _terminate);
      try {
        await withBackendErrorContext(
          firestore.clearPersistence,
          context: _clear,
        );
        return;
      } on AppException catch (error) {
        if (error.code != 'failed-precondition' || attempt > 0) rethrow;
      }
    }
  }
}

// keepalive: an account-free SDK effect that holds no data. It reads
// Firestore only if this process already started it, so signing out never
// initializes Firebase on its own.
@Riverpod(keepAlive: true)
FirestoreCacheWipe firestoreCacheWipe(Ref ref) => FirestoreCacheWipe(
  firestore: () => ref.exists(firebaseFirestoreProvider)
      ? ref.read(firebaseFirestoreProvider)
      : null,
  logger: ref.watch(errorLoggerProvider),
);
