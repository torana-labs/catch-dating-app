import 'dart:async';

import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/analytics/host_analytics_choice.dart';
import 'package:catch_dating_app/platform/analytics/host_analytics_policy.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:package_info_plus/package_info_plus.dart';

void main() {
  setUp(() {
    PackageInfo.setMockInitialValues(
      appName: 'Catch Host',
      packageName: 'com.catchdates.host',
      version: '1.0',
      buildNumber: '1',
      buildSignature: '',
    );
  });

  test(
    'Host begins denied and exports only a closed diagnostic projection',
    () async {
      final reporter = _Reporter();
      final analytics = AppAnalytics(
        reporter: reporter,
        shouldCollect: true,
        hostRole: true,
        hostChoiceStore: HostAnalyticsChoiceStore(
          read: () async => null,
          write: (_) async => true,
        ),
      );
      await analytics.initialize();
      analytics.logEvent('host_event_created');
      expect(reporter.events, isEmpty);
      expect(reporter.enabled, isFalse);
      expect(reporter.resets, 1);
      await analytics.setHostAnalyticsPermission(true);
      analytics.logEvent(
        'host_event_created',
        parameters: {
          'event_id': 'private-event',
          'email': 'private@example.test',
          'guest_name': 'Private guest',
          'app_role': 'consumer',
        },
      );
      analytics.logEvent('match_created');
      analytics.logEvent('host_organizer_activated');
      analytics.logScreenView('/host/guests/private-id');
      analytics.setUserId('private-uid');
      expect(reporter.events, hasLength(1));
      expect(reporter.events.single, containsPair('app_role', 'host'));
      expect(reporter.events.single, isNot(contains('event_id')));
      expect(reporter.events.single, isNot(contains('email')));
      expect(reporter.events.single, isNot(contains('guest_name')));
      expect(reporter.userIds.every((id) => id == null), isTrue);
      expect(reporter.screens, isEmpty);
      final withdrawal = analytics.setHostAnalyticsPermission(false);
      analytics.logEvent('host_event_created');
      expect(reporter.events, hasLength(1));
      await withdrawal;
      expect(reporter.enabled, isFalse);
      expect(reporter.granted, isFalse);
    },
  );

  test(
    'a late SDK grant cannot reopen local permission after withdrawal',
    () async {
      final reporter = _Reporter();
      final pendingGrant = Completer<void>();
      reporter.pendingGrant = pendingGrant.future;
      reporter.grantStarted = Completer<void>();
      final gate = HostAnalyticsPermissionGate(
        setCollection: reporter.setCollectionEnabled,
        clearUserId: () => reporter.setUserId(null),
        privacy: reporter,
      );
      final grant = gate.apply(true);
      await reporter.grantStarted!.future;
      final withdrawal = gate.apply(false);
      expect(gate.allowed, isFalse);
      pendingGrant.complete();
      await Future.wait([grant, withdrawal]);
      expect(gate.allowed, isFalse);
      expect(reporter.enabled, isFalse);
      expect(reporter.granted, isFalse);
    },
  );

  test(
    'Host permission cannot override the release/environment gate',
    () async {
      final reporter = _Reporter();
      final analytics = AppAnalytics(
        reporter: reporter,
        shouldCollect: false,
        hostRole: true,
        hostChoiceStore: HostAnalyticsChoiceStore(
          read: () async => null,
          write: (_) async => true,
        ),
      );
      await analytics.initialize();
      await analytics.setHostAnalyticsPermission(true);
      analytics.logEvent('host_event_created');
      expect(reporter.enabled, isFalse);
      expect(reporter.events, isEmpty);
    },
  );

  test(
    'SDK grant failure reaches its caller and withdrawal still runs',
    () async {
      final reporter = _Reporter();
      final pendingGrant = Completer<void>();
      reporter.pendingGrant = pendingGrant.future;
      final started = Completer<void>();
      reporter.grantStarted = started;
      final gate = HostAnalyticsPermissionGate(
        setCollection: reporter.setCollectionEnabled,
        clearUserId: () => reporter.setUserId(null),
        privacy: reporter,
      );
      final grant = gate.apply(true);
      final failure = expectLater(grant, throwsStateError);
      await started.future;
      pendingGrant.completeError(StateError('Synthetic SDK failure'));
      await failure;
      expect(gate.allowed, isFalse);
      await gate.apply(false);
      expect(reporter.enabled, isFalse);
      expect(reporter.granted, isFalse);
    },
  );

  test('failed choice persistence cannot block a later withdrawal', () async {
    final reporter = _Reporter();
    var writes = 0;
    final analytics = AppAnalytics(
      reporter: reporter,
      shouldCollect: true,
      hostRole: true,
      hostChoiceStore: HostAnalyticsChoiceStore(
        read: () async => null,
        write: (_) async => ++writes > 1,
      ),
    );
    await analytics.initialize();
    await expectLater(
      analytics.setHostAnalyticsPermission(true),
      throwsStateError,
    );
    expect(analytics.hostAnalyticsAllowed, isFalse);
    await analytics.setHostAnalyticsPermission(false);
    expect(writes, 2);
    expect(analytics.hostAnalyticsChoiceGranted, isFalse);
    expect(reporter.enabled, isFalse);
    expect(reporter.granted, isFalse);
  });

  test('operation completion does not replay across consent changes', () async {
    final reporter = _Reporter();
    final analytics = AppAnalytics(
      reporter: reporter,
      shouldCollect: true,
      hostRole: true,
      hostChoiceStore: HostAnalyticsChoiceStore(
        read: () async => null,
        write: (_) async => true,
      ),
    );
    await analytics.initialize();
    final beforeConsent = analytics.hostEventCompletion('host_event_created');
    await analytics.setHostAnalyticsPermission(true);
    beforeConsent();
    expect(reporter.events, isEmpty);
    final beforeWithdrawal = analytics.hostEventCompletion(
      'host_event_published',
    );
    await analytics.setHostAnalyticsPermission(false);
    await analytics.setHostAnalyticsPermission(true);
    beforeWithdrawal();
    expect(reporter.events, isEmpty);
    analytics.hostEventCompletion('host_event_created')();
    expect(reporter.events.single['name'], 'host_event_created');
    await analytics.setHostAnalyticsPermission(false);
  });

  test('unknown auth methods and client activation claims are excluded', () {
    expect(
      hostAnalyticsParameters('auth_completed', {
        'auth_method': 'google',
        'uid': 'private',
      }),
      {'app_role': 'host', 'measurement_version': 1, 'auth_method': 'google'},
    );
    expect(
      hostAnalyticsParameters('auth_completed', {
        'auth_method': 'private@example.test',
      }),
      {'app_role': 'host', 'measurement_version': 1},
    );
    expect(hostAnalyticsParameters('organizer_activated', {}), isNull);
  });
}

final class _Reporter
    implements AnalyticsReporter, HostAnalyticsPrivacyReporter {
  bool enabled = true;
  bool granted = true;
  int resets = 0;
  Future<void>? pendingGrant;
  Completer<void>? grantStarted;
  final events = <Map<String, Object>>[];
  final screens = <String>[];
  final userIds = <String?>[];

  @override
  Future<void> setCollectionEnabled(bool value) async => enabled = value;
  @override
  Future<void> setHostAnalyticsConsent(bool value) async {
    if (value) {
      grantStarted?.complete();
      grantStarted = null;
      await pendingGrant;
    }
    granted = value;
  }

  @override
  Future<void> resetHostAnalyticsData() async => resets++;
  @override
  Future<void> setUserId(String? id) async => userIds.add(id);
  @override
  Future<void> logEvent(String name, {Map<String, Object>? parameters}) async {
    events.add({'name': name, ...?parameters});
  }

  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async => screens.add(screenName);
}
