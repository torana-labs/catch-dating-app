import 'dart:async';

import 'package:catch_dating_app/platform/analytics/host_analytics_choice.dart';
import 'package:catch_dating_app/platform/analytics/host_analytics_policy.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'app_analytics.g.dart';

abstract interface class AnalyticsReporter {
  Future<void> setCollectionEnabled(bool enabled);

  Future<void> logEvent(String name, {Map<String, Object>? parameters});

  Future<void> logScreenView({required String screenName, String? screenClass});

  Future<void> setUserId(String? userId);
}

final class FirebaseAnalyticsReporter
    implements AnalyticsReporter, HostAnalyticsPrivacyReporter {
  FirebaseAnalyticsReporter(this._analytics);

  final FirebaseAnalytics _analytics;

  @override
  Future<void> setHostAnalyticsConsent(bool granted) => _analytics.setConsent(
    analyticsStorageConsentGranted: granted,
    adStorageConsentGranted: false,
    adUserDataConsentGranted: false,
    adPersonalizationSignalsConsentGranted: false,
  );

  @override
  Future<void> resetHostAnalyticsData() => _analytics.resetAnalyticsData();

  @override
  Future<void> setCollectionEnabled(bool enabled) {
    return _analytics.setAnalyticsCollectionEnabled(enabled);
  }

  @override
  Future<void> logEvent(String name, {Map<String, Object>? parameters}) {
    return _analytics.logEvent(name: name, parameters: parameters);
  }

  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) {
    return _analytics.logScreenView(
      screenName: screenName,
      screenClass: screenClass,
    );
  }

  @override
  Future<void> setUserId(String? userId) {
    return _analytics.setUserId(id: userId);
  }
}

final class NoOpAnalyticsReporter implements AnalyticsReporter {
  const NoOpAnalyticsReporter();

  @override
  Future<void> setCollectionEnabled(bool enabled) async {}

  @override
  Future<void> logEvent(String name, {Map<String, Object>? parameters}) async {}

  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {}

  @override
  Future<void> setUserId(String? userId) async {}
}

// keepalive: analytics facade keeps user/session attribution stable across
// navigation and background event emission.
@Riverpod(keepAlive: true)
AppAnalytics appAnalytics(Ref ref) => AppAnalytics();

/// Vendor-neutral analytics facade for product and navigation events.
class AppAnalytics {
  AppAnalytics({
    AnalyticsReporter? reporter,
    bool? shouldCollect,
    bool? hostRole,
    HostAnalyticsChoiceStore? hostChoiceStore,
  }) : _shouldCollect = shouldCollect ?? _defaultShouldCollect,
       _hostRole = hostRole ?? AppConfig.appRole.isHost,
       _hostChoiceStore = hostChoiceStore ?? HostAnalyticsChoiceStore(),
       _reporter =
           reporter ??
           _defaultReporter(shouldCollect ?? _defaultShouldCollect) {
    final reporter = _reporter;
    if (_hostRole && reporter is HostAnalyticsPrivacyReporter) {
      _hostPermission = HostAnalyticsPermissionGate(
        setCollection: reporter.setCollectionEnabled,
        clearUserId: () => reporter.setUserId(null),
        privacy: reporter as HostAnalyticsPrivacyReporter,
      );
    }
  }

  final AnalyticsReporter _reporter;
  final bool _shouldCollect;
  final bool _hostRole;
  final HostAnalyticsChoiceStore _hostChoiceStore;
  HostAnalyticsPermissionGate? _hostPermission;
  DateTime? _hostPermissionExpiry;
  Timer? _hostExpiryTimer;
  Future<void> _hostChoiceWork = Future<void>.value();
  int _hostChoiceRevision = 0;
  Map<String, Object> _baseParameters = const {};

  // Separate source gate: a saved choice cannot activate an unaccepted release.
  static const hostProductMeasurementEnabled = false;

  static bool get _defaultShouldCollect {
    return AppConfig.shouldCollectObservability &&
        (!AppConfig.appRole.isHost || hostProductMeasurementEnabled);
  }

  static AnalyticsReporter _defaultReporter(bool shouldCollect) {
    if (!shouldCollect) return const NoOpAnalyticsReporter();
    return FirebaseAnalyticsReporter(FirebaseAnalytics.instance);
  }

  Future<void> initialize() async {
    if (_hostRole) {
      // Existing installations may have persisted SDK collection=true.
      // Explicitly deny/reset instead of trusting native default flags.
      await _reporter.setCollectionEnabled(false);
      _hostPermissionExpiry = await _hostChoiceStore.permittedUntil();
      await _hostPermission?.apply(
        false,
        resetData: _hostPermissionExpiry == null,
      );
      if (_hostPermissionExpiry != null && _shouldCollect) {
        await _hostPermission?.apply(true);
        _scheduleHostExpiry();
      }
    } else {
      await _reporter.setCollectionEnabled(_shouldCollect);
    }
    if (!_shouldCollect) return;

    final packageInfo = await PackageInfo.fromPlatform();
    _baseParameters = {
      AnalyticsParameters.environment: AppConfig.environmentName,
      AnalyticsParameters.platform: defaultTargetPlatform.name,
      AnalyticsParameters.appVersion: packageInfo.version,
      AnalyticsParameters.buildNumber: packageInfo.buildNumber,
    };
  }

