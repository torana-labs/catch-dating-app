import 'dart:async';

import 'package:catch_platform/errors/app_error_context.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/persistence/command_journal_storage.dart';
import 'package:catch_platform/persistence/command_journal_storage_native.dart'
    if (dart.library.js_interop) 'package:catch_platform/persistence/command_journal_storage_web.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'command_journal_provider.g.dart';

/// Opens the command journal database on first use and returns the same
/// connection afterwards.
typedef CommandJournalStorageOpener = Future<CommandJournalStorage> Function();

// keepalive: one database connection per Host app process; domain adapters
// share it and key their entries by account inside.
@Riverpod(keepAlive: true)
CommandJournalStorageOpener commandJournalStorage(Ref ref) {
  Future<CommandJournalStorage>? opening;
  ref.onDispose(() {
    if (opening case final database?) {
      unawaited(database.then((db) => db.close()).onError<Object>((_, _) {}));
    }
  });
  return () =>
      opening ??= openCommandJournalStorage().onError<Object>((error, stack) {
        opening = null;
        Error.throwWithStackTrace(error, stack);
      });
}

Future<String?> loadLegacyCommandJournal(String prefix, String accountId) =>
    withAppErrorContext(
      () async => (await SharedPreferences.getInstance()).getString(
        '$prefix$accountId',
      ),
      context: const AppErrorContext(
        operation: AppOperation.localPersistence,
        action: 'read legacy command journal',
        resource: 'shared_preferences',
      ),
      mapper: _legacyJournalError,
    );

Future<void> clearLegacyCommandJournal(String prefix, String accountId) =>
    withAppErrorContext(
      () async {
        await (await SharedPreferences.getInstance()).remove(
          '$prefix$accountId',
        );
      },
      context: const AppErrorContext(
        operation: AppOperation.localPersistence,
        action: 'clear migrated legacy command journal',
        resource: 'shared_preferences',
      ),
      mapper: _legacyJournalError,
    );

AppException _legacyJournalError(
  Object error,
  StackTrace stackTrace,
  BackendErrorContext context,
) => BackendOperationException(
  code: 'local-journal-unavailable',
  message: 'Saved operations could not be read or written.',
  context: context,
);
