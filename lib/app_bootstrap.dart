import 'dart:async';

import 'package:catch_dating_app/consumer_bootstrap.dart';
import 'package:catch_dating_app/contexts/account/data/force_update_provider.dart';
import 'package:catch_dating_app/contexts/account/domain/app_version_config.dart';
import 'package:catch_dating_app/firebase_options.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/errors/provider_retry_policy.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/push/fcm_service.dart';
import 'package:catch_dating_app/platform/riverpod_ui/failed_reads.dart';
import 'package:catch_dating_app/platform/startup/native_splash.dart';
import 'package:catch_dating_app/platform/startup/startup_animation_scope.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:package_info_plus/package_info_plus.dart';

Future<void> runCatchApp({
  required AppRole appRole,
  required Widget app,
  AppEnvironment? environment,
  List<Override> rootOverrides = const [],
}) async {
  AppConfig.configureEntrypointRole(appRole);
  if (environment != null) {
    AppConfig.configureEntrypointEnvironment(environment);
  }

  final widgetsBinding = WidgetsFlutterBinding.ensureInitialized();
  registerCatchFontLicenses();
  NativeSplash.preserve(widgetsBinding: widgetsBinding);

  if (_usesAnimatedConsumerBootstrap(
    appRole: appRole,
    isWeb: kIsWeb,
    platform: defaultTargetPlatform,
  )) {
    final container = createCatchAppContainer(overrides: rootOverrides);
    _AppPackageInfo? appPackageInfo;
    runApp(
      UncontrolledProviderScope(
        container: container,
        child: _CatchProviderContainerOwner(
          container: container,
          child: CatchConsumerBootstrap(
            initialize: () async {
              appPackageInfo = await _initializeCatchServices(
                container: container,
                preloadAppPackageInfo: true,
              );
            },
            initializedAppBuilder: (_) => ProviderScope(
              overrides: [
                if (appPackageInfo != null)
                  appPackageInfoProvider.overrideWith((ref) => appPackageInfo!),
              ],
              child: StartupAnimationScope(
                consumerWelcomeReelPlayed: true,
                child: app,
              ),
            ),
            onNativeSplashReady: NativeSplash.remove,
            onInitializationError: (error, stackTrace) {
              try {
                container
                    .read(errorLoggerProvider)
                    .logError(
                      error,
                      stackTrace,
                      reason: 'Consumer startup initialization failed',
                    );
              } catch (reportingError) {
                // Firebase itself may be the failed startup dependency.
                debugPrint(
                  'Consumer startup failure: $error; '
                  'error reporting unavailable: $reportingError',
                );
              }
            },
          ),
        ),
      ),
    );
    return;
  }

  final container = createCatchAppContainer(overrides: rootOverrides);
  await _initializeCatchServices(
    container: container,
    preloadAppPackageInfo: false,
  );
  runApp(
    UncontrolledProviderScope(
      container: container,
      child: _CatchProviderContainerOwner(
        container: container,
        child: StartupAnimationScope(
          consumerWelcomeReelPlayed: false,
          child: app,
        ),
      ),
    ),
  );
}

/// Creates the provider root used by both animated and standard app startup.
@visibleForTesting
ProviderContainer createCatchAppContainer({
  List<Override> overrides = const [],
}) => ProviderContainer(
  overrides: overrides,
  observers: [_asyncErrorLogger(), const FailedReadRecorder()],
  retry: catchProviderRetry,
);

AsyncErrorLogger _asyncErrorLogger() {
  return AsyncErrorLogger(
    onBackendOperationFailed:
        (
          container, {
          required BackendErrorContext context,
          required String errorCode,
          required bool retryable,
          required AppErrorSeverity severity,
        }) {
          container
              .read(appAnalyticsProvider)
              .logBackendOperationFailed(
                context: context,
                errorCode: errorCode,
                retryable: retryable,
                severity: severity,
              );
        },
  );
}

typedef _AppPackageInfo = ({String version, String buildNumber});

