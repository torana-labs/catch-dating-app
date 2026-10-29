import 'package:catch_dating_app/contexts/bookings/data/health_activity_client.dart';
import 'package:catch_dating_app/contexts/bookings/data/health_activity_client_provider.dart';
import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/platform/errors/app_error_context.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'health_activity_repository.g.dart';

class HealthActivityRepository {
  HealthActivityRepository(this._client, {ErrorLogger? errorLogger})
    : _errorLogger = errorLogger ?? ErrorLogger();

  static const _activityPermissionRequestedKey =
      'health_activity.activity_permission_requested';

  final HealthActivityClient _client;
  final ErrorLogger _errorLogger;
  SharedPreferences? _prefsInstance;

  Future<WeeklyActivitySnapshot> fetchWeeklyActivity({
    DateTime? referenceDate,
  }) async {
    final now = referenceDate ?? DateTime.now();
    final refreshedAt = DateTime.now();
    final capabilities = await _client.capabilities();

    if (!capabilities.isSupported) {
      return WeeklyActivitySnapshot.unsupported(
        referenceDate: now,
        refreshedAt: refreshedAt,
      );
    }

    if (capabilities.healthConnectAvailability !=
        HealthConnectAvailability.notApplicable) {
      if (capabilities.healthConnectAvailability !=
          HealthConnectAvailability.available) {
        return WeeklyActivitySnapshot.needsHealthConnect(
          referenceDate: now,
          refreshedAt: refreshedAt,
        );
      }
    }

    final permission = await _client.hasActivityReadPermission();
    final requestedBefore = await _hasRequestedActivityPermission();
    // HealthKit reports the auth dialog *closing* as success even when the user
    // denied READ access, so on Apple Health we can only infer permission from
    // "requested before" — never trust it as a confirmed connection.
    final hasInferredApplePermission =
        permission != true &&
        capabilities.platform == HealthActivityPlatform.appleHealth &&
        requestedBefore;
    final shouldFetch = permission == true || hasInferredApplePermission;
    if (!shouldFetch) {
      return WeeklyActivitySnapshot.permissionRequired(
        referenceDate: now,
        platformLabel: capabilities.platformLabel,
        refreshedAt: refreshedAt,
      );
    }

    final weekStart = WeeklyActivitySummary.weekStartFor(now);
    final weekEnd = weekStart.add(const Duration(days: 7));
    try {
      final activities = await _client.fetchPhysicalActivities(
        startTime: weekStart,
        endTime: weekEnd,
      );
      if (activities.isEmpty && hasInferredApplePermission) {
        // An empty result under inferred (unconfirmed) Apple permission most
        // likely means the user never actually granted READ access, not that
        // they had no activity. Re-surface the connect CTA so they aren't
        // stranded on a permanently-empty "connected" card.
        return WeeklyActivitySnapshot.permissionRequired(
          referenceDate: now,
          platformLabel: capabilities.platformLabel,
          refreshedAt: refreshedAt,
        );
      }
      return WeeklyActivitySnapshot.connected(
        referenceDate: now,
        platformLabel: capabilities.platformLabel,
        activities: activities,
        refreshedAt: refreshedAt,
      );
    } catch (error, stackTrace) {
      // A fetch failure most often means the user has not actually granted
      // READ access, so we fall back to the connect CTA. Normalize and log the
      // error first so a genuine plugin/platform failure stays observable
      // instead of being silently swallowed.
      logAppError(
        error,
        stackTrace: stackTrace,
        context: const AppErrorContext(
          operation: AppOperation.plugin,
          action: 'read weekly activity',
          resource: 'health_activity',
        ),
        logError: _errorLogger,
      );
      return WeeklyActivitySnapshot.permissionRequired(
        referenceDate: now,
        platformLabel: capabilities.platformLabel,
        refreshedAt: refreshedAt,
      );
    }
  }

  Future<bool> requestActivityReadPermission() async {
    final granted = await _client.requestActivityReadPermission();
    if (granted) {
      final prefs = await _prefs;
      await prefs.setBool(_activityPermissionRequestedKey, true);
    }
    return granted;
  }

  @Deprecated('Use fetchWeeklyActivity.')
  Future<WeeklyActivitySnapshot> fetchWeeklyRunningActivity({
    DateTime? referenceDate,
  }) => fetchWeeklyActivity(referenceDate: referenceDate);

  @Deprecated('Use requestActivityReadPermission.')
  Future<bool> requestRunningReadPermission() =>
      requestActivityReadPermission();

  Future<void> installHealthConnect() => _client.installHealthConnect();

  Future<bool> _hasRequestedActivityPermission() async {
    final prefs = await _prefs;
    return prefs.getBool(_activityPermissionRequestedKey) ??
        prefs.getBool('health_activity.running_permission_requested') ??
        false;
  }

  Future<SharedPreferences> get _prefs async {
    _prefsInstance ??= await SharedPreferences.getInstance();
    return _prefsInstance!;
  }
}

@riverpod
HealthActivityRepository healthActivityRepository(Ref ref) {
  return HealthActivityRepository(
    ref.watch(healthActivityClientProvider),
    errorLogger: ref.watch(errorLoggerProvider),
  );
}

@Deprecated(
  'Home no longer renders weekly activity; retained for insights/compatibility.',
)
@riverpod
Future<WeeklyActivitySnapshot> weeklyActivity(Ref ref) {
  return ref.watch(healthActivityRepositoryProvider).fetchWeeklyActivity();
}
