import 'package:catch_dating_app/kernel/brand.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  tearDown(() {
    AppConfig.resetEntrypointRoleOverrideForTesting();
    AppConfig.resetEntrypointEnvironmentOverrideForTesting();
  });

  group('owner-approved external destinations', () {
    test('accepts only absolute HTTPS URLs', () {
      expect(
        AppConfig.configuredExternalUriFor(' ${Brand.webOrigin}/privacy '),
        Uri.parse('${Brand.webOrigin}/privacy'),
      );
      expect(AppConfig.configuredExternalUriFor(''), isNull);
      expect(AppConfig.configuredExternalUriFor('/privacy'), isNull);
      expect(
        AppConfig.configuredExternalUriFor('http://${Brand.webDomain}/privacy'),
        isNull,
      );
      expect(
        AppConfig.configuredExternalUriFor('ftp://${Brand.webDomain}/privacy'),
        isNull,
      );
    });
  });

  test(
    'installable target entrypoints override stale compile-time identity',
    () {
      AppConfig.configureEntrypointRole(AppRole.host);
      AppConfig.configureEntrypointEnvironment(AppEnvironment.prod);

      expect(AppConfig.appRole, AppRole.host);
      expect(AppConfig.environment, AppEnvironment.prod);
      expect(AppConfig.appTitle, 'Catch Host');
      expect(
        AppConfig.appTitleFor(
          consumerTitle: 'Consumer title',
          hostTitle: 'Host title',
        ),
        'Host title',
      );
    },
  );

  group('AppEnvironment.fromValue', () {
    test('parses supported environments', () {
      expect(AppEnvironment.fromValue('dev'), AppEnvironment.dev);
      expect(AppEnvironment.fromValue('staging'), AppEnvironment.staging);
      expect(AppEnvironment.fromValue('prod'), AppEnvironment.prod);
      expect(AppEnvironment.fromValue('production'), AppEnvironment.prod);
    });

    test('normalizes case and whitespace', () {
      expect(AppEnvironment.fromValue(' Staging '), AppEnvironment.staging);
    });

    test('throws on unsupported environment', () {
      expect(() => AppEnvironment.fromValue('qa'), throwsArgumentError);
    });
  });

  group('Remote Config fetch interval', () {
    test('keeps frequent fetches for debug, emulator, and non-prod builds', () {
      expect(
        AppConfig.remoteConfigMinimumFetchIntervalFor(
          environment: AppEnvironment.prod,
          debugMode: true,
          useFirebaseEmulators: false,
        ),
        Duration.zero,
      );
      expect(
        AppConfig.remoteConfigMinimumFetchIntervalFor(
          environment: AppEnvironment.prod,
          debugMode: false,
          useFirebaseEmulators: true,
        ),
        Duration.zero,
      );
      expect(
        AppConfig.remoteConfigMinimumFetchIntervalFor(
          environment: AppEnvironment.staging,
          debugMode: false,
          useFirebaseEmulators: false,
        ),
        Duration.zero,
      );
    });

    test('throttles fetches for production release builds', () {
      expect(
        AppConfig.remoteConfigMinimumFetchIntervalFor(
          environment: AppEnvironment.prod,
          debugMode: false,
          useFirebaseEmulators: false,
        ),
        const Duration(hours: 1),
      );
    });
  });

  group('observability collection', () {
    test('collects automatically only for production release builds', () {
      expect(
        AppConfig.shouldCollectObservabilityFor(
          environment: AppEnvironment.prod,
          releaseMode: true,
          profileMode: false,
          useFirebaseEmulators: false,
          forceNonProductionCollection: false,
        ),
        isTrue,
      );
      expect(
        AppConfig.shouldCollectObservabilityFor(
          environment: AppEnvironment.prod,
          releaseMode: false,
          profileMode: false,
          useFirebaseEmulators: false,
          forceNonProductionCollection: true,
        ),
        isFalse,
      );
      expect(
        AppConfig.shouldCollectObservabilityFor(
          environment: AppEnvironment.prod,
          releaseMode: true,
          profileMode: false,
          useFirebaseEmulators: true,
          forceNonProductionCollection: true,
        ),
        isFalse,
      );
    });

    test('allows explicit collection in non-production release builds', () {
      expect(
        AppConfig.shouldCollectObservabilityFor(
          environment: AppEnvironment.staging,
          releaseMode: true,
          profileMode: false,
          useFirebaseEmulators: false,
          forceNonProductionCollection: false,
        ),
        isFalse,
      );
      expect(
        AppConfig.shouldCollectObservabilityFor(
          environment: AppEnvironment.staging,
          releaseMode: true,
          profileMode: false,
          useFirebaseEmulators: false,
          forceNonProductionCollection: true,
        ),
        isTrue,
      );
    });

    test('allows explicit collection in non-production profile builds', () {
      expect(
        AppConfig.shouldCollectObservabilityFor(
          environment: AppEnvironment.staging,
          releaseMode: false,
          profileMode: true,
          useFirebaseEmulators: false,
          forceNonProductionCollection: false,
        ),
        isFalse,
      );
      expect(
        AppConfig.shouldCollectObservabilityFor(
          environment: AppEnvironment.staging,
          releaseMode: false,
          profileMode: true,
          useFirebaseEmulators: false,
          forceNonProductionCollection: true,
        ),
        isTrue,
      );
    });

    test(
      'uses Firebase Crashlytics reporter for release or explicit profile smoke',
      () {
        expect(
          AppConfig.shouldUseFirebaseCrashReporterFor(
            releaseMode: true,
            profileMode: false,
            forceObservabilityCollection: false,
          ),
          isTrue,
        );
        expect(
          AppConfig.shouldUseFirebaseCrashReporterFor(
            releaseMode: false,
            profileMode: true,
            forceObservabilityCollection: true,
          ),
          isTrue,
        );
        expect(
          AppConfig.shouldUseFirebaseCrashReporterFor(
            releaseMode: false,
            profileMode: true,
            forceObservabilityCollection: false,
          ),
          isFalse,
        );
      },
    );
  });

  group('auth app verification testing bypass', () {
    test('allows only requested non-production non-release builds', () {
      expect(
        AppConfig.canDisableAuthAppVerificationForTesting(
          environment: AppEnvironment.dev,
          releaseMode: false,
          requested: true,
        ),
        isTrue,
      );
      expect(
        AppConfig.canDisableAuthAppVerificationForTesting(
          environment: AppEnvironment.staging,
          releaseMode: false,
          requested: true,
        ),
        isTrue,
      );
    });

    test('blocks production, release, and unrequested builds', () {
      expect(
        AppConfig.canDisableAuthAppVerificationForTesting(
          environment: AppEnvironment.prod,
          releaseMode: false,
          requested: true,
        ),
        isFalse,
      );
      expect(
        AppConfig.canDisableAuthAppVerificationForTesting(
          environment: AppEnvironment.dev,
          releaseMode: true,
          requested: true,
        ),
        isFalse,
      );
      expect(
        AppConfig.canDisableAuthAppVerificationForTesting(
          environment: AppEnvironment.dev,
          releaseMode: false,
          requested: false,
        ),
        isFalse,
      );
    });
  });

  group('debug sign-out on start', () {
    test('allows requested non-release builds', () {
      expect(
        AppConfig.canDebugSignOutOnStart(releaseMode: false, requested: true),
        isTrue,
      );
    });

    test('blocks release builds and inactive requests', () {
      expect(
        AppConfig.canDebugSignOutOnStart(releaseMode: true, requested: true),
        isFalse,
      );
      expect(
        AppConfig.canDebugSignOutOnStart(releaseMode: false, requested: false),
        isFalse,
      );
    });
  });
}
