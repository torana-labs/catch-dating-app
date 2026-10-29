import 'dart:convert';

import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/core/app_error_context.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// An event-scoped, user-scoped journal for an update that may have committed.
/// Unlike ordinary local drafts, unresolved operations must not expire or be
/// displaced by the draft picker limit before their idempotent replay resolves.
class PrivateEventUpdateJournal {
  const PrivateEventUpdateJournal();

  String _key({
    required String userId,
    required String organizerId,
    required String eventId,
  }) => 'private_event_basics_update_${Uri.encodeComponent(userId)}_'
      '${Uri.encodeComponent(organizerId)}_${Uri.encodeComponent(eventId)}';

  Future<PrivateEventBasicsUpdateRequest?> load({
    required String userId,
    required String organizerId,
    required String eventId,
  }) => withAppErrorContext<PrivateEventBasicsUpdateRequest?>(
    () async {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key(
        userId: userId,
        organizerId: organizerId,
        eventId: eventId,
      ));
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is! Map) {
        throw const FormatException('Invalid pending basics update');
      }
      final request = PrivateEventBasicsUpdateRequest.fromJson(
        Map<String, dynamic>.from(decoded),
      );
      if (request.organizerId != organizerId || request.eventId != eventId) {
        throw const FormatException('Pending basics update identity changed');
      }
      return request;
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'load pending private event edit',
      resource: 'shared_preferences',
    ),
  );

  Future<void> save({
    required String userId,
    required PrivateEventBasicsUpdateRequest request,
  }) => withAppErrorContext<void>(
    () async {
      if (!request.isValid) {
        throw ArgumentError.value(request, 'request', 'Invalid basics update');
      }
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _key(
          userId: userId,
          organizerId: request.organizerId,
          eventId: request.eventId,
        ),
        jsonEncode(request.toJson()),
      );
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'save pending private event edit',
      resource: 'shared_preferences',
    ),
  );

  Future<void> clear({
    required String userId,
    required PrivateEventBasicsUpdateRequest request,
  }) => withAppErrorContext<void>(
    () async {
      final prefs = await SharedPreferences.getInstance();
      final key = _key(
        userId: userId,
        organizerId: request.organizerId,
        eventId: request.eventId,
      );
      // Never erase a newer in-flight request if a late response arrives.
      if (prefs.getString(key) == jsonEncode(request.toJson())) {
        await prefs.remove(key);
      }
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'clear completed private event edit',
      resource: 'shared_preferences',
    ),
  );
}
