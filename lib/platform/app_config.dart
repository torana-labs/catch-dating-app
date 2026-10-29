import 'package:flutter/foundation.dart';

enum AppEnvironment {
  dev('dev', 'DEV', 'Catch (Dev)'),
  staging('staging', 'STAGING', 'Catch (Staging)'),
  prod('prod', '', 'Catch');

  const AppEnvironment(this.value, this.bannerLabel, this.appTitle);

  final String value;
  final String bannerLabel;
  final String appTitle;

  bool get isProduction => this == AppEnvironment.prod;

  static AppEnvironment fromValue(String value) {
    return switch (value.trim().toLowerCase()) {
      'dev' => AppEnvironment.dev,
      'staging' => AppEnvironment.staging,
      'prod' || 'production' => AppEnvironment.prod,
      _ => throw ArgumentError.value(
        value,
        'APP_ENV',
        'Unsupported app environment. Use dev, staging, or prod.',
      ),
    };
  }
}

enum AppRole {
  consumer('consumer'),
  host('host');

  const AppRole(this.value);

  final String value;

  bool get isHost => this == AppRole.host;
}

class AppConfig {
  const AppConfig._();

  static const String _rawAppEnvironment = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'dev',
  );

  static AppRole? _entrypointAppRoleOverride;
  static AppEnvironment? _entrypointEnvironmentOverride;

  static AppEnvironment get environment =>
      _entrypointEnvironmentOverride ??
      AppEnvironment.fromValue(_rawAppEnvironment);

  /// The role the app's entrypoint declared through `runCatchApp`. Code that
  /// runs without an entrypoint, such as unit tests, reads as the consumer.
  static AppRole get appRole => _entrypointAppRoleOverride ?? AppRole.consumer;

  static String get appRoleName => appRole.value;

  static void configureEntrypointRole(AppRole role) {
    _entrypointAppRoleOverride = role;
  }

  static void configureEntrypointEnvironment(AppEnvironment environment) {
    _entrypointEnvironmentOverride = environment;
  }

  @visibleForTesting
  static void resetEntrypointRoleOverrideForTesting() {
    _entrypointAppRoleOverride = null;
  }

  @visibleForTesting
  static void resetEntrypointEnvironmentOverrideForTesting() {
    _entrypointEnvironmentOverride = null;
  }

  static String get environmentName => environment.value;

  static String get appTitle {
    if (!appRole.isHost) return environment.appTitle;
    if (environment.isProduction) return 'Catch Host';
    return 'Catch Host (${environment.bannerLabel})';
  }

  /// Resolves a localized product title while preserving non-production build
  /// identity. The supplied base titles come from the generated copy catalog;
  /// environment suffixes remain developer-facing target metadata.
  static String appTitleFor({
    required String consumerTitle,
    required String hostTitle,
  }) {
    final baseTitle = appRole.isHost ? hostTitle : consumerTitle;
    return switch (environment) {
      AppEnvironment.dev => '$baseTitle (Dev)',
      AppEnvironment.staging => '$baseTitle (Staging)',
      AppEnvironment.prod => baseTitle,
    };
  }

  @visibleForTesting
  static Duration remoteConfigMinimumFetchIntervalFor({
    required AppEnvironment environment,
    required bool debugMode,
    required bool useFirebaseEmulators,
  }) {
    if (debugMode || useFirebaseEmulators || !environment.isProduction) {
      return Duration.zero;
    }
    return const Duration(hours: 1);
  }

  static Duration get remoteConfigMinimumFetchInterval =>
      remoteConfigMinimumFetchIntervalFor(
        environment: environment,
        debugMode: kDebugMode,
        useFirebaseEmulators: useFirebaseEmulators,
      );

  @visibleForTesting
  static bool shouldCollectObservabilityFor({
    required AppEnvironment environment,
    required bool releaseMode,
    required bool profileMode,
    required bool useFirebaseEmulators,
    required bool forceNonProductionCollection,
  }) {
    if (useFirebaseEmulators) return false;
    if (releaseMode && environment.isProduction) return true;
    if (releaseMode || profileMode) return forceNonProductionCollection;
    return false;
  }

  static bool get shouldCollectObservability => shouldCollectObservabilityFor(
    environment: environment,
    releaseMode: kReleaseMode,
    profileMode: kProfileMode,
    useFirebaseEmulators: useFirebaseEmulators,
    forceNonProductionCollection: enableObservabilityCollection,
  );

  @visibleForTesting
  static bool shouldUseFirebaseCrashReporterFor({
    required bool releaseMode,
    required bool profileMode,
    required bool forceObservabilityCollection,
  }) {
    return releaseMode || (profileMode && forceObservabilityCollection);
  }

  static bool get shouldUseFirebaseCrashReporter =>
      shouldUseFirebaseCrashReporterFor(
        releaseMode: kReleaseMode,
        profileMode: kProfileMode,
        forceObservabilityCollection: enableObservabilityCollection,
      );

  @visibleForTesting
  static bool canDebugSignOutOnStart({
    required bool releaseMode,
    required bool requested,
  }) {
    return requested && !releaseMode;
  }

  @visibleForTesting
  static bool canDisableAuthAppVerificationForTesting({
    required AppEnvironment environment,
    required bool releaseMode,
    required bool requested,
  }) {
    return requested && !releaseMode && !environment.isProduction;
  }

  static const bool enableObservabilityCollection = bool.fromEnvironment(
    'ENABLE_OBSERVABILITY_COLLECTION',
  );

  static const bool emitObservabilitySmokeEvent = bool.fromEnvironment(
    'EMIT_OBSERVABILITY_SMOKE_EVENT',
  );

  static bool get shouldShowEnvironmentBanner => !environment.isProduction;

  static String get environmentBannerLabel {
    if (!appRole.isHost) return environment.bannerLabel;
    if (environment.bannerLabel.isEmpty) return '';
    return 'HOST ${environment.bannerLabel}';
  }

  static const bool useFirebaseEmulators = bool.fromEnvironment(
    'USE_FIREBASE_EMULATORS',
  );

  static const String firebaseEmulatorProjectId = String.fromEnvironment(
    'FIREBASE_EMULATOR_PROJECT_ID',
  );

  // Default true so native push works in release builds without extra flags.
  // Web still requires a VAPID key — see firebaseWebVapidKey.
  static const bool enablePushMessaging = bool.fromEnvironment(
    'ENABLE_PUSH_MESSAGING',
    defaultValue: true,
  );

  static bool get supportsPushMessagingOnCurrentPlatform {
    if (useFirebaseEmulators || !enablePushMessaging) return false;

    if (kIsWeb) {
      return firebaseWebVapidKey.isNotEmpty;
    }

    return switch (defaultTargetPlatform) {
      TargetPlatform.android || TargetPlatform.iOS => true,
      _ => false,
    };
  }

  static const String firebaseWebVapidKey = String.fromEnvironment(
    'FIREBASE_WEB_VAPID_KEY',
  );

  static const String firebaseAppCheckDebugToken = String.fromEnvironment(
    'FIREBASE_APP_CHECK_DEBUG_TOKEN',
  );

  static final Uri hostAppUrl = Uri.parse(
    const String.fromEnvironment(
      'CATCH_HOST_APP_URL',
      defaultValue: 'https://catchdates.com/host',
    ),
  );

  /// Public marketing/guest site origin — household RSVP links resolve at
  /// `${publicSiteUrl}/rsvp/<token>`.
  static final Uri publicSiteUrl = Uri.parse(
    const String.fromEnvironment(
      'CATCH_PUBLIC_SITE_URL',
      defaultValue: 'https://catchdates.com',
    ),
  );

  /// Owner-approved public legal/support destinations shown by consumer
  /// Settings and the Host account menu. Empty values keep those entries
  /// hidden instead of launching dormant routes.
  static const String _privacyPolicyUrl = String.fromEnvironment(
    'CATCH_PRIVACY_POLICY_URL',
  );
  static const String _termsUrl = String.fromEnvironment('CATCH_TERMS_URL');
  static const String _helpUrl = String.fromEnvironment('CATCH_HELP_URL');

  static Map<String, String>? _legalUrlDefinesOverride;

  static Uri? get privacyPolicyUrl =>
      _legalUrl('CATCH_PRIVACY_POLICY_URL', _privacyPolicyUrl);
  static Uri? get termsUrl => _legalUrl('CATCH_TERMS_URL', _termsUrl);
  static Uri? get helpUrl => _legalUrl('CATCH_HELP_URL', _helpUrl);

  static Uri? _legalUrl(String name, String compiledValue) =>
      configuredExternalUriFor(
        _legalUrlDefinesOverride?[name] ?? compiledValue,
      );

  /// Supplies dart-define values for the legal URLs to widget tests, which
  /// run without the environment define files.
  @visibleForTesting
  static void overrideLegalUrlDefinesForTesting(Map<String, String> defines) {
    _legalUrlDefinesOverride = Map.unmodifiable(defines);
  }

  @visibleForTesting
  static void resetLegalUrlDefinesOverrideForTesting() {
    _legalUrlDefinesOverride = null;
  }

  @visibleForTesting
  static Uri? configuredExternalUriFor(String value) {
    final uri = Uri.tryParse(value.trim());
    if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) return null;
    return uri;
  }

  static const bool useFirebaseAppCheckDebugProvider = bool.fromEnvironment(
    'USE_FIREBASE_APP_CHECK_DEBUG_PROVIDER',
  );

  static const bool verboseAuthDebugLogs = bool.fromEnvironment(
    'VERBOSE_AUTH_DEBUG_LOGS',
  );

  static const bool disableAuthAppVerificationForTesting = bool.fromEnvironment(
    'DISABLE_AUTH_APP_VERIFICATION_FOR_TESTING',
  );

  static const bool debugSignOutOnStart = bool.fromEnvironment(
    'DEBUG_SIGN_OUT_ON_START',
  );

  static bool get shouldDebugSignOutOnStart => canDebugSignOutOnStart(
    releaseMode: kReleaseMode,
    requested: debugSignOutOnStart,
  );

  static bool get shouldDisableAuthAppVerificationForTesting =>
      canDisableAuthAppVerificationForTesting(
        environment: environment,
        releaseMode: kReleaseMode,
        requested: disableAuthAppVerificationForTesting,
      );

  static const String firebaseAppCheckWebRecaptchaEnterpriseSiteKey =
      String.fromEnvironment(
        'FIREBASE_APP_CHECK_WEB_RECAPTCHA_ENTERPRISE_SITE_KEY',
      );

  static String get firebaseEmulatorHost {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return '10.0.2.2';
    }
    return 'localhost';
  }
}
