import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_core/firebase_core.dart';

/// How long a Cloud Function call may take before the client gives up, when
/// the call sets no timeout of its own. The plugin's default is 60 seconds;
/// the owner approved about 30 (17 November 2026). A read sets its read
/// class's shorter deadline instead (`CachePolicies`).
///
/// A command that runs out has an unknown outcome: the server may still
/// finish it. The screen says so and confirms from its listener or a
/// read-back, and nothing retries the command automatically.
const callableDefaultTimeout = Duration(seconds: 30);

/// When a write still running shows "Still working".
const writeStillWorkingAfter = Duration(seconds: 8);

/// [FirebaseFunctions] with [callableDefaultTimeout] on every call that sets
/// no options of its own. Everything else is the plugin's.
final class CatchFirebaseFunctions implements FirebaseFunctions {
  CatchFirebaseFunctions(this._functions);

  final FirebaseFunctions _functions;

  static HttpsCallableOptions _withDefault(HttpsCallableOptions? options) =>
      options ?? HttpsCallableOptions(timeout: callableDefaultTimeout);

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _functions.httpsCallable(name, options: _withDefault(options));

  @override
  HttpsCallable httpsCallableFromUrl(
    String url, {
    HttpsCallableOptions? options,
  }) => _functions.httpsCallableFromUrl(url, options: _withDefault(options));

  @override
  HttpsCallable httpsCallableFromUri(
    Uri uri, {
    HttpsCallableOptions? options,
  }) => _functions.httpsCallableFromUri(uri, options: _withDefault(options));

  @override
  void useFunctionsEmulator(
    String host,
    int port, {
    bool automaticHostMapping = true,
  }) => _functions.useFunctionsEmulator(
    host,
    port,
    automaticHostMapping: automaticHostMapping,
  );

  @override
  FirebaseApp get app => _functions.app;

  @override
  Map<dynamic, dynamic> get pluginConstants => _functions.pluginConstants;

  // The plugin's test-only platform `delegate` is not part of this wrapper.
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