Future<_AppPackageInfo?> _initializeCatchServices({
  required ProviderContainer container,
  required bool preloadAppPackageInfo,
}) async {
  await _lockDeviceOrientation();
  final remoteConfigError = await _initializeFirebaseServices();

  final errorLogger = container.read(errorLoggerProvider);
  await errorLogger.initialize();
  final analytics = container.read(appAnalyticsProvider);
  await analytics.initialize();
  if (remoteConfigError != null) {
    errorLogger.logError(
      remoteConfigError.$1,
      remoteConfigError.$2,
      reason:
          'Remote Config fetchAndActivate failed at startup; the '
          'force-update gate is running on bundled defaults.',
    );
  }
  _emitObservabilitySmokeIfRequested(errorLogger, analytics);

  _registerErrorHandlers(errorLogger);

  final packageInfo = preloadAppPackageInfo
      ? await PackageInfo.fromPlatform()
      : null;
  return packageInfo == null
      ? null
      : (version: packageInfo.version, buildNumber: packageInfo.buildNumber);
}

class _CatchProviderContainerOwner extends StatefulWidget {
  const _CatchProviderContainerOwner({
    required this.container,
    required this.child,
  });

  final ProviderContainer container;
  final Widget child;

  @override
  State<_CatchProviderContainerOwner> createState() =>
      _CatchProviderContainerOwnerState();
}

