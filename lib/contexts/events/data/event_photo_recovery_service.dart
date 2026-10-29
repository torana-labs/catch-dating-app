import 'package:catch_dating_app/contexts/events/data/event_photo_recovery_journal.dart';
import 'package:catch_dating_app/contexts/events/domain/event_photo_recovery.dart';
import 'package:catch_dating_app/contexts/profiles/profiles.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:image_picker/image_picker.dart';

/// A transport adapter must return the original server receipt on same-request
/// replay, including after newer event edits. A gallery read is not that proof.
class EventPhotoAttachmentReceipt {
  const EventPhotoAttachmentReceipt({
    required this.scope,
    required this.requestId,
    required this.payloadHash,
  });
  final EventPhotoRecoveryScope scope;
  final String requestId;
  final String payloadHash;

  bool matches(EventPhotoRecovery command) =>
      scope == command.scope &&
      requestId == command.requestId &&
      payloadHash == eventPhotoAttachmentHash(command);
}

String eventPhotoAttachmentHash(EventPhotoRecovery command) =>
    eventPhotoRecoveryHash([
      command.scope.accountId,
      command.scope.organizerId,
      command.scope.eventId,
      command.requestId,
      command.expectedMediaHash,
      [
        for (final photo in command.uploads)
          [photo.mediaId, photo.url, photo.storagePath, photo.position],
      ],
    ]);

class EventPhotoRecoveryResult {
  const EventPhotoRecoveryResult({
    required this.receipt,
    this.failure,
    required this.requiresPhotoReselection,
  });
  final EventPhotoRecovery receipt;
  final Object? failure;
  final bool requiresPhotoReselection;
}

/// Shared media recovery for create, departure and reopening. Execution leases
/// and retry policy belong to LocalCommandJournal; server receipts own the
/// attachment outcome. This class never creates or reschedules an event.
class EventPhotoRecoveryService {
  const EventPhotoRecoveryService({
    required this.journal,
    required this.images,
    required this.attach,
    required this.validateAttachment,
  });

  final EventPhotoRecoveryJournal journal;
  final ImageUploadRepository images;
  final Future<EventPhotoAttachmentReceipt> Function(EventPhotoRecovery command)
  attach;
  final void Function(EventPhotoRecovery command) validateAttachment;

  Future<EventPhotoRecoveryResult?> resume(
    EventPhotoRecoveryScope scope, {
    List<XFile>? photos,
    String? selectedRequestId,
  }) async {
    final session = journal.captureSession(scope);
    // Snapshot the selection before waiting; replacing a UI list cannot change
    // this attempt. Bytes are deliberately never placed in the durable journal.
    final selected = photos == null ? null : List<XFile>.unmodifiable(photos);
    final initial = await journal.load(scope);
    journal.requireSession(scope, session);
    if (initial == null) return null;
    if (selected != null && selectedRequestId != initial.requestId) {
      return EventPhotoRecoveryResult(
        receipt: initial,
        failure: const ValidationException(
          'These selected photos belong to an earlier recovery request. '
          'Select photos again for the saved event.',
          code: 'event-photo-selection-changed',
        ),
        requiresPhotoReselection: !initial.isResolved,
      );
    }
    if (!initial.isResolved &&
        selected != null &&
        selected.length != initial.mediaIds.length) {
      throw const ValidationException(
        'Reselect the saved event photos before retrying.',
      );
    }
    Object? failure;
    await journal.replay(scope, (receipt) async {
      journal.requireSession(scope, session);
      if (receipt.requestId != initial.requestId ||
          eventPhotoRecoveryHash(receipt.intentJson) !=
              eventPhotoRecoveryHash(initial.intentJson)) {
        failure = const BackendOperationException(
          code: 'event-photo-progress-changed',
          message: 'Saved photo recovery changed. Reopen it before retrying.',
          context: BackendErrorContext(
            service: BackendService.local,
            action: 'recover event photos',
          ),
          retryable: true,
        );
        throw failure!;
      }
      var current = await _cleanupAbandoned(receipt, session);
      if (current.phase == EventPhotoRecoveryPhase.complete) return;
      if (current.phase == EventPhotoRecoveryPhase.cleanupPending) {
        failure = await _cleanup(current, session);
        return;
      }
      if (current.phase == EventPhotoRecoveryPhase.uploadFailed) {
        if (selected == null) return;
        current = await journal.checkpoint(
          current,
          current.next(
            phase: EventPhotoRecoveryPhase.uploading,
            uploadAttempt: current.uploadAttempt + 1,
          ),
        );
        journal.requireSession(scope, session);
      }
      if (current.phase == EventPhotoRecoveryPhase.uploading) {
        if (current.mediaIds.isEmpty) {
          await journal.checkpoint(
            current,
            current.next(phase: EventPhotoRecoveryPhase.complete),
          );
          return;
        }
        if (current.uploadingMediaId != null ||
            (selected == null &&
                current.uploads.length < current.mediaIds.length)) {
          // No attachment has been submitted. A persisted upload marker may
          // represent an uploaded object whose acknowledgement was lost.
          final cleanup = await _prepareCleanup(current);
          journal.requireSession(scope, session);
          failure = await _cleanup(cleanup, session);
          return;
        }
        while (current.uploads.length < current.mediaIds.length) {
          final position = current.uploads.length;
          final mediaId = current.mediaIdAt(position);
          current = await journal.checkpoint(
            current,
            current.next(uploadingMediaId: mediaId),
          );
          journal.requireSession(scope, session);
          try {
            final uploaded = await images.uploadEventPhotoForRecovery(
              eventId: scope.eventId,
              position: position,
              mediaId: mediaId,
              image: selected![position],
            );
            journal.requireSession(scope, session);
            final settled = await journal.settleUpload(
              current,
              EventPhotoRecoveryUpload(
                mediaId: mediaId,
                url: uploaded.url,
                storagePath: uploaded.storagePath,
                position: position,
              ),
            );
            journal.requireSession(scope, session);
            if (settled == null) return;
            current = settled;
          } on Object catch (error) {
            // Account changes leave the write-ahead upload marker intact. A
            // new session must reconcile it; the obsolete session never cleans.
            journal.requireSession(scope, session);
            failure = error;
            final cleanup = await journal.settleUpload(current, null);
            journal.requireSession(scope, session);
            if (cleanup == null) return;
            failure = await _cleanup(cleanup, session) ?? failure;
            return;
          }
        }
        current = await journal.checkpoint(
          current,
          current.next(phase: EventPhotoRecoveryPhase.awaitingAttachment),
        );
        journal.requireSession(scope, session);
      }
      if (current.phase == EventPhotoRecoveryPhase.awaitingAttachment ||
          current.phase == EventPhotoRecoveryPhase.conflict) {
        if (current.phase == EventPhotoRecoveryPhase.awaitingAttachment) {
          try {
            validateAttachment(current);
          } on Object catch (error) {
            // No attachment was dispatched. This definitive local rejection
            // may compensate and permit a new, smaller selection on this event.
            failure = error;
            final cleanup = await _prepareCleanup(current);
            journal.requireSession(scope, session);
            failure = await _cleanup(cleanup, session) ?? failure;
            return;
          }
        }
        current = await journal.checkpoint(
          current,
          current.next(phase: EventPhotoRecoveryPhase.attachmentUnknown),
        );
        journal.requireSession(scope, session);
      }
      if (current.phase == EventPhotoRecoveryPhase.attachmentUnknown) {
        try {
          final result = await attach(current);
          journal.requireSession(scope, session);
          if (!result.matches(current)) {
            failure = const FormatException(
              'Event photo attachment receipt did not match',
            );
            return;
          }
          await journal.checkpoint(
            current,
            current.next(phase: EventPhotoRecoveryPhase.complete),
          );
        } on Object catch (error) {
          journal.requireSession(scope, session);
          // The saved unknown marker precedes the request. Any lost/malformed
          // acknowledgement retains the same request and all object references.
          failure = error;
          if (error is AppException &&
              const {'aborted', 'event-media-conflict'}.contains(error.code)) {
            await journal.checkpoint(
              current,
              current.next(phase: EventPhotoRecoveryPhase.conflict),
            );
          }
        }
      }
    });
    journal.requireSession(scope, session);
    final latest = await journal.load(scope);
    journal.requireSession(scope, session);
    return latest == null
        ? null
        : EventPhotoRecoveryResult(
            receipt: latest,
            failure: failure,
            requiresPhotoReselection:
                selected == null &&
                latest.phase == EventPhotoRecoveryPhase.uploadFailed &&
                latest.mediaIds.isNotEmpty,
          );
  }

