import 'package:catch_dating_app/platform/persistence/command_journal_storage.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage_indexed_db.dart';
import 'package:idb_shim/idb_browser.dart';

Future<CommandJournalStorage> openCommandJournalStorage() =>
    IndexedDbCommandJournalStorage.open(idbFactoryNative);