class _CatchProviderContainerOwnerState
    extends State<_CatchProviderContainerOwner> {
  @override
  void didUpdateWidget(covariant _CatchProviderContainerOwner oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.container != widget.container) {
      oldWidget.container.dispose();
    }
  }

  @override
  void dispose() {
    widget.container.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

@visibleForTesting
bool usesAnimatedConsumerBootstrap({
  required AppRole appRole,
  required bool isWeb,
  required TargetPlatform platform,
}) {
  return _usesAnimatedConsumerBootstrap(
    appRole: appRole,
    isWeb: isWeb,
    platform: platform,
  );
}

bool _usesAnimatedConsumerBootstrap({
  required AppRole appRole,
  required bool isWeb,
  required TargetPlatform platform,
}) {
  if (appRole != AppRole.consumer || isWeb) return false;
  return platform == TargetPlatform.iOS || platform == TargetPlatform.android;
}

void _emitObservabilitySmokeIfRequested(
  ErrorLogger errorLogger,
  AppAnalytics analytics,
) {
  if (!AppConfig.emitObservabilitySmokeEvent) return;

  errorLogger.logError(
    StateError('observability_smoke_event'),
    StackTrace.current,
    reason: 'Observability smoke event',
  );
  analytics.logEvent(AnalyticsEvents.observabilitySmoke);
}

Future<void> _lockDeviceOrientation() {
  return SystemChrome.setPreferredOrientations(const [
    DeviceOrientation.portraitUp,
  ]);
}

/// Returns the Remote Config fetch failure (error, stack) when the initial
/// fetch fails, or null. See [_initializeRemoteConfig].
Future<(Object, StackTrace)?> _initializeFirebaseServices() async {
  await _initializeDefaultFirebaseApp();
  if (AppConfig.useFirebaseEmulators) {
    final host = AppConfig.firebaseEmulatorHost;
    await FirebaseAuth.instance.useAuthEmulator(host, 9099);
    FirebaseFirestore.instance.useFirestoreEmulator(host, 8080);
    await FirebaseStorage.instance.useStorageEmulator(host, 9199);
    FirebaseFunctions.instanceFor(
      region: firebaseFunctionsRegion,
    ).useFunctionsEmulator(host, 5001);
  }
  await _activateFirebaseAppCheck();
  await _configureFirebaseAuthTestingSettings();
  await _debugSignOutOnStartIfRequested();

  // Enable offline persistence explicitly — defaults differ by platform
  // (mobile: enabled, web: disabled). Setting it ensures consistent behavior.
  FirebaseFirestore.instance.settings = const Settings(
    persistenceEnabled: true,
  );

  final remoteConfigError = await _initializeRemoteConfig();

  if (AppConfig.supportsPushMessagingOnCurrentPlatform) {
    registerFirebaseMessagingBackgroundHandler();
  }

  return remoteConfigError;
}

Future<void> _initializeDefaultFirebaseApp() async {
  final demoProject = AppConfig.firebaseEmulatorProjectId;
  if (demoProject.isNotEmpty &&
      (!AppConfig.useFirebaseEmulators ||
          !demoProject.startsWith('demo-') ||
          !kIsWeb ||
          AppConfig.environment != AppEnvironment.dev)) {
    throw StateError(
      'An isolated Firebase demo project requires the local web target.',
    );
  }
  if (_hasDefaultFirebaseApp()) {
    if (demoProject.isNotEmpty &&
        Firebase.app().options.projectId != demoProject) {
      throw StateError(
        'The existing Firebase app is not the requested demo project.',
      );
    }
    return;
  }

  try {
    await Firebase.initializeApp(
      options: demoProject.isEmpty
          ? DefaultFirebaseOptions.currentPlatform
          : FirebaseOptions(
              apiKey: 'demo-api-key',
              appId: '1:1234567890:web:0000000000000000000000',
              messagingSenderId: '1234567890',
              projectId: demoProject,
              storageBucket: '$demoProject.appspot.com',
            ),
    );
  } on FirebaseException catch (error) {
    if (error.code == 'duplicate-app' &&
        _hasDefaultFirebaseApp() &&
        (demoProject.isEmpty ||
            Firebase.app().options.projectId == demoProject)) {
      return;
    }
    rethrow;
  }
}

bool _hasDefaultFirebaseApp() {
  // The web app lookup requires the JS SDK to have loaded. The app inventory
  // is safe before initialization and also distinguishes named secondary apps.
  return Firebase.apps.any((app) => app.name == '[DEFAULT]');
}

Future<void> _configureFirebaseAuthTestingSettings() async {
  if (!AppConfig.disableAuthAppVerificationForTesting) return;
  if (!AppConfig.shouldDisableAuthAppVerificationForTesting) {
    throw StateError(
      'DISABLE_AUTH_APP_VERIFICATION_FOR_TESTING is only allowed for '
      'non-production non-release builds.',
    );
  }
  debugPrint('Firebase Auth app verification disabled for testing.');
  await FirebaseAuth.instance.setSettings(
    appVerificationDisabledForTesting: true,
  );
}

Future<void> _debugSignOutOnStartIfRequested() async {
  if (!AppConfig.debugSignOutOnStart) return;
  if (!AppConfig.shouldDebugSignOutOnStart) {
    throw StateError(
      'DEBUG_SIGN_OUT_ON_START is only allowed for non-release builds.',
    );
  }
  debugPrint('Firebase Auth debug sign-out requested at startup.');
  await FirebaseAuth.instance.signOut();
}

/// Returns the fetch failure (error, stack) when the initial Remote Config
/// fetch fails, or null on success. The caller logs it once [ErrorLogger] is
/// ready — the app still boots on bundled defaults either way.
Future<(Object, StackTrace)?> _initializeRemoteConfig() async {
  final remoteConfig = FirebaseRemoteConfig.instance;
  await remoteConfig.setConfigSettings(
    RemoteConfigSettings(
      fetchTimeout: const Duration(seconds: 10),
      minimumFetchInterval: AppConfig.remoteConfigMinimumFetchInterval,
    ),
  );
  await remoteConfig.setDefaults(kAppVersionConfigDefaults);
  if (AppConfig.useFirebaseEmulators) return null;
  try {
    await remoteConfig.fetchAndActivate();
    return null;
  } catch (error, stackTrace) {
    // Fetch failed — bundled defaults serve the force-update gate. Return the
    // failure so a real misconfig (bad RC template, App Check block, project
    // mismatch) is visible in Crashlytics instead of silently swallowed.
    return (error, stackTrace);
  }
}

Future<void> _activateFirebaseAppCheck() async {
  if (AppConfig.useFirebaseEmulators &&
      AppConfig.firebaseEmulatorProjectId.isNotEmpty) {
    return;
  }
  final debugToken = AppConfig.firebaseAppCheckDebugToken.trim();
  final debugTokenOrNull = debugToken.isEmpty ? null : debugToken;
  final useDebugProvider =
      AppConfig.useFirebaseAppCheckDebugProvider ||
      AppConfig.useFirebaseEmulators;
  final useWebDebugProvider = kDebugMode || useDebugProvider;
  final useAndroidDebugProvider = kDebugMode || useDebugProvider;
  final useAppleDebugProvider = useDebugProvider;

  debugPrint('── App Check init ──');
  debugPrint('  kDebugMode: $kDebugMode');
  debugPrint('  debugToken configured: ${debugToken.isNotEmpty}');
  debugPrint('  forceDebugProvider: $useDebugProvider');
  debugPrint('  useAppleDebugProvider: $useAppleDebugProvider');

  if (kIsWeb) {
    final siteKey = AppConfig.firebaseAppCheckWebRecaptchaEnterpriseSiteKey
        .trim();
    if (useWebDebugProvider) {
      debugPrint(
        debugToken.isEmpty
            ? 'WARNING: Debug provider active but no FIREBASE_APP_CHECK_DEBUG_TOKEN set.'
            : 'Using WebDebugProvider with configured token.',
      );
      await FirebaseAppCheck.instance.activate(
        providerWeb: WebDebugProvider(debugToken: debugTokenOrNull),
      );
    } else if (siteKey.isNotEmpty) {
      await FirebaseAppCheck.instance.activate(
        providerWeb: ReCaptchaEnterpriseProvider(siteKey),
      );
    } else {
      debugPrint(
        'WARNING: Web App Check has no debug token and no ReCaptcha site key '
        'configured. App Check enforcement is silently disabled — all '
        'App Check-protected services (Firestore, Auth, Functions) are '
        'unprotected on web.',
      );
    }
    return;
  }

  if ((useAndroidDebugProvider || useAppleDebugProvider) &&
      debugToken.isEmpty) {
    debugPrint(
      'WARNING: Debug App Check provider active on iOS/Android but no '
      'FIREBASE_APP_CHECK_DEBUG_TOKEN env var is set. A random token will be '
      'generated and printed. It must be registered in Firebase Console '
      '(App Check > Manage debug tokens) and re-exported, or all App Check-'
      'protected services (Firestore, Auth, Functions) will fail with 403.',
    );
  }

  await FirebaseAppCheck.instance.activate(
    providerAndroid: useAndroidDebugProvider
        ? AndroidDebugProvider(debugToken: debugTokenOrNull)
        : const AndroidPlayIntegrityProvider(),
    providerApple: useAppleDebugProvider
        ? AppleDebugProvider(debugToken: debugTokenOrNull)
        : const AppleAppAttestProvider(),
  );
  if (useDebugProvider) {
    unawaited(_warmUpFirebaseAppCheckDebugToken());
  }
}

Future<void> _warmUpFirebaseAppCheckDebugToken() async {
  try {
    await FirebaseAppCheck.instance
        .getToken(true)
        .timeout(const Duration(seconds: 8));
  } catch (error) {
    debugPrint('Firebase App Check debug token warmup failed: $error');
  }
}

/// Hooks into Flutter's error reporting pipeline so uncaught errors are
/// logged and sent to Crashlytics in production release builds.
void _registerErrorHandlers(ErrorLogger errorLogger) {
  // Flutter framework errors (widget build failures, layout overflow, etc.)
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    errorLogger.logFlutterError(details, fatal: true);
  };

  // Errors from the underlying platform / Dart isolate
  PlatformDispatcher.instance.onError = (error, stack) {
    errorLogger.logError(error, stack, fatal: true);
    return true;
  };

  // Widget build failures should still look like Catch. Debug builds keep the
  // useful framework details, but the raw Flutter red screen should not leak
  // into the product shell.
  ErrorWidget.builder = (details) => Builder(
    builder: (context) => CatchFrameworkErrorState(
      copy: catchFrameworkErrorCopy(context.l10n),
      details: details,
    ),
  );
}