  Future<EventPhotoRecovery> _prepareCleanup(EventPhotoRecovery current) =>
      journal.checkpoint(
        current,
        current.next(
          phase: EventPhotoRecoveryPhase.cleanupPending,
          cleanupPaths: [
            for (final photo in current.uploads) photo.storagePath,
          ],
          abandonedUploads: {
            ...current.abandonedUploads,
            if (current.uploadingMediaId case final mediaId?)
              current.pathFor(mediaId): false,
          },
        ),
      );

  Future<EventPhotoRecovery> _cleanupAbandoned(
    EventPhotoRecovery saved,
    EventPhotoRecoverySession session,
  ) async {
    var current = saved;
    for (final entry in saved.abandonedUploads.entries) {
      // A 404 while an uploader is still running is not terminal evidence.
      if (!entry.value) continue;
      journal.requireSession(current.scope, session);
      try {
        await images.deleteByPathChecked(entry.key);
        journal.requireSession(current.scope, session);
        current = await journal.checkpoint(
          current,
          current.next(
            abandonedUploads: Map.of(current.abandonedUploads)
              ..remove(entry.key),
            uploadingMediaId: current.uploadingMediaId,
          ),
        );
      } on Object {
        journal.requireSession(current.scope, session);
        // Keep confirmed-terminal cleanup failures for the next replay.
      }
    }
    return current;
  }

  Future<Object?> _cleanup(
    EventPhotoRecovery saved,
    EventPhotoRecoverySession session,
  ) async {
    var current = saved;
    Object? failure;
    for (final path in saved.cleanupPaths) {
      journal.requireSession(current.scope, session);
      try {
        await images.deleteByPathChecked(path);
        journal.requireSession(current.scope, session);
        current = await journal.checkpoint(
          current,
          current.next(
            cleanupPaths: current.cleanupPaths.where((p) => p != path),
          ),
        );
        journal.requireSession(current.scope, session);
      } on Object catch (error) {
        // Keep the path until absence is confirmed, including when deletion
        // committed but its acknowledgement was lost. Continue independent paths.
        journal.requireSession(current.scope, session);
        failure ??= error;
      }
    }
    if (current.cleanupPaths.isEmpty) {
      await journal.checkpoint(
        current,
        current.next(
          phase: EventPhotoRecoveryPhase.uploadFailed,
          uploads: [],
          cleanupPaths: [],
        ),
      );
      journal.requireSession(current.scope, session);
    }
    return failure;
  }
}
