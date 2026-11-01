import 'package:catch_dating_app/contexts/programmes/data/phone_import_adapter.dart';
import 'package:catch_dating_app/contexts/programmes/data/phone_import_retry_store.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_batch.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_draft.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_controller.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:flutter/foundation.dart';

enum PhoneImportSubmissionPhase {
  loading,
  review,
  previewing,
  ready,
  sharing,
  retry,
  completed,
  recovery,
}

// provider-graph: ownership-listenable:PhoneImportSubmissionController:reactive-state planned CAT156 -- PhoneImportSubmissionController is a verified existing business-state Listenable owner (the EventPreferencesEditorController entry is the shared abstract base). Migrate its manual loaded/operation/error publication to an immutable generated owner in the bounded CAT156 slice, preserving identity, cancellation, in-flight deduplication and any journal/idempotency guarantees.
/// Explicit preview/commit over the canonical gateway. A confirmed command is
/// persisted before any commit, and restored commands never replay themselves.
class PhoneImportSubmissionController extends ChangeNotifier {
  PhoneImportSubmissionController({
    required this.review,
    required this.adapter,
    required this.retryStore,
    required this.accountId,
    required this.programId,
    required this.organizerId,
    required Map<PhoneImportFamilySide, String> familySideLabels,
  }) : familySideLabels = Map.unmodifiable(familySideLabels) {
    review.addListener(_reviewChanged);
    review.setSubmissionLocked(true);
  }

  final PhoneImportController review;
  final PhoneImportAdapter adapter;
  final PhoneImportRetryStore retryStore;
  final String accountId;
  final String programId;
  final String organizerId;
  final Map<PhoneImportFamilySide, String> familySideLabels;
  PhoneImportSubmissionPhase _phase = PhoneImportSubmissionPhase.loading;
  PhoneImportBatch? _batch;
  ProgramManifestImportResult? _result;
  AppException? _error;
  bool _disposed = false;
  bool _initialized = false;
  bool _settingPhase = false;

  PhoneImportSubmissionPhase get phase => _phase;
  PhoneImportBatch? get batch => _batch;
  ProgramManifestImportResult? get result => _result;
  AppException? get error => _error;
  bool get busy => switch (_phase) {
    PhoneImportSubmissionPhase.loading ||
    PhoneImportSubmissionPhase.previewing ||
    PhoneImportSubmissionPhase.sharing => true,
    _ => false,
  };
  bool get canPreview =>
      _initialized &&
      _phase == PhoneImportSubmissionPhase.review &&
      review.canReview;
  bool get canShare =>
      _phase == PhoneImportSubmissionPhase.ready && review.canReview;
  bool get canRetry => _phase == PhoneImportSubmissionPhase.retry;

  Future<void> initialize() async {
    if (_initialized || _disposed) return;
    _initialized = true;
    try {
      final saved = await retryStore.load(accountId, programId);
      if (_disposed) return;
      if (saved != null && saved.organizerId != organizerId) {
        throw const PermissionException(
          'The saved review belongs to a different planner.',
        );
      }
      _batch = saved;
      _setPhase(
        saved == null
            ? PhoneImportSubmissionPhase.review
            : PhoneImportSubmissionPhase.retry,
      );
    } catch (error) {
      if (_disposed) return;
      _error = normalizeBackendError(
        error,
        context: const BackendErrorContext(
          service: BackendService.unknown,
          action: 'review or share wedding guests',
          resource: 'phone-import',
        ),
      );
      _setPhase(PhoneImportSubmissionPhase.recovery);
    }
  }

  Future<void> preview() async {
    if (!canPreview || _disposed) return;
    final snapshot = review.prepareReview();
    if (snapshot == null) return;
    _error = null;
    _result = null;
    try {
      final batch = PhoneImportBatch.fromReview(
        review: snapshot,
        accountId: accountId,
        programId: programId,
        organizerId: organizerId,
        familySideLabels: familySideLabels,
      );
      _setPhase(PhoneImportSubmissionPhase.previewing);
      final result = await adapter.preview(batch);
      if (_disposed) return;
      _result = result;
      _batch = result.rowErrors.isEmpty ? batch : null;
      _setPhase(
        result.rowErrors.isEmpty
            ? PhoneImportSubmissionPhase.ready
            : PhoneImportSubmissionPhase.review,
      );
    } catch (error) {
      if (_disposed) return;
      _error = normalizeBackendError(
        error,
        context: const BackendErrorContext(
          service: BackendService.unknown,
          action: 'review or share wedding guests',
          resource: 'phone-import',
        ),
      );
      _batch = null;
      _setPhase(PhoneImportSubmissionPhase.review);
    }
  }

