import 'dart:convert';

import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/platform/errors/app_error_context.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// One unresolved exact details command per signed-in manager and event.
class PrivateEventDetailsJournal {
  const PrivateEventDetailsJournal();

  String _key(String userId, String organizerId, String eventId) =>
      'private_event_details_${Uri.encodeComponent(userId)}_'
      '${Uri.encodeComponent(organizerId)}_${Uri.encodeComponent(eventId)}';

  Future<PrivateEventDetailsUpdateRequest?> load({
    required String userId,
    required String organizerId,
    required String eventId,
  }) => withAppErrorContext<PrivateEventDetailsUpdateRequest?>(
    () async {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key(userId, organizerId, eventId));
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is! Map) {
        throw const FormatException('Invalid pending details');
      }
      final request = PrivateEventDetailsUpdateRequest.fromJson(
        Map<String, dynamic>.from(decoded),
      );
      if (request.organizerId != organizerId || request.eventId != eventId) {
        throw const FormatException('Pending details identity changed');
      }
      return request;
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'load pending private event details',
      resource: 'shared_preferences',
    ),
  );

  Future<void> save({
    required String userId,
    required PrivateEventDetailsUpdateRequest request,
  }) => withAppErrorContext<void>(
    () async {
      if (!request.isValid) throw ArgumentError.value(request, 'request');
      final prefs = await SharedPreferences.getInstance();
      final key = _key(userId, request.organizerId, request.eventId);
      final body = jsonEncode(request.toJson());
      final existing = prefs.getString(key);
      if (existing != null && existing != body) {
        throw StateError('Resolve the pending event details update first');
      }
      await prefs.setString(key, body);
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'save pending private event details',
      resource: 'shared_preferences',
    ),
  );

  /// Preserve the exact settings body; only the explicit discard intent changes.
  Future<void> setDiscardIntent({
    required String userId,
    required PrivateEventDetailsUpdateRequest request,
    required bool discard,
  }) => withAppErrorContext<void>(
    () async {
      final prefs = await SharedPreferences.getInstance();
      final key = _key(userId, request.organizerId, request.eventId);
      if (prefs.getString(key) != jsonEncode(request.toJson())) {
        throw StateError('Pending admission command changed');
      }
      await prefs.setString(
        key,
        jsonEncode(request.withDiscard(discard).toJson()),
      );
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'persist pending admission discard intent',
      resource: 'shared_preferences',
    ),
  );

  Future<void> clear({
    required String userId,
    required PrivateEventDetailsUpdateRequest request,
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
      action: 'clear completed private event details',
      resource: 'shared_preferences',
    ),
  );
}
