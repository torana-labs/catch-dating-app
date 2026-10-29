import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_access.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_batch.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';

/// Canonical gateway adapter for the source-bound manifest authority. The route
/// and every preview/commit use current canonical wedding-wide guest access.
/// No offline import, direct Firestore write, synthetic grant or contact store.
class PhoneImportAdapter {
  PhoneImportAdapter({
    required this.workRepository,
    required this.setupRepository,
    required this.currentAccountId,
    required this.currentProgramId,
    DateTime Function()? now,
  }) : _now = now ?? DateTime.now;

  final ProgramWorkRepository workRepository;
  final ProgramSetupRepository setupRepository;
  final String? Function() currentAccountId;
  final String? Function() currentProgramId;
  final DateTime Function() _now;
  bool _disposed = false;
  final Map<String, String> _boundContent = {};
  final Set<String> _previewed = {};
  final Map<String, Future<ProgramManifestImportResult>> _inFlight = {};

  Future<ProgramManifestImportResult> preview(PhoneImportBatch batch) =>
      _run(batch, 'preview');

  Future<ProgramManifestImportResult> commit(PhoneImportBatch batch) =>
      _run(batch, 'commit');

  Future<ProgramManifestImportResult> _run(
    PhoneImportBatch batch,
    String mode,
  ) {
    try {
      _assertScope(batch);
      final previous = _boundContent[batch.operationId];
      if (previous != null && previous != batch.contentKey) {
        throw const ValidationException(
          'This import changed. Review it again with a new operation.',
          code: 'phone-import-content-changed',
        );
      }
      _boundContent[batch.operationId] = batch.contentKey;
      if (mode == 'commit' && !_previewed.contains(batch.contentKey)) {
        throw const ValidationException(
          'Preview this exact review before sharing it.',
          code: 'phone-import-preview-required',
        );
      }
      final key = '${batch.operationId}:$mode';
      final pending = _inFlight[key];
      if (pending != null) return pending;
      final future = _perform(batch, mode).whenComplete(() {
        _inFlight.remove(key);
      });
      _inFlight[key] = future;
      // Keep the cleanup on the returned future so failures are observed by
      // the caller, with no detached future or automatic retry.
      return future;
    } catch (error, stack) {
      return Future.error(error, stack);
    }
  }

  Future<ProgramManifestImportResult> _perform(
    PhoneImportBatch batch,
    String mode,
  ) async {
    // Direct live call: the snapshot reader's offline fallback cannot grant
    // authority. Captured account also fences the repository's private cache.
    final access = await workRepository.getWorkAccess(
      batch.programId,
      snapshotAccountId: batch.accountId,
    );
    _assertScope(batch);
    if (access.programId != batch.programId ||
        access.organizerId != batch.organizerId ||
        !canImportWeddingPhoneContacts(access, _now())) {
      throw const PermissionException(
        'A current wedding-wide guest grant is required to share this review.',
      );
    }
    final result = await setupRepository.importWeddingPhoneContacts(
      programId: batch.programId,
      mode: mode,
      clientOperationId: batch.operationId,
      rows: batch.rows,
    );
    _assertScope(batch);
    if (result.mode != mode ||
        result.totalRows != batch.rows.length ||
        result.rowErrors.any(
          (row) => row.index < 0 || row.index >= batch.rows.length,
        )) {
      throw const ValidationException(
        'The import response could not be matched to this review.',
        code: 'phone-import-response-mismatch',
      );
    }
    if (mode == 'preview') {
      if (result.rowErrors.isEmpty) {
        _previewed.add(batch.contentKey);
      } else {
        _previewed.remove(batch.contentKey);
      }
    }
    // Row errors and alreadyApplied are retained verbatim; callers cannot
    // turn a partial import into a blanket "all guests saved" message.
    return result;
  }

  /// The route owner must dispose on account/workspace changes, including a
  /// switch away and back before an in-flight call finishes.
  void dispose() {
    _disposed = true;
    _boundContent.clear();
    _previewed.clear();
    _inFlight.clear();
  }

  void _assertScope(PhoneImportBatch batch) {
    if (_disposed ||
        currentAccountId() != batch.accountId ||
        currentProgramId() != batch.programId) {
      throw const PermissionException(
        'The account or wedding changed. Return to the original review.',
      );
    }
  }
}