  Future<void> share() async {
    if (!canShare || _disposed) return;
    final batch = _batch;
    if (batch == null) return;
    await _send(batch, previewAgain: false);
  }

  Future<void> retry() async {
    if (!canRetry || _disposed) return;
    final batch = _batch;
    if (batch == null) return;
    await _send(batch, previewAgain: true);
  }

  Future<void> _send(
    PhoneImportBatch batch, {
    required bool previewAgain,
  }) async {
    _error = null;
    _result = null;
    _setPhase(PhoneImportSubmissionPhase.sharing);
    try {
      // The same transactional save is required on retry, including when the
      // original local write outcome was uncertain. No writer runs on failure.
      await retryStore.save(batch);
      if (_disposed) return;
      if (previewAgain) {
        final preview = await adapter.preview(batch);
        if (_disposed) return;
        if (preview.rowErrors.isNotEmpty) {
          _result = preview;
          _setPhase(PhoneImportSubmissionPhase.retry);
          return;
        }
      }
      final result = await adapter.commit(batch);
      if (_disposed) return;
      _result = result;
      if (result.rowErrors.isNotEmpty) {
        _setPhase(PhoneImportSubmissionPhase.retry);
        return;
      }
      // A matching receipt is necessary before deleting the retained command.
      // If local cleanup fails, the successful receipt remains visible and a
      // later explicit retry resolves the same server operation idempotently.
      await retryStore.clear(batch);
      if (_disposed) return;
      _setPhase(PhoneImportSubmissionPhase.completed);
    } catch (error) {
      if (_disposed) return;
      _error = normalizeBackendError(
        error,
        context: const BackendErrorContext(
          service: BackendService.unknown,
          action: 'review or share wedding guests',
          resource: 'phone-import',
        ),
      );
      _setPhase(PhoneImportSubmissionPhase.retry);
    }
  }

  /// The UI must first explain that an issued request may already have applied
  /// and obtain an explicit dismissal. This never deletes workspace guests.
  Future<void> dismissPending() async {
    if (!canRetry || _disposed || _batch == null) return;
    final batch = _batch!;
    _setPhase(PhoneImportSubmissionPhase.sharing);
    try {
      await retryStore.clear(batch);
      if (_disposed) return;
      _batch = null;
      _result = null;
      _error = null;
      _setPhase(PhoneImportSubmissionPhase.review);
      review.discard();
    } catch (error) {
      if (_disposed) return;
      _error = normalizeBackendError(
        error,
        context: const BackendErrorContext(
          service: BackendService.unknown,
          action: 'review or share wedding guests',
          resource: 'phone-import',
        ),
      );
      _setPhase(PhoneImportSubmissionPhase.retry);
    }
  }

  void _reviewChanged() {
    if (_disposed ||
        _settingPhase ||
        busy ||
        _phase == PhoneImportSubmissionPhase.retry ||
        _phase == PhoneImportSubmissionPhase.completed ||
        _phase == PhoneImportSubmissionPhase.recovery) {
      return;
    }
    _batch = null;
    _result = null;
    _error = null;
    _phase = PhoneImportSubmissionPhase.review;
    notifyListeners();
  }

  void _setPhase(PhoneImportSubmissionPhase value) {
    _phase = value;
    _settingPhase = true;
    review.setSubmissionLocked(
      value != PhoneImportSubmissionPhase.review &&
          value != PhoneImportSubmissionPhase.ready,
    );
    _settingPhase = false;
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    adapter.dispose();
    review.removeListener(_reviewChanged);
    // The route owns and disposes the review after this controller. Retained
    // commands remain private to their original account/wedding until resolved.
    super.dispose();
  }
}
