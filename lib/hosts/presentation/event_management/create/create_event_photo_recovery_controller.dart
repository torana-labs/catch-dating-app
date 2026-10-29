import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_photo_recovery_journal.dart';
import 'package:catch_dating_app/contexts/events/data/event_photo_recovery_service.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_photo_recovery.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/core/media/uploaded_photo.dart';
import 'package:catch_dating_app/core/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'create_event_photo_recovery_controller.g.dart';

/// Product state is independent of the create mutation's eventual photo result.
class CreateEventRecoveryState {
  const CreateEventRecoveryState({
    this.event,
    this.receipt,
    this.photoError,
    this.working = false,
    this.restored = const AsyncLoading<void>(),
    this.requiresPhotoReselection = false,
    this.isDurable = false,
  });
  final Event? event;
  final EventPhotoRecovery? receipt;
  final Object? photoError;
  final bool working;
  final AsyncValue<void> restored;
  final bool requiresPhotoReselection;
  final bool isDurable;

  bool get hasPhotoRecovery =>
      working ||
      photoError != null ||
      (receipt != null && !receipt!.isResolved);

  CreateEventRecoveryState copyWith({
    Event? event,
    EventPhotoRecovery? receipt,
    Object? photoError,
    bool? working,
    AsyncValue<void>? restored,
    bool? requiresPhotoReselection,
    bool? isDurable,
  }) => CreateEventRecoveryState(
    event: event ?? this.event,
    receipt: receipt ?? this.receipt,
    photoError: photoError,
    working: working ?? this.working,
    restored: restored ?? this.restored,
    requiresPhotoReselection:
        requiresPhotoReselection ?? this.requiresPhotoReselection,
    isDurable: isDurable ?? this.isDurable,
  );
}

typedef _RecoveryOperation = ({AuthenticatedSession account, Object lifetime});

