import 'dart:convert';

import 'package:catch_dating_app/contexts/programmes/domain/phone_import_batch.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/persistence/command_journal_storage.dart';
import 'package:crypto/crypto.dart';

/// One confirmed command per account/wedding, on the existing transactional
/// command database. No draft, native ids, unused numbers or automatic replay.
class PhoneImportRetryStore {
  const PhoneImportRetryStore({
    required this.storage,
    required this.currentAccountId,
  });
  final Future<CommandJournalStorage> Function() storage;
  final String? Function() currentAccountId;

  String _key(String account, String program) => sha256
      .convert(
        utf8.encode(jsonEncode(['phone_import_retry_v1', account, program])),
      )
      .toString();
  void _check(String account) {
    if (account.isEmpty || currentAccountId() != account) {
      throw const SignInRequiredException('read this saved wedding import');
    }
  }

  Future<T> _transaction<T>(
    String account,
    String program,
    T Function(Map<String, Object?>) change,
  ) async {
    _check(account);
    try {
      final db = await storage();
      _check(account);
      final result = await db.transact(_key(account, program), (state) {
        _check(account);
        return change(state);
      });
      _check(account);
      return result;
    } on AppException {
      rethrow;
    } on Object {
      throw const BackendOperationException(
        code: 'phone-import-storage-unavailable',
        message:
            'The saved review could not be read or written. It has been preserved.',
        context: BackendErrorContext(
          service: BackendService.local,
          action: 'persist phone import retry',
        ),
      );
    }
  }

  PhoneImportBatch? _decode(Map<String, Object?> state) {
    if (state.isEmpty) return null;
    final raw = state['batch'];
    if (state['version'] != 1 ||
        raw is! Map ||
        state['createdAtMillis'] is! int) {
      throw const ValidationException('The saved review needs recovery.');
    }
    final batch = PhoneImportBatch.fromJson(Map<String, Object?>.from(raw));
    if (state['hash'] !=
        sha256.convert(utf8.encode(batch.contentKey)).toString()) {
      throw const ValidationException(
        'The saved review changed and needs recovery.',
      );
    }
    return batch;
  }

  Future<PhoneImportBatch?> load(String account, String program) =>
      _transaction(account, program, (state) {
        final batch = _decode(state);
        if (batch != null &&
            (batch.accountId != account || batch.programId != program)) {
          throw const PermissionException(
            'The saved review belongs to another wedding or account.',
          );
        }
        return batch;
      });

  /// Persist before the first commit call. A different pending command cannot
  /// overwrite a potentially applied import, including from another app tab.
  Future<void> save(PhoneImportBatch batch) =>
      _transaction(batch.accountId, batch.programId, (state) {
        final previous = _decode(state);
        if (previous != null && previous.contentKey != batch.contentKey) {
          throw const ValidationException(
            'Resolve the saved import before starting another one.',
            code: 'phone-import-pending',
          );
        }
        if (previous == null) {
          state.addAll({
            'version': 1,
            'createdAtMillis': DateTime.now().millisecondsSinceEpoch,
            'batch': batch.toJson(),
            'hash': sha256.convert(utf8.encode(batch.contentKey)).toString(),
          });
        }
      });

  /// Call only after a matching successful receipt, or explicit user dismissal
  /// explaining that an already-issued server request may have applied.
  Future<void> clear(PhoneImportBatch batch) =>
      _transaction(batch.accountId, batch.programId, (state) {
        final saved = _decode(state);
        if (saved != null && saved.contentKey != batch.contentKey) {
          throw const ValidationException('A different import is saved.');
        }
        state.clear();
      });
}
