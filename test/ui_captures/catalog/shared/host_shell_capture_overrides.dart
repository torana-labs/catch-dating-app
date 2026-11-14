// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.

import 'dart:async';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_platform/analytics/app_analytics.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/push/fcm_service.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';

final captureAnalyticsOverride = appAnalyticsProvider.overrideWithValue(
  AppAnalytics(reporter: NoOpAnalyticsReporter(), shouldCollect: false),
);

class CaptureSilentErrorLogger extends ErrorLogger {
  CaptureSilentErrorLogger()
    : super(crashReporter: null, shouldReportErrors: false);

  @override
  void log({
    required LogLevel level,
    required String message,
    Object? error,
    StackTrace? stackTrace,
    Map<String, String>? context,
  }) {}
}

class CaptureUnsupportedFcmService extends FcmService {
  CaptureUnsupportedFcmService()
    : super(FakeFirebaseFirestore(), CaptureSilentErrorLogger());

  @override
  bool get isSupportedPlatform => false;
}

List<Object> hostShellCaptureOverrides(String uid, {int unreadCount = 0}) {
  return [
    captureAnalyticsOverride,
    errorLoggerProvider.overrideWithValue(CaptureSilentErrorLogger()),
    fcmServiceProvider.overrideWithValue(CaptureUnsupportedFcmService()),
    appConnectivityProvider.overrideWith(
      (ref) =>
          Stream.value(const <ConnectivityResult>[ConnectivityResult.wifi]),
    ),
    totalUnreadCountProvider(uid).overrideWithValue(unreadCount),
  ];
}

final class NoOpAnalyticsReporter implements AnalyticsReporter {
  @override
  Future<void> logEvent(String name, {Map<String, Object>? parameters}) async {}

  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {}

  @override
  Future<void> setCollectionEnabled(bool enabled) async {}

  @override
  Future<void> setUserId(String? userId) async {}
}
