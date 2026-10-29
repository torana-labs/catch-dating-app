import 'dart:async';

/// Catch Host product diagnostics only. These events are not advertising
/// conversions, and event creation never proves first real event activation.
const _hostEvents = {
  'auth_started',
  'auth_completed',
  'onboarding_started',
  'onboarding_completed',
  'host_club_created',
  'host_event_created',
  'host_event_published',
};

Map<String, Object>? hostAnalyticsParameters(
  String event,
  Map<String, Object?> parameters,
) {
  if (!_hostEvents.contains(event)) return null;
  return {
    'app_role': 'host',
    'measurement_version': 1,
    if ((event == 'auth_started' || event == 'auth_completed') &&
        const {'google', 'apple', 'phone'}.contains(parameters['auth_method']))
      'auth_method': parameters['auth_method']!,
  };
}

abstract interface class HostAnalyticsPrivacyReporter {
  /// Analytics permission only; advertising permission always remains denied.
  Future<void> setHostAnalyticsConsent(bool granted);
  Future<void> resetHostAnalyticsData();
}

/// Serialises SDK state changes while invalidating local permission immediately.
/// A late grant cannot re-enable collection after a newer withdrawal. No event
/// backlog is retained, and no account/organiser identity is sent to the SDK.
final class HostAnalyticsPermissionGate {
  HostAnalyticsPermissionGate({
    required this.setCollection,
    required this.clearUserId,
    required this.privacy,
  });

  final Future<void> Function(bool) setCollection;
  final Future<void> Function() clearUserId;
  final HostAnalyticsPrivacyReporter privacy;
  Future<void> _pending = Future<void>.value();
  int _revision = 0;
  bool _allowed = false;

  bool get allowed => _allowed;

  Future<void> apply(bool granted, {bool resetData = true}) {
    final revision = ++_revision;
    _allowed = false;
    final operation = _pending.then((_) async {
      await setCollection(false);
      await clearUserId();
      await privacy.setHostAnalyticsConsent(false);
      if (!granted && resetData) await privacy.resetHostAnalyticsData();
      if (revision != _revision || !granted) return;
      await privacy.setHostAnalyticsConsent(true);
      if (revision != _revision) return;
      await setCollection(true);
      if (revision == _revision) _allowed = true;
    });
    // Return each failure to its caller while allowing a later withdrawal to
    // run. The sequencing tail itself must not remain failed.
    final completion = Completer<void>();
    _pending = operation.then<void>(completion.complete).catchError((
      Object error,
      StackTrace stack,
    ) {
      completion.completeError(error, stack);
    });
    return completion.future;
  }
}
