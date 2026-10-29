import 'package:catch_dating_app/platform/app_config.dart';
import 'package:firebase_core/firebase_core.dart';

/// Returns a human-readable diagnostic for a force-update check error.
///
/// Diagnostics are suppressed in production to avoid leaking internal details.
/// Returns `null` when there is nothing useful to show.
String? forceUpdateDevelopmentDiagnostic(Object? error) {
  if (AppConfig.environment.isProduction || error == null) {
    return null;
  }

  if (error is FirebaseException && error.plugin == 'remoteconfig') {
    return 'Dev diagnostic: Remote Config fetch failed (${error.code}). '
        'Check the Remote Config template in the Firebase Console for '
        '${AppConfig.environmentName}.';
  }

  return 'Dev diagnostic: ${error.runtimeType}: $error';
}
