import 'package:catch_dating_app/platform/analytics/app_analytics.dart';

final class AnalyticsEventCall {
  const AnalyticsEventCall(this.name, this.parameters);

  final String name;
  final Map<String, Object>? parameters;

  @override
  bool operator ==(Object other) {
    if (other is! AnalyticsEventCall) return false;
    if (other.name != name) return false;
    final otherParameters = other.parameters;
    final theseParameters = parameters;
    if (identical(otherParameters, theseParameters)) return true;
    if (otherParameters == null || theseParameters == null) return false;
    if (otherParameters.length != theseParameters.length) return false;
    for (final entry in theseParameters.entries) {
      if (otherParameters[entry.key] != entry.value) return false;
    }
    return true;
  }

  @override
  int get hashCode => Object.hash(
    name,
    Object.hashAllUnordered([
      for (final entry
          in parameters?.entries ?? const <MapEntry<String, Object>>[])
        Object.hash(entry.key, entry.value),
    ]),
  );
}

final class RecordingAnalyticsReporter implements AnalyticsReporter {
  final events = <AnalyticsEventCall>[];

  @override
  Future<void> setCollectionEnabled(bool enabled) async {}

  @override
  Future<void> logEvent(String name, {Map<String, Object>? parameters}) async {
    events.add(AnalyticsEventCall(name, parameters));
  }

  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {}

  @override
  Future<void> setUserId(String? userId) async {}
}