/// One organizer's creation/reentry flow, reset on every authentication session
/// change. The shared journal owns durable recovery and execution leases.
@riverpod
class CreateEventPhotoRecoveryController
    extends _$CreateEventPhotoRecoveryController {
  ({String requestId, List<XFile> photos})? _selection;
  EventPhotoRecovery? _unregistered;
  Future<void>? _restoring;
  Object _lifetime = Object();

  @override
  CreateEventRecoveryState build(String organizerId) {
    ref.listen(authenticatedSessionProvider, (previous, next) {
      if (!identical(previous?.asData?.value, next.asData?.value)) {
        _resetSelection();
        state = CreateEventRecoveryState(
          restored: next.hasError
              ? AsyncError(next.error!, next.stackTrace!)
              : const AsyncLoading(),
        );
      }
    });
    _resetSelection();
    return const CreateEventRecoveryState();
  }

  void _resetSelection() {
    _lifetime = Object();
    _selection = null;
    _unregistered = null;
    _restoring = null;
  }

  _RecoveryOperation _captureOperation() {
    final session = ref.read(authenticatedSessionProvider).asData?.value;
    if (session == null) {
      throw const SignInRequiredException('recover event photos');
    }
    return (account: session, lifetime: _lifetime);
  }

  bool _isCurrent(_RecoveryOperation session) =>
      ref.mounted &&
      identical(
        ref.read(authenticatedSessionProvider).asData?.value,
        session.account,
      ) &&
      identical(_lifetime, session.lifetime);

  void _requireCurrent(_RecoveryOperation session) {
    if (!_isCurrent(session)) {
      throw const SignInRequiredException('recover event photos');
    }
  }

  EventPhotoRecoveryJournal _journal() => EventPhotoRecoveryJournal(
    storage: ref.read(commandJournalStorageProvider),
    currentAccountId: () => ref.mounted
        ? ref.read(authenticatedSessionProvider).asData?.value.uid
        : null,
    currentSession: () =>
        ref.mounted &&
            ref.read(authenticatedSessionProvider).asData?.value != null
        ? _lifetime
        : null,
  );

  Future<void> restore() async {
    var lifetime = _lifetime;
    final keepAlive = ref.keepAlive();
    try {
      if (!ref.mounted) return;
      lifetime = _lifetime;
      final session = _captureOperation();
      if (state.restored is AsyncData<void>) return;
      if (_restoring case final pending?) return await pending;
      final pending = _loadPending(session);
      _restoring = pending;
      try {
        await pending;
      } finally {
        if (_isCurrent(session)) _restoring = null;
      }
    } on Object catch (error, stack) {
      if (ref.mounted && identical(lifetime, _lifetime)) {
        state = state.copyWith(restored: AsyncError(error, stack));
      }
    } finally {
      keepAlive.close();
    }
  }

  Future<void> _loadPending(_RecoveryOperation session) async {
    final pending = await _journal().pendingForOrganizer(
      accountId: session.account.uid,
      organizerId: organizerId,
      includeResolved: true,
    );
    _requireCurrent(session);
    pending.sort((a, b) => a.createdAtMillis.compareTo(b.createdAtMillis));
    if (pending.isEmpty) {
      state = state.copyWith(restored: const AsyncData(null));
      return;
    }
    final receipt = pending.first;
    final event = await ref
        .read(eventRepositoryProvider)
        .fetchEvent(receipt.scope.eventId);
    _requireCurrent(session);
    if (event == null ||
        event.id != receipt.scope.eventId ||
        event.clubId != organizerId) {
      throw const ValidationException(
        'The saved event is unavailable. '
        'Its photo recovery has been preserved.',
      );
    }
    state = CreateEventRecoveryState(
      event: event,
      receipt: receipt,
      restored: const AsyncData(null),
      requiresPhotoReselection:
          receipt.phase == EventPhotoRecoveryPhase.uploading ||
          receipt.phase == EventPhotoRecoveryPhase.uploadFailed,
      isDurable: true,
    );
  }

  Future<Event> create({
    required Event event,
    required List<XFile> photos,
    required Future<void> Function() commit,
    String? sourceDraftId,
  }) async {
    _RecoveryOperation? operationSession;
    final keepAlive = ref.keepAlive();
    try {
      final session = _captureOperation();
      operationSession = session;
      await restore();
      _requireCurrent(session);
      if (event.clubId != organizerId) {
        throw const ValidationException('The saved event organizer changed.');
      }
      if (state.restored.hasError) throw state.restored.error!;
      if (state.event != null || state.working) {
        throw const ValidationException(
          'The event is already saved. '
          'Retry its photos from the saved event.',
        );
      }
      state = state.copyWith(working: true);
      final initial = EventPhotoRecovery(
        scope: EventPhotoRecoveryScope(
          accountId: session.account.uid,
          organizerId: organizerId,
          eventId: event.id,
        ),
        requestId: 'recovery_${ImageUploadRepository.createMediaId()}',
        createdAtMillis: DateTime.now().millisecondsSinceEpoch,
        expectedMediaHash: eventPhotoMediaHash(event.photoUrl, [
          for (final photo in event.eventPhotos)
            EventPhotoRecoveryUpload(
              mediaId: photo.id,
              url: photo.url,
              storagePath: photo.storagePath,
              position: photo.position,
            ),
        ]),
        sourceDraftId: sourceDraftId,
        mediaIds: [
          for (final _ in photos)
            'photo_${ImageUploadRepository.createMediaId()}',
        ],
      );
      final retain = await _journal().prepareCommittedRetention(initial);
      _requireCurrent(session);
      await commit();
      // Save the authoritative identity immediately. The capability below is
      // write-only, including if the acknowledgement crossed account ABA.
      if (_isCurrent(session)) {
        _selection = (
          requestId: initial.requestId,
          photos: List.unmodifiable(photos),
        );
        _unregistered = initial;
        state = state.copyWith(event: event, receipt: initial);
      }
      Object? persistenceError;
      try {
        await retain();
      } on Object catch (error) {
        persistenceError = error;
      }
      _requireCurrent(session);
      if (persistenceError != null) {
        state = state.copyWith(working: false, photoError: persistenceError);
        return event;
      }
      state = state.copyWith(isDurable: true);
      await _resume(session);
      _requireCurrent(session);
      return state.event!;
    } finally {
      if (operationSession != null &&
          _isCurrent(operationSession) &&
          state.working) {
        state = state.copyWith(working: false, photoError: state.photoError);
      }
      keepAlive.close();
    }
  }

  Future<void> retryPhotos({bool reselect = false}) async {
    _RecoveryOperation? operationSession;
    final keepAlive = ref.keepAlive();
    try {
      final session = _captureOperation();
      operationSession = session;
      if (state.event == null || state.working) return;
      if (_selection?.requestId != state.receipt?.requestId) _selection = null;
      state = state.copyWith(working: true);
      if (state.receipt case final saved?) {
        final latest = await _journal().load(saved.scope);
        _requireCurrent(session);
        if (latest != null) {
          if (latest.requestId != saved.requestId) _selection = null;
          state = state.copyWith(receipt: latest);
        }
      }
      if (state.event!.status != EventLifecycleStatus.active &&
          {
            EventPhotoRecoveryPhase.uploading,
            EventPhotoRecoveryPhase.uploadFailed,
          }.contains(state.receipt?.phase)) {
        throw const ValidationException(
          'This saved event is no longer active. '
          'Open it to review its photos.',
        );
      }
      if (reselect && state.receipt?.isResolved != true) {
        final picked = await ref
            .read(imageUploadRepositoryProvider)
            .pickImages(
              purpose: ImageUploadPurpose.eventPhoto,
              limit: state.receipt?.mediaIds.length,
            );
        _requireCurrent(session);
        if (picked.isEmpty) return;
        _selection = (
          requestId: state.receipt!.requestId,
          photos: List.unmodifiable(picked),
        );
      }
      final receipt = state.receipt;
      // A prior replacement may have acknowledged the old unsent command
      // before its sidecar swap failed. Available bytes always retry under a
      // fresh immutable request; missing bytes still require reselection.
      if (_selection != null &&
          receipt != null &&
          receipt.phase == EventPhotoRecoveryPhase.uploadFailed &&
          receipt.abandonedUploads.isEmpty) {
        final saved = await _journal().replaceUnsent(
          receipt,
          EventPhotoRecovery(
            scope: receipt.scope,
            requestId: 'recovery_${ImageUploadRepository.createMediaId()}',
            createdAtMillis: DateTime.now().millisecondsSinceEpoch,
            expectedMediaHash: receipt.expectedMediaHash,
            sourceDraftId: receipt.sourceDraftId,
            mediaIds: [
              for (final _ in _selection!.photos)
                'photo_${ImageUploadRepository.createMediaId()}',
            ],
          ),
        );
        _requireCurrent(session);
        _selection = (requestId: saved.requestId, photos: _selection!.photos);
        state = state.copyWith(receipt: saved);
      }
      await _resume(session);
    } on Object catch (error) {
      if (operationSession != null && _isCurrent(operationSession)) {
        state = state.copyWith(photoError: error);
      }
    } finally {
      if (operationSession != null && _isCurrent(operationSession)) {
        state = state.copyWith(working: false, photoError: state.photoError);
      }
      keepAlive.close();
    }
  }

  Future<void> _removeSourceDraft(_RecoveryOperation session) async {
    _requireCurrent(session);
    final draftId = state.receipt?.sourceDraftId;
    if (draftId == null) return;
    await ref
        .read(eventDraftRepositoryProvider)
        .deleteDraft(
          clubId: organizerId,
          userId: session.account.uid,
          draftId: draftId,
        );
    _requireCurrent(session);
  }

  Future<bool> acknowledgeDeparture() async {
    final session = _captureOperation();
    try {
      if (!state.isDurable) return true;
      await _removeSourceDraft(session);
      final receipt = state.receipt;
      if (receipt != null && receipt.isResolved && !state.working) {
        await _journal().forgetCompleted(receipt);
        _requireCurrent(session);
      }
      return true;
    } on Object catch (error) {
      if (_isCurrent(session)) state = state.copyWith(photoError: error);
      return false;
    }
  }

  Future<void> _resume(_RecoveryOperation session) async {
    final event = state.event!;
    final journal = _journal();
    try {
      if (_unregistered case final initial?) {
        await journal.retain(initial);
        _requireCurrent(session);
        _unregistered = null;
        state = state.copyWith(isDurable: true);
      }
      await _removeSourceDraft(session);
      final service = EventPhotoRecoveryService(
        validateAttachment: (command) {
          boundedEventPhotoAttachmentPayload(
            event: _eventWithPhotos(event, command),
            requestId: command.requestId,
            expectedMediaHash: command.expectedMediaHash,
          );
        },
        journal: journal,
        images: ref.read(imageUploadRepositoryProvider),
        attach: (command) async {
          _requireCurrent(session);
          final response = await ref
              .read(eventRepositoryProvider)
              .attachEventPhotos(
                event: _eventWithPhotos(event, command),
                requestId: command.requestId,
                expectedMediaHash: command.expectedMediaHash,
              );
          _requireCurrent(session);
          return EventPhotoAttachmentReceipt(
            scope: EventPhotoRecoveryScope(
              accountId: response['actorUid']! as String,
              organizerId: response['organizerId']! as String,
              eventId: response['eventId']! as String,
            ),
            requestId: response['requestId']! as String,
            payloadHash: response['payloadHash']! as String,
          );
        },
      );
      final result = await service.resume(
        EventPhotoRecoveryScope(
          accountId: session.account.uid,
          organizerId: organizerId,
          eventId: event.id,
        ),
        photos: _selection?.photos,
        selectedRequestId: _selection?.requestId,
      );
      _requireCurrent(session);
      if (result == null) return;
      if (_selection?.requestId != result.receipt.requestId) _selection = null;
      // The durable receipt is authoritative even if refreshing presentation
      // fails. A completed attachment must never offer a new upload/reselection.
      state = state.copyWith(
        receipt: result.receipt,
        photoError: result.failure,
        requiresPhotoReselection: result.requiresPhotoReselection,
      );
      var currentEvent = event;
      if (result.receipt.phase == EventPhotoRecoveryPhase.complete &&
          result.receipt.uploads.isNotEmpty) {
        final canonical = await ref
            .read(eventRepositoryProvider)
            .fetchEvent(event.id);
        _requireCurrent(session);
        if (canonical == null ||
            canonical.id != event.id ||
            canonical.clubId != organizerId) {
          final error = const ValidationException(
            'The saved event is unavailable. '
            'Its photo recovery has been preserved.',
          );
          state = state.copyWith(
            restored: AsyncError(error, StackTrace.current),
          );
          throw error;
        }
        currentEvent = canonical;
      }
      state = state.copyWith(
        event: currentEvent,
        receipt: result.receipt,
        photoError: result.failure,
        requiresPhotoReselection: result.requiresPhotoReselection,
      );
    } on Object catch (error) {
      _requireCurrent(session);
      state = state.copyWith(photoError: error);
    } finally {
      if (_isCurrent(session)) {
        state = state.copyWith(working: false, photoError: state.photoError);
      }
    }
  }
}

Event _eventWithPhotos(Event event, EventPhotoRecovery receipt) {
  // These exact timestamps are part of the immutable server request hash.
  // Reconstruct them from durable intent rather than the current wall clock.
  final time = DateTime.fromMillisecondsSinceEpoch(
    receipt.createdAtMillis,
    isUtc: true,
  );
  final photos = [
    for (final photo in receipt.uploads)
      UploadedPhoto(
        id: photo.mediaId,
        url: photo.url,
        storagePath: photo.storagePath,
        position: photo.position,
        createdAt: time,
        updatedAt: time,
      ),
  ];
  return event.copyWith(photoUrl: photos.first.url, eventPhotos: photos);
}
