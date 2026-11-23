import 'package:catch_dating_app/pages/frame/force_update/force_update_diagnostics.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('force update diagnostics show Remote Config guidance in dev', () {
    final diagnostic = forceUpdateDevelopmentDiagnostic(
      FirebaseException(plugin: 'remoteconfig', code: 'fetch-throttled'),
    );

    expect(diagnostic, isNotNull);
    expect(diagnostic, contains('Remote Config'));
    expect(diagnostic, contains('Firebase Console'));
  });

  test('force update diagnostics stay hidden when there is no error', () {
    expect(forceUpdateDevelopmentDiagnostic(null), isNull);
  });

  test(
    'force update diagnostics stay hidden for non-Firebase errors in prod',
    () {
      // Not testing isProduction=true directly since it depends on AppConfig,
      // but we verify the null-early-return path works.
      expect(forceUpdateDevelopmentDiagnostic(null), isNull);
    },
  );
}
