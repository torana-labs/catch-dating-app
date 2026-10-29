import 'dart:io';

import 'package:catch_dating_app/platform/persistence/command_journal_storage_sqlite.dart';
import 'package:sqlite3/sqlite3.dart';

/// Manual crash probe: `dart run <this file> crash <temporary database path>`,
/// then the same command with `verify`. The first process intentionally dies
/// inside an uncommitted transaction, without closing its SQLite connection.
Future<void> main(List<String> args) async {
  final database = sqlite3.open(args[1]);
  final storage = SqliteCommandJournalStorage(database);
  if (args[0] == 'crash') {
    await storage.transact('account', (state) => state['value'] = 'committed');
    await storage.transact('account', (state) {
      state['value'] = 'uncommitted';
      // Exercise SQLite's rollback journal after a real write, not just the
      // adapter's detached map, at the same boundary immediately before COMMIT.
      database.execute(
        'UPDATE command_journals SET value = ? WHERE account_key = ?',
        ['{"value":"uncommitted"}', 'account'],
      );
      Process.killPid(pid, ProcessSignal.sigkill);
      // Ensure the VM cannot proceed to COMMIT before the signal is delivered.
      sleep(const Duration(seconds: 5));
    });
    throw StateError('Crash signal did not stop the writer');
  }
  final value = await storage.transact('account', (state) => state['value']);
  await storage.close();
  if (value != 'committed') throw StateError('Crash recovery lost the commit');
  stdout.writeln(
    'Committed value survived; incomplete transaction rolled back.',
  );
}
