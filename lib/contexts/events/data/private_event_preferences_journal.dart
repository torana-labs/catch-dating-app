import 'dart:convert';

import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/core/app_error_context.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Keeps one exact unresolved event-preferences command per manager and event.
/// A failed retry cannot prove a previous send did not commit.
class PrivateEventPreferencesJournal {
  const PrivateEventPreferencesJournal();

  String _key(String userId, String organizerId, String eventId) =>
      'private_event_preferences_${Uri.encodeComponent(userId)}_'
      '${Uri.encodeComponent(organizerId)}_${Uri.encodeComponent(eventId)}';

  Future<PrivateEventPreferencesUpdateRequest?> load({
    required String userId,
    required String organizerId,
    required String eventId,
  }) => withAppErrorContext<PrivateEventPreferencesUpdateRequest?>(
    () async {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key(userId, organizerId, eventId));
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is! Map) throw const FormatException('Invalid pending event preferences');
      final request = PrivateEventPreferencesUpdateRequest.fromJson(
        Map<String, dynamic>.from(decoded),
      );
      if (request.organizerId != organizerId || request.eventId != eventId) {
        throw const FormatException('Pending event preferences identity changed');
      }
      return request;
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'load pending private event preferences',
      resource: 'shared_preferences',
    ),
  );

  Future<void> save({
    required String userId,
    required PrivateEventPreferencesUpdateRequest request,
  }) => withAppErrorContext<void>(
    () async {
      if (!request.isValid) throw ArgumentError.value(request, 'request');
      final prefs = await SharedPreferences.getInstance();
      final key = _key(userId, request.organizerId, request.eventId);
      final body = jsonEncode(request.toJson());
      final existing = prefs.getString(key);
      if (existing != null && existing != body) {
        throw StateError('Resolve the pending event preferences update first');
      }
      await prefs.setString(key, body);
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'save pending private event preferences',
      resource: 'shared_preferences',
    ),
  );

  Future<void> clear({
    required String userId,
    required PrivateEventPreferencesUpdateRequest request,
  }) => withAppErrorContext<void>(
    () async {
      final prefs = await SharedPreferences.getInstance();
      final key = _key(userId, request.organizerId, request.eventId);
      if (prefs.getString(key) == jsonEncode(request.toJson())) {
        await prefs.remove(key);
      }
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'clear completed private event preferences',
      resource: 'shared_preferences',
    ),
  );
}
