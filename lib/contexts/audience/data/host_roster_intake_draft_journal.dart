import 'package:catch_dating_app/core/app_error_context.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Remembers the server-owned intake draft for one signed-in manager and event.
class HostRosterIntakeDraftJournal {
  const HostRosterIntakeDraftJournal();

  String _key(String userId, String organizerId, String eventId) =>
      'host_roster_intake_${Uri.encodeComponent(userId)}_'
      '${Uri.encodeComponent(organizerId)}_${Uri.encodeComponent(eventId)}';

  Future<String?> load({
    required String userId,
    required String organizerId,
    required String eventId,
  }) => withAppErrorContext<String?>(
    () async {
      final prefs = await SharedPreferences.getInstance();
      final sessionId = prefs.getString(_key(userId, organizerId, eventId));
      if (sessionId == null) return null;
      if (!RegExp(r'^hri_[a-f0-9]{48}$').hasMatch(sessionId)) {
        await prefs.remove(_key(userId, organizerId, eventId));
        return null;
      }
      return sessionId;
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'load saved Host roster intake',
      resource: 'shared_preferences',
    ),
  );

  Future<void> save({
    required String userId,
    required String organizerId,
    required String eventId,
    required String sessionId,
  }) => withAppErrorContext<void>(
    () async {
      if (!RegExp(r'^hri_[a-f0-9]{48}$').hasMatch(sessionId)) {
        throw ArgumentError.value(sessionId, 'sessionId');
      }
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_key(userId, organizerId, eventId), sessionId);
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'save Host roster intake',
      resource: 'shared_preferences',
    ),
  );

  Future<void> clear({
    required String userId,
    required String organizerId,
    required String eventId,
    required String sessionId,
  }) => withAppErrorContext<void>(
    () async {
      final prefs = await SharedPreferences.getInstance();
      final key = _key(userId, organizerId, eventId);
      if (prefs.getString(key) == sessionId) await prefs.remove(key);
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'clear completed Host roster intake',
      resource: 'shared_preferences',
    ),
  );
}
