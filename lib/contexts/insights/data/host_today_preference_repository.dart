import 'dart:convert';

import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/core/app_error_context.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'host_today_preference_repository.g.dart';

abstract interface class HostTodayPreferenceRepository {
  Future<HostTodayPreference> load(HostTodayPreferenceScope scope);

  Future<void> save(
    HostTodayPreferenceScope scope,
    HostTodayPreference preference,
  );
}

/// Stores only the focus/skip decision, not customer data or roadmap completion.
/// This first implementation is device-local, not a cross-device profile field.
class LocalHostTodayPreferenceRepository
    implements HostTodayPreferenceRepository {
  LocalHostTodayPreferenceRepository({
    SharedPreferencesAsync Function()? preferences,
  }) : _preferences = preferences ?? SharedPreferencesAsync.new;

  // Uncached reads avoid treating a failed legacy cache write as a persisted
  // choice when the organizer returns to Today.
  final SharedPreferencesAsync Function() _preferences;

  String _key(HostTodayPreferenceScope scope) =>
      'host_today_preference_v1_${base64Url.encode(utf8.encode(jsonEncode([scope.accountId, scope.organizerId])))}';

  @override
  Future<HostTodayPreference> load(HostTodayPreferenceScope scope) =>
      withAppErrorContext(
        () async {
          final raw = await _preferences().getString(_key(scope));
          if (raw == null) return const HostTodayPreference.unanswered();
          // An unrecognized value is an observable read failure. Do not erase
          // future-version or corrupt data, or silently restart orientation.
          return switch (raw) {
            'unanswered' => const HostTodayPreference.unanswered(),
            'skipped' => const HostTodayPreference.skipped(),
            'audience' => const HostTodayPreference.selected(
              HostTodayFocus.audience,
            ),
            'rehearsal' => const HostTodayPreference.selected(
              HostTodayFocus.rehearsal,
            ),
            'organizer_presence' => const HostTodayPreference.selected(
              HostTodayFocus.organizerPresence,
            ),
            _ => throw const FormatException('Invalid Today preference.'),
          };
        },
        context: const AppErrorContext(
          operation: AppOperation.localPersistence,
          action: 'load today preference',
          resource: 'host_today_preference',
        ),
      );

  @override
  Future<void> save(
    HostTodayPreferenceScope scope,
    HostTodayPreference preference,
  ) => withAppErrorContext(
    () async {
      final raw = switch (preference.focus) {
        HostTodayFocus.audience => 'audience',
        HostTodayFocus.rehearsal => 'rehearsal',
        HostTodayFocus.organizerPresence => 'organizer_presence',
        null => preference.answered ? 'skipped' : 'unanswered',
      };
      await _preferences().setString(_key(scope), raw);
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'save today preference',
      resource: 'host_today_preference',
    ),
  );
}

@riverpod
HostTodayPreferenceRepository hostTodayPreferenceRepository(Ref ref) =>
    LocalHostTodayPreferenceRepository();