  void logScreenView(String screenName) {
    // Shared route names can contain private route context. Host uses only
    // the closed product event contract, never generic screen reporting.
    if (!_shouldCollect || _hostRole) return;
    unawaited(
      _reporter.logScreenView(screenName: screenName, screenClass: 'GoRouter'),
    );
  }

  void logEvent(String name, {Map<String, Object?> parameters = const {}}) {
    if (!_shouldCollect) return;
    if (_hostRole && !hostAnalyticsAllowed) return;
    final sanitizedParameters = _hostRole
        ? hostAnalyticsParameters(name, parameters)
        : _sanitizeParameters(parameters);
    if (sanitizedParameters == null) return;

    unawaited(
      _reporter.logEvent(
        _validateEventName(name),
        parameters: {..._baseParameters, ...sanitizedParameters},
      ),
    );
  }

  /// Capture permission when a Host operation starts. Completion never replays
  /// activity begun before consent or across a withdrawal/re-consent cycle.
  VoidCallback hostEventCompletion(String name) {
    final permitted = hostAnalyticsAllowed;
    final revision = _hostChoiceRevision;
    return () {
      if (permitted &&
          revision == _hostChoiceRevision &&
          hostAnalyticsAllowed) {
        logEvent(name);
      }
    };
  }

  void setUserId(String? userId) {
    if (!_shouldCollect || _hostRole) return;
    unawaited(_reporter.setUserId(userId));
  }

  /// Called only by the versioned Host privacy-choice owner. Permission never
  /// overrides the environment/release collection gate.
  bool get hostAnalyticsAllowed =>
      _hostRole &&
      _hostPermission?.allowed == true &&
      hostAnalyticsChoiceGranted;

  bool get hostAnalyticsChoiceGranted =>
      _hostRole && _hostPermissionExpiry?.isAfter(DateTime.now()) == true;

  Future<void> setHostAnalyticsPermission(bool granted) {
    if (!_hostRole) return Future<void>.value();
    final revision = ++_hostChoiceRevision;
    _hostPermissionExpiry = null;
    _hostExpiryTimer?.cancel();
    // Start disabling synchronously, before persistence or another action.
    final denied = _hostPermission?.apply(false) ?? Future<void>.value();
    final operation = _hostChoiceWork.then((_) async {
      await denied;
      final expiry = await _hostChoiceStore.save(granted);
      if (revision != _hostChoiceRevision) return;
      _hostPermissionExpiry = expiry;
      await _hostPermission?.apply(granted && _shouldCollect);
      if (revision == _hostChoiceRevision) _scheduleHostExpiry();
    });
    final completion = Completer<void>();
    _hostChoiceWork = operation.then<void>(completion.complete).catchError((
      Object error,
      StackTrace stack,
    ) {
      completion.completeError(error, stack);
    });
    return completion.future;
  }

  void _scheduleHostExpiry() {
    _hostExpiryTimer?.cancel();
    final expiry = _hostPermissionExpiry;
    if (expiry == null || _hostPermission?.allowed != true) return;
    _hostExpiryTimer = Timer(expiry.difference(DateTime.now()), () {
      _hostPermissionExpiry = null;
      unawaited(_hostPermission?.apply(false));
    });
  }

  /// Logs a normalized backend failure with non-PII operation context.
  void logBackendOperationFailed({
    required BackendErrorContext context,
    required String errorCode,
    required bool retryable,
    required AppErrorSeverity severity,
  }) {
    logEvent(
      AnalyticsEvents.backendOperationFailed,
      parameters: {
        AnalyticsParameters.backendService: context.service.logKey,
        AnalyticsParameters.backendAction: context.action,
        AnalyticsParameters.backendResource: context.resource,
        AnalyticsParameters.backendErrorCode: errorCode,
        AnalyticsParameters.backendRetryable: retryable,
        AnalyticsParameters.backendSeverity: severity.name,
        ...context.metadata,
      },
    );
  }

  static String _validateEventName(String name) {
    final isValid = RegExp(r'^[a-zA-Z][a-zA-Z0-9_]{0,39}$').hasMatch(name);
    if (!isValid) {
      throw ArgumentError.value(
        name,
        'name',
        'Analytics event names must start with a letter and contain only letters, numbers, or underscores.',
      );
    }
    return name;
  }

