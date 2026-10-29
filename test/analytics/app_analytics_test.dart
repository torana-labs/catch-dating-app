import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:package_info_plus/package_info_plus.dart';

void main() {
  setUp(() {
    PackageInfo.setMockInitialValues(
      appName: 'Catch',
      packageName: 'com.catch.app',
      version: '1.2.3',
      buildNumber: '45',
      buildSignature: '',
    );
  });

  test('disables collection and drops events when collection is off', () async {
    final reporter = _FakeAnalyticsReporter();
    final analytics = AppAnalytics(reporter: reporter, shouldCollect: false);

    await analytics.initialize();
    analytics.logEvent(AnalyticsEvents.authStarted);
    analytics.logScreenView('dashboardScreen');
    analytics.setUserId('runner-1');

    expect(reporter.collectionEnabled, isFalse);
    expect(reporter.events, isEmpty);
    expect(reporter.screenViews, isEmpty);
    expect(reporter.userIds, isEmpty);
  });

  test(
    'logs events with release context and without null parameters',
    () async {
      final reporter = _FakeAnalyticsReporter();
      final analytics = AppAnalytics(reporter: reporter, shouldCollect: true);

      await analytics.initialize();
      analytics.logEvent(
        AnalyticsEvents.eventViewed,
        parameters: {
          AnalyticsParameters.eventId: 'event-1',
          'empty_value': null,
        },
      );

      expect(reporter.collectionEnabled, isTrue);
      expect(reporter.events, hasLength(1));
      expect(reporter.events.single.name, AnalyticsEvents.eventViewed);
      expect(
        reporter.events.single.parameters,
        containsPair('event_id', 'event-1'),
      );
      expect(
        reporter.events.single.parameters,
        containsPair('app_version', '1.2.3'),
      );
      expect(
        reporter.events.single.parameters,
        containsPair('build_number', '45'),
      );
      expect(reporter.events.single.parameters, isNot(contains('empty_value')));
    },
  );

  test('rejects invalid event names before sending to vendor SDK', () async {
    final reporter = _FakeAnalyticsReporter();
    final analytics = AppAnalytics(reporter: reporter, shouldCollect: true);

    await analytics.initialize();

    expect(
      () => analytics.logEvent('event-viewed'),
      throwsA(isA<ArgumentError>()),
    );
    expect(reporter.events, isEmpty);
  });

  test('uses event-platform conversion names for ad readiness', () {
    expect(AnalyticsEvents.eventBookingStarted, 'event_booking_started');
    expect(AnalyticsEvents.eventBooked, 'event_booked');
    expect(AnalyticsEvents.eventBookingFailed, 'event_booking_failed');
    expect(AnalyticsEvents.eventAttended, 'event_attended');
    expect(AnalyticsEvents.phoneVerified, 'phone_verified');
    expect(AnalyticsEvents.profileCompleted, 'profile_completed');
    expect(AnalyticsEvents.hostEventCreated, 'host_event_created');
  });

  test('uses the approved Cross Paths funnel event names', () {
    expect(AnalyticsEvents.crossPathsImpression, 'cross_paths_impression');
    expect(AnalyticsEvents.crossPathsProfileOpened, 'cross_paths_profile_open');
    expect(AnalyticsEvents.crossPathsEventOpened, 'cross_paths_event_open');
    expect(
      AnalyticsEvents.crossPathsBookingStarted,
      'cross_paths_booking_started',
    );
    expect(
      AnalyticsEvents.crossPathsBookingCompleted,
      'cross_paths_booking_completed',
    );
  });

  test('route observer records unique route names', () {
    final reporter = _FakeAnalyticsReporter();
    final analytics = AppAnalytics(reporter: reporter, shouldCollect: true);
    final observer = AnalyticsRouteObserver(analytics);

    observer.didPush(_route('dashboardScreen'), null);
    observer.didPush(_route('dashboardScreen'), null);
    observer.didPush(_route('eventDetailScreen'), null);

    expect(reporter.screenViews, ['dashboardScreen', 'eventDetailScreen']);
  });
}

Route<dynamic> _route(String name) {
  return MaterialPageRoute<void>(
    settings: RouteSettings(name: name),
    builder: (_) => const SizedBox.shrink(),
  );
}

final class _AnalyticsEventCall {
  const _AnalyticsEventCall(this.name, this.parameters);

  final String name;
  final Map<String, Object>? parameters;
}

final class _FakeAnalyticsReporter implements AnalyticsReporter {
  bool? collectionEnabled;
  final events = <_AnalyticsEventCall>[];
  final screenViews = <String>[];
  final userIds = <String?>[];

  @override
  Future<void> setCollectionEnabled(bool enabled) async {
    collectionEnabled = enabled;
  }

  @override
  Future<void> logEvent(String name, {Map<String, Object>? parameters}) async {
    events.add(_AnalyticsEventCall(name, parameters));
  }

  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {
    screenViews.add(screenName);
  }

  @override
  Future<void> setUserId(String? userId) async {
    userIds.add(userId);
  }
}
