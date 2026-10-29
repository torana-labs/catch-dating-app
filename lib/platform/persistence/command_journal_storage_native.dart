import 'package:catch_dating_app/platform/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage_sqlite.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqlite3/sqlite3.dart';

Future<CommandJournalStorage> openCommandJournalStorage() async {
  final directory = await getApplicationSupportDirectory();
  await directory.create(recursive: true);
  return SqliteCommandJournalStorage(
    sqlite3.open('${directory.path}/catch_commands_v1.sqlite'),
  );
}