  static Map<String, Object> _sanitizeParameters(
    Map<String, Object?> parameters,
  ) {
    return {
      for (final entry in parameters.entries)
        if (entry.value != null) entry.key: entry.value!,
    };
  }
}

class AnalyticsRouteObserver extends NavigatorObserver {
  AnalyticsRouteObserver(this._analytics);

  final AppAnalytics _analytics;
  String? _lastScreenName;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _logRoute(route);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    if (newRoute != null) {
      _logRoute(newRoute);
    }
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (previousRoute != null) {
      _logRoute(previousRoute);
    }
  }

  void _logRoute(Route<dynamic> route) {
    final screenName = route.settings.name;
    if (screenName == null || screenName.isEmpty) return;
    if (screenName == _lastScreenName) return;

    _lastScreenName = screenName;
    _analytics.logScreenView(screenName);
  }
}

abstract final class AnalyticsEvents {
  static const authStarted = 'auth_started';
  static const authCompleted = 'auth_completed';
  static const onboardingStarted = 'onboarding_started';
  static const onboardingCompleted = 'onboarding_completed';
  static const welcomeSplashShown = 'welcome_splash_shown';
  static const welcomeSplashSkipped = 'welcome_splash_skipped';
  static const welcomeCtaTapped = 'welcome_cta_tapped';
  static const organizerViewed = 'club_viewed';
  static const organizerJoined = 'club_joined';
  static const exploreEventOpened = 'explore_event_opened';
  static const crossPathsImpression = 'cross_paths_impression';
  static const crossPathsProfileOpened = 'cross_paths_profile_open';
  static const crossPathsEventOpened = 'cross_paths_event_open';
  static const crossPathsBookingStarted = 'cross_paths_booking_started';
  static const crossPathsBookingCompleted = 'cross_paths_booking_completed';
  static const crossPathsInvitationSent = 'cross_paths_invitation_sent';
  static const crossPathsInvitationAccepted = 'cross_paths_invitation_accepted';
  static const crossPathsInvitationDeclined = 'cross_paths_invitation_declined';
  static const crossPathsInvitationCancelled =
      'cross_paths_invitation_cancelled';
  static const exploreMapEventSelected = 'explore_map_event_selected';
  static const homeOpened = 'home_opened';
  static const homeModuleImpression = 'home_module_impression';
  static const homeActionTap = 'home_action_tap';
  static const catchWindowImpression = 'catch_window_impression';
  static const catchWindowOpen = 'catch_window_open';
  static const organizerPostCreated = 'club_post_created';
  static const organizerPostImpression = 'club_post_impression';
  static const organizerPostOpen = 'club_post_open';
  static const eventViewed = 'event_viewed';
  static const eventBookingStarted = 'event_booking_started';
  static const eventBooked = 'event_booked';
  static const eventBookingFailed = 'event_booking_failed';
  static const eventAttended = 'event_attended';
  static const phoneVerified = 'phone_verified';
  static const profileCompleted = 'profile_completed';
  static const postEventReactionSent = 'post_event_reaction_sent';
  static const matchCreated = 'match_created';
  static const hostOrganizerCreated = 'host_club_created';
  static const hostEventCreated = 'host_event_created';
  static const hostEventPublished = 'host_event_published';
  static const swipeSent = 'swipe_sent';
  static const matchViewed = 'match_viewed';
  static const chatMessageSent = 'chat_message_sent';
  static const profileEdited = 'profile_edited';
  static const backendOperationFailed = 'backend_operation_failed';
  static const observabilitySmoke = 'observability_smoke';
}

abstract final class AnalyticsParameters {
  static const environment = 'environment';
  static const platform = 'platform';
  static const appVersion = 'app_version';
  static const buildNumber = 'build_number';
  static const authMethod = 'auth_method';
  static const onboardingStep = 'onboarding_step';
  static const splashMotion = 'splash_motion';
  static const cta = 'cta';
  static const organizerId = 'club_id';
  static const eventId = 'event_id';
  static const activityKind = 'activity_kind';
  static const availabilityStatus = 'availability_status';
  static const exploreSource = 'explore_source';
  static const viewerBookingStatus = 'viewer_booking_status';
  static const position = 'position';
  static const rankingVersion = 'ranking_version';
  static const reasonCodes = 'reason_codes';
  static const distanceKm = 'distance_km';
  static const homeState = 'state';
  static const homeModule = 'module';
  static const homeAction = 'action';
  static const surface = 'surface';
  static const matchId = 'match_id';

  // Backend error context. Values must be non-PII.
  static const backendService = 'backend_service';
  static const backendAction = 'backend_action';
  static const backendResource = 'backend_resource';
  static const backendErrorCode = 'backend_error_code';
  static const backendRetryable = 'backend_retryable';
  static const backendSeverity = 'backend_severity';
}
