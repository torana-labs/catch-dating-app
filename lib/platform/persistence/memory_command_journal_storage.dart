import 'dart:convert';

import 'package:catch_dating_app/platform/persistence/async_keyed_lock.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage.dart';

/// Explicit test/Widgetbook dependency. Production never falls back to this
/// store when a durable database is unavailable.
class MemoryCommandJournalStorage implements CommandJournalStorage {
  final _values = <String, String>{};
  final _lock = AsyncKeyedLock();

  @override
  Future<String?> readRaw(String key) =>
      _lock.run(key, () async => _values[key]);

  @override
  Future<T> transact<T>(
    String key,
    T Function(Map<String, Object?> state) change,
  ) => _lock.run(key, () async {
    final raw = _values[key];
    final state = raw == null
        ? <String, Object?>{}
        : jsonDecode(raw) as Map<String, Object?>;
    final result = change(state);
    _values[key] = jsonEncode(state);
    return result;
  });

  @override
  Future<void> close() async {}
}
