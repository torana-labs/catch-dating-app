import 'dart:convert';

import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/platform/errors/app_error_context.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Preserves the exact manager update after a send whose receipt was lost.
/// It is scoped to the signed-in manager and organizer, not a public Club.
class ManagerEventSetupDefaultsJournal {
  const ManagerEventSetupDefaultsJournal();

  String _key(String userId, String organizerId) =>
      'manager_event_setup_defaults_${Uri.encodeComponent(userId)}_'
      '${Uri.encodeComponent(organizerId)}';

  Future<ManagerEventSetupDefaultsUpdateRequest?> load({
    required String userId,
    required String organizerId,
  }) => withAppErrorContext<ManagerEventSetupDefaultsUpdateRequest?>(
    () async {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key(userId, organizerId));
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is! Map) {
        throw const FormatException('Invalid pending defaults update');
      }
      final request = ManagerEventSetupDefaultsUpdateRequest.fromJson(
        Map<String, dynamic>.from(decoded),
      );
      if (request.organizerId != organizerId) {
        throw const FormatException('Pending defaults identity changed');
      }
      return request;
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'load pending organizer event defaults',
      resource: 'shared_preferences',
    ),
  );

  Future<void> save({
    required String userId,
    required ManagerEventSetupDefaultsUpdateRequest request,
  }) => withAppErrorContext<void>(
    () async {
      if (!request.isValid) throw ArgumentError.value(request, 'request');
      final prefs = await SharedPreferences.getInstance();
      final key = _key(userId, request.organizerId);
      final existing = prefs.getString(key);
      final body = jsonEncode(request.toJson());
      if (existing != null && existing != body) {
        throw StateError('Resolve the pending organizer defaults update first');
      }
      await prefs.setString(key, body);
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'save pending organizer event defaults',
      resource: 'shared_preferences',
    ),
  );

  Future<void> clear({
    required String userId,
    required ManagerEventSetupDefaultsUpdateRequest request,
  }) => withAppErrorContext<void>(
    () async {
      final prefs = await SharedPreferences.getInstance();
      final key = _key(userId, request.organizerId);
      if (prefs.getString(key) == jsonEncode(request.toJson())) {
        await prefs.remove(key);
      }
    },
    context: const AppErrorContext(
      operation: AppOperation.localPersistence,
      action: 'clear completed organizer event defaults',
      resource: 'shared_preferences',
    ),
  );
}
