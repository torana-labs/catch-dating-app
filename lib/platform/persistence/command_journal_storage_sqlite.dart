import 'dart:convert';

import 'package:catch_dating_app/platform/persistence/command_journal_storage.dart';
import 'package:sqlite3/sqlite3.dart';

/// A bounded journal needs only a key and a JSON value, not an application ORM.
/// SQLite owns locking, rollback and crash recovery. FULL synchronous commits
/// complete before callers may describe a command as saved on this device.
class SqliteCommandJournalStorage implements CommandJournalStorage {
  SqliteCommandJournalStorage(this._database) {
    _database.execute('PRAGMA synchronous = FULL');
    _database.execute('PRAGMA fullfsync = ON');
    _database.execute('PRAGMA busy_timeout = 5000');
    _database.execute(
      'CREATE TABLE IF NOT EXISTS command_journals '
      '(account_key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    );
  }

  final Database _database;

  @override
  Future<String?> readRaw(String key) async {
    final rows = _database.select(
      'SELECT value FROM command_journals WHERE account_key = ?',
      [key],
    );
    return rows.isEmpty ? null : rows.single['value'] as String;
  }

  @override
  Future<T> transact<T>(
    String key,
    T Function(Map<String, Object?> state) change,
  ) async {
    _database.execute('BEGIN IMMEDIATE');
    try {
      final rows = _database.select(
        'SELECT value FROM command_journals WHERE account_key = ?',
        [key],
      );
      final raw = rows.isEmpty ? null : rows.single['value'] as String;
      final state = raw == null
          ? <String, Object?>{}
          : jsonDecode(raw) as Map<String, Object?>;
      final result = change(state);
      final encoded = jsonEncode(state);
      if (encoded != raw) {
        _database.execute(
          'INSERT INTO command_journals(account_key, value) VALUES (?, ?) '
          'ON CONFLICT(account_key) DO UPDATE SET value = excluded.value',
          [key, encoded],
        );
      }
      _database.execute('COMMIT');
      return result;
    } on Object {
      _database.execute('ROLLBACK');
      rethrow;
    }
  }

  @override
  Future<void> close() async => _database.close();
}
