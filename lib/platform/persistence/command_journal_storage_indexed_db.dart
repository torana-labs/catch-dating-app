import 'dart:convert';

import 'package:catch_dating_app/platform/persistence/command_journal_storage.dart';
import 'package:idb_shim/idb.dart';

/// Uses one IndexedDB read/write transaction across the read and replacement.
/// Concurrent browser tabs therefore cannot overwrite each other's journal.
class IndexedDbCommandJournalStorage implements CommandJournalStorage {
  IndexedDbCommandJournalStorage(this._database);

  static const storeName = 'command_journals';
  final Database _database;

  static Future<IndexedDbCommandJournalStorage> open(
    IdbFactory factory, {
    // copy:allow-inline(Stable IndexedDB database identifier, not visible copy)
    String name = 'catch_commands_v1',
  }) async => IndexedDbCommandJournalStorage(
    await factory.open(
      name,
      version: 1,
      onUpgradeNeeded: (event) {
        event.database.createObjectStore(storeName);
      },
    ),
  );

  @override
  Future<String?> readRaw(String key) async {
    final transaction = _database.transaction(storeName, idbModeReadOnly);
    final done = transaction.completed.then<Object?>(
      (_) => null,
      onError: (Object error) => error,
    );
    try {
      final raw = await transaction.objectStore(storeName).getObject(key);
      final failure = await done;
      if (failure != null) throw failure;
      return raw as String?;
    } on Object {
      await done;
      rethrow;
    }
  }

  @override
  Future<T> transact<T>(
    String key,
    T Function(Map<String, Object?> state) change,
  ) async {
    final transaction = _database.transaction(storeName, idbModeReadWrite);
    // Observe completion immediately, including failures before the last put.
    final done = transaction.completed.then<Object?>(
      (_) => null,
      onError: (Object error) => error,
    );
    try {
      final store = transaction.objectStore(storeName);
      final raw = await store.getObject(key);
      final state = raw == null
          ? <String, Object?>{}
          : jsonDecode(raw as String) as Map<String, Object?>;
      final result = change(state);
      final encoded = jsonEncode(state);
      if (encoded != raw) await store.put(encoded, key);
      final failure = await done;
      if (failure != null) throw failure;
      return result;
    } on Object {
      try {
        transaction.abort();
      } on Object {
        // A failed request may have already aborted the transaction.
      }
      await done;
      rethrow;
    }
  }

  @override
  Future<void> close() async => _database.close();
}
