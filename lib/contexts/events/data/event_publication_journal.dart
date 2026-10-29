import 'dart:convert';

import 'package:catch_dating_app/contexts/events/data/event_publication_repository.dart';
import 'package:catch_dating_app/platform/errors/app_error_context.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// One unresolved exact publication command per signed-in manager and event.
class EventPublicationJournal {
  const EventPublicationJournal();

  String _key(String userId, String organizerId, String eventId) =>
      'event_publication_${Uri.encodeComponent(userId)}_'
      '${Uri.encodeComponent(organizerId)}_${Uri.encodeComponent(eventId)}';

  Future<EventPublicationRequest?> load({
    required String userId,
    required String organizerId,
    required String eventId,
  }) => withAppErrorContext<EventPublicationRequest?>(
    () async {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key(userId, organizerId, eventId));
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is! Map) {
        throw const FormatException('Invalid pending publication');
      }
      final request = EventPublicationRequest.fromJson(
        Map<String, dynamic>.from(decoded),
      );
      if (request.organizerId != organizerId || request.eventId != eventId) {
        throw const FormatException('Pending publication identity changed');
      }
      return request;
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'load pending event publication',
      resource: 'shared_preferences',
    ),
  );

  Future<void> save({
    required String userId,
    required EventPublicationRequest request,
  }) => withAppErrorContext<void>(
    () async {
      if (!request.isValid) throw ArgumentError.value(request, 'request');
      final prefs = await SharedPreferences.getInstance();
      final key = _key(userId, request.organizerId, request.eventId);
      final body = jsonEncode(request.toJson());
      final existing = prefs.getString(key);
      if (existing != null && existing != body) {
        throw StateError('Resolve the pending event publication change first');
      }
      if (!await prefs.setString(key, body)) {
        throw StateError('Publication command could not be saved');
      }
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'save pending event publication',
      resource: 'shared_preferences',
    ),
  );

  Future<void> clear({
    required String userId,
    required EventPublicationRequest request,
  }) => withAppErrorContext<void>(
    () async {
      final prefs = await SharedPreferences.getInstance();
      final key = _key(userId, request.organizerId, request.eventId);
      if (prefs.getString(key) == jsonEncode(request.toJson())) {
        if (!await prefs.remove(key)) {
          throw StateError('Completed publication could not be cleared');
        }
      }
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'clear completed event publication',
      resource: 'shared_preferences',
    ),
  );
}
