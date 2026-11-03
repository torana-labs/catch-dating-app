import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_details_journal.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_details_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/data/read_model_follower.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_default_view_reads.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_view_reads.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/private_event_media_service.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/media/uploaded_photo.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'private_event_details_controller.freezed.dart';
part 'private_event_details_controller.g.dart';

typedef PrivateEventDetailsScope = ({
  String userId,
  String organizerId,
  String eventId,
});

@freezed
abstract class PrivateEventDetailsState with _$PrivateEventDetailsState {
  const PrivateEventDetailsState._();
  const factory PrivateEventDetailsState({
    PrivateEventBasicSummary? event,
    ManagerEventSetupDefaults? defaults,
    PrivateEventDetailsUpdateRequest? pending,
    PrivateSeatReconciliationProgress? reconciliationProgress,
    Object? error,
    @Default(false) bool loading,
    @Default(false) bool saving,
    @Default(false) bool uploading,
    @Default(true) bool actorAvailable,
    @Default(false) bool discardUnavailable,
    @Default(false) bool photoUploadAvailable,
    @Default(false) bool reconciliationAvailable,
  }) = _PrivateEventDetailsState;

  bool get canEdit =>
      actorAvailable &&
      event?.status == 'active' &&
      event?.publicationState == 'private' &&
      defaults != null &&
      pending == null &&
      !loading &&
      !saving &&
      !uploading;
  bool get canEditFormat => canEdit && event?.canEditBasics == true;
  bool get canAddPhotos => canEdit && photoUploadAvailable;
  bool get canDiscardPending =>
      !discardUnavailable &&
      reconciliationAvailable &&
      actorAvailable &&
      !saving &&
      !loading &&
      pending?.details.admissionTerms != null &&
      pending?.discard != true &&
      pending!.details.toJson().length == 1 &&
      !const {'apply', 'cleanup'}.contains(reconciliationProgress?.phase);
}

/// Commands and services. The event and the organizer defaults are read
/// through their listener read owners, `privateEventSetupViewProvider` and
/// `managerEventSetupDefaultsViewProvider`.
class PrivateEventDetailsDependencies {
  const PrivateEventDetailsDependencies({
    required this.write,
    this.reconcile,
    this.journal = const PrivateEventDetailsJournal(),
    this.currentUserId,
    this.pickAndUploadPhotos,
  });
  final WritePrivateEventDetails write;
  final Future<PrivateSeatReconciliationResult> Function(
    PrivateEventDetailsUpdateRequest,
  )?
  reconcile;
  final PrivateEventDetailsJournal journal;
  final String? Function()? currentUserId;
  final Future<List<UploadedPhoto>> Function(PrivateEventDetailsScope, int)?
  pickAndUploadPhotos;
}

@riverpod
PrivateEventDetailsDependencies privateEventDetailsDependencies(Ref ref) {
  final functions = ref.watch(firebaseFunctionsProvider);
  final details = PrivateEventDetailsRepository(functions);
  final media = ref.watch(privateEventMediaServiceProvider);
  return PrivateEventDetailsDependencies(
    write: details.update,
    reconcile: details.reconcile,
    currentUserId: () => ref.read(uidProvider).asData?.value,
    pickAndUploadPhotos: (scope, position) => media.pickAndUpload(
      userId: scope.userId,
      eventId: scope.eventId,
      position: position,
    ),
  );
}

typedef WritePrivateEventDetails =
    Future<PrivateEventCreateReceipt> Function(
      PrivateEventDetailsUpdateRequest request,
    );

/// Exact-command journal makes a lost details response safe to retry after
/// app restart or manager access changes, without creating another mutation.
@riverpod
class PrivateEventDetailsController extends _$PrivateEventDetailsController {
  late ReadModelFollower<PrivateEventSetupView> _eventView;
  late ReadModelFollower<ManagerEventSetupDefaultsView> _defaultsView;
  bool _journalLoaded = false;
  Object? _listenerError;

  @override
  PrivateEventDetailsState build(PrivateEventDetailsScope scope) {
    // Keep repository/service dependencies alive for this controller scope.
    final dependencies = ref.watch(privateEventDetailsDependenciesProvider);
    _eventView = ReadModelFollower(
      onValue: _onEventView,
      onError: _onListenerError,
    );
    _defaultsView = ReadModelFollower(
      onValue: _onDefaultsView,
      onError: _onListenerError,
    );
    ref.onDispose(() {
      _eventView.close();
      _defaultsView.close();
    });
    ref.listen(uidProvider, (previous, next) {
      if (next.asData?.value != scope.userId) invalidateActor();
    });
    return PrivateEventDetailsState(
      photoUploadAvailable: dependencies.pickAndUploadPhotos != null,
      reconciliationAvailable: dependencies.reconcile != null,
    );
  }

  PrivateEventDetailsDependencies get _dependencies =>
      ref.read(privateEventDetailsDependenciesProvider);
  String get _userId => scope.userId;
  String get _organizerId => scope.organizerId;
  String get _eventId => scope.eventId;
  WritePrivateEventDetails get _write => _dependencies.write;
  PrivateEventDetailsJournal get _journal => _dependencies.journal;
  Future<PrivateSeatReconciliationResult> Function(
    PrivateEventDetailsUpdateRequest,
  )?
  get _reconcile => _dependencies.reconcile;
  PrivateEventBasicSummary? get _event => state.event;
  ManagerEventSetupDefaults? get _defaults => state.defaults;
  PrivateEventDetailsUpdateRequest? get _pending => state.pending;
  bool get _loading => state.loading;
  bool get _saving => state.saving;
  bool get _uploading => state.uploading;
  bool get _actorAvailable {
    if (!ref.mounted || !state.actorAvailable) return false;
    final currentUser = _dependencies.currentUserId;
    if (currentUser != null && currentUser() != _userId) {
      invalidateActor();
      return false;
    }
    return true;
  }

  void _update(
    PrivateEventDetailsState Function(PrivateEventDetailsState) update,
  ) {
    if (ref.mounted) state = update(state);
  }

  void invalidateActor() {
    _eventView.close();
    _defaultsView.close();
    _update(
      (s) => s.copyWith(
        actorAvailable: false,
        event: null,
        defaults: null,
        reconciliationProgress: null,
      ),
    );
  }

  // Venue and duration can be completed after guests or offers exist. Only
  // a format change remains subject to the basic-event commitment guard.
  bool get _canEdit => _actorAvailable && state.canEdit;
  bool get _canEditFormat => _canEdit && state.canEditFormat;

  void reportValidationError(Object cause) {
    _update((s) => s.copyWith(error: cause));
  }

  /// Listens to the event and the organizer defaults (before the journal
  /// read) and stays loading until both have delivered. A missing view keeps
  /// the step loading; an invalid one is a typed error.
  Future<void> load() async {
    if (!_actorAvailable || _loading || _saving || _uploading) return;
    _journalLoaded = false;
    _listenerError = null;
    _update(
      (s) =>
          s.copyWith(loading: true, error: null, event: null, defaults: null),
    );
    _eventView.follow(
      ref,
      privateEventSetupViewProvider(
        organizerId: _organizerId,
        eventId: _eventId,
      ),
    );
    _defaultsView.follow(
      ref,
      managerEventSetupDefaultsViewProvider(_organizerId),
    );
    try {
      final savedPending = await _journal.load(
        userId: _userId,
        organizerId: _organizerId,
        eventId: _eventId,
      );
      if (!_actorAvailable) return;
      _update((s) => s.copyWith(pending: savedPending));
    } catch (cause) {
      _update((s) => s.copyWith(error: cause));
    } finally {
      _journalLoaded = true;
      _settleLoading();
    }
  }

  void _onEventView(PrivateEventSetupView view) {
    if (!_actorAvailable) return;
    if (view.sourceCoverage == PrivateEventSetupCoverage.invalidSource) {
      _onListenerError(
        PrivateEventSetupViewUnavailable(
          view.sourceCoverage,
          source: view.incompleteSource,
        ),
      );
      return;
    }
    if (view.isComplete) {
      _update((s) => s.copyWith(event: view.summary));
      _clearListenerError();
    }
    _settleLoading();
  }

  void _onDefaultsView(ManagerEventSetupDefaultsView view) {
    if (!_actorAvailable) return;
    if (view.sourceCoverage ==
        ManagerEventSetupDefaultsCoverage.invalidSource) {
      _onListenerError(
        ManagerEventSetupDefaultsUnavailable(
          view.sourceCoverage,
          source: view.incompleteSource,
        ),
      );
      return;
    }
    if (view.isComplete) {
      _update((s) => s.copyWith(defaults: view.defaults));
      _clearListenerError();
    }
    _settleLoading();
  }

  void _onListenerError(Object error) {
    if (!_actorAvailable) return;
    _listenerError = error;
    final eventFailed = !(_eventView.latest?.isComplete ?? false);
    final defaultsFailed = !(_defaultsView.latest?.isComplete ?? false);
    _update(
      (s) => s.copyWith(
        error: error,
        event: eventFailed ? null : s.event,
        defaults: defaultsFailed ? null : s.defaults,
      ),
    );
    _settleLoading();
  }

  void _clearListenerError() {
    if (_listenerError != null && identical(state.error, _listenerError)) {
      _update((s) => s.copyWith(error: null));
    }
    _listenerError = null;
  }

  /// Loading ends when the journal and both listeners have answered.
  void _settleLoading() {
    if (!_loading) return;
    final answered =
        _listenerError != null ||
        (state.event != null && state.defaults != null);
    if (_journalLoaded && answered) {
      _update((s) => s.copyWith(loading: false));
    }
  }

  Future<void> addPhotos() async {
    final upload = _dependencies.pickAndUploadPhotos;
    if (!_canEdit || upload == null) return;
    final snapshot = _event!;
    _update((s) => s.copyWith(uploading: true));
    _update((s) => s.copyWith(error: null));

    try {
      final photos = await upload(
        scope,
        snapshot.eventDetails.eventPhotos.length,
      );
      _update((s) => s.copyWith(uploading: false));
      if (!_actorAvailable || photos.isEmpty) return;
      if (!_canEdit || _event?.setupRevision != snapshot.setupRevision) {
        throw StateError('Event changed while photos were uploading.');
      }
      // The exact attachment command is journaled before sending. Never delete
      // uploaded media after an uncertain write: a replay may already own it.
      await save(
        PrivateEventDetailsPatch(
          eventPhotos: [...snapshot.eventDetails.eventPhotos, ...photos],
        ),
      );
    } catch (cause) {
      if (_actorAvailable) _update((s) => s.copyWith(error: cause));
    } finally {
      _update((s) => s.copyWith(uploading: false));
    }
  }

  Future<void> save(PrivateEventDetailsPatch details) async {
    if (!_canEdit) return;
    if (details.eventFormat != null && !_canEditFormat) {
      reportValidationError(
        StateError('Event format is locked by commitments.'),
      );
      return;
    }
    _update((s) => s.copyWith(discardUnavailable: false));
    final request = PrivateEventDetailsUpdateRequest(
      organizerId: _organizerId,
      eventId: _eventId,
      requestId: _newRequestId(),
      expectedSetupRevision: _event!.setupRevision,
      reviewedDefaultsHash: _defaults!.preferencesHash,
      details: details,
    );
    if (!request.isValid) {
      _update(
        (s) => s.copyWith(error: ArgumentError.value(details, 'details')),
      );

      return;
    }
    _update((s) => s.copyWith(saving: true));
    _update((s) => s.copyWith(error: null));

    try {
      await _journal.save(userId: _userId, request: request);
      _update((s) => s.copyWith(pending: request));

      if (!_actorAvailable) return;
      await _sendPending(request);
    } catch (cause) {
      _update((s) => s.copyWith(error: cause));
    } finally {
      _update((s) => s.copyWith(saving: false));
    }
  }

  Future<void> retryPending() async {
    if (!_actorAvailable || _pending == null || _saving) return;
    _update((s) => s.copyWith(saving: true));
    _update((s) => s.copyWith(error: null));

    try {
      await _sendPending(_pending!);
    } catch (cause) {
      // A later denial cannot prove an earlier send did not commit.
      _update((s) => s.copyWith(error: cause));
    } finally {
      _update((s) => s.copyWith(saving: false));
    }
  }

  bool get _canDiscardPending => _actorAvailable && state.canDiscardPending;

  Future<void> discardPending() async {
    if (!_canDiscardPending) return;
    final request = _pending!;
    _update((s) => s.copyWith(saving: true));
    _update((s) => s.copyWith(error: null));

    try {
      await _journal.setDiscardIntent(
        userId: _userId,
        request: request,
        discard: true,
      );
      _update((s) => s.copyWith(pending: request.withDiscard(true)));
      if (!_actorAvailable) return;
      await _sendPending(_pending!);
    } catch (cause) {
      if (_actorAvailable) _update((s) => s.copyWith(error: cause));
    } finally {
      _update((s) => s.copyWith(saving: false));
    }
  }

  Future<void> _sendPending(PrivateEventDetailsUpdateRequest request) async {
    if (!_actorAvailable) return;
    PrivateEventCreateReceipt? receipt;
    try {
      if (_reconcile != null &&
          request.details.admissionTerms != null &&
          request.details.toJson().length == 1) {
        // Each response is bounded server work. The journal survives interruption;
        // a very large roster can continue with the same pending command.
        for (var page = 0; page < 12 && _actorAvailable; page++) {
          final result = await _reconcile!(request);
          if (!_actorAvailable) return;
          if ((result.receipt?.eventId ??
                  result.progress?.eventId ??
                  result.discardedEventId) !=
              _eventId) {
            throw const FormatException(
              'Guest reconciliation changed identity',
            );
          }
          if (result.discardedEventId != null) {
            if (result.discardedRequestId != request.requestId) {
              throw const FormatException('Discard receipt changed request');
            }
            await _journal.clear(userId: _userId, request: request);
            _update((s) => s.copyWith(pending: null));
            _update((s) => s.copyWith(reconciliationProgress: null));
            // The listeners already hold the current event and defaults.
            return;
          }
          receipt = result.receipt;
          _update((s) => s.copyWith(reconciliationProgress: result.progress));

          if (receipt != null) break;
        }
        if (receipt == null) return;
      } else {
        receipt = await _write(request);
      }
    } catch (cause) {
      if (_actorAvailable && isDefinitiveDetailsRejection(cause, request)) {
        await _journal.clear(userId: _userId, request: request);
        _update((s) => s.copyWith(pending: null));
        _update((s) => s.copyWith(reconciliationProgress: null));
        // The listeners already hold the current event to review against.
      } else if (_actorAvailable &&
          request.discard &&
          isDiscardUnavailable(cause, request)) {
        // The server proved application has started. Preserve the original
        // settings command and allow completion instead of retrying discard.
        await _journal.setDiscardIntent(
          userId: _userId,
          request: request,
          discard: false,
        );
        _update((s) => s.copyWith(pending: request.withDiscard(false)));
        _update((s) => s.copyWith(discardUnavailable: true));
      }
      rethrow;
    }
    if (!_actorAvailable) return;
    if (receipt.eventId != _eventId ||
        receipt.setupRevision != request.expectedSetupRevision + 1) {
      throw const FormatException('Invalid event details receipt');
    }
    await _journal.clear(userId: _userId, request: request);
    _update((s) => s.copyWith(pending: null));
    _update((s) => s.copyWith(reconciliationProgress: null));
    if (!_actorAvailable) return;
    // No reread: saving ends when the listener delivers the committed
    // revision (an older replay revision is already reflected).
    final revision = receipt.setupRevision;
    await _eventView.until(
      (view) =>
          view.reflects(revision) ||
          view.sourceCoverage == PrivateEventSetupCoverage.invalidSource,
    );
    if (!_actorAvailable) return;
    final reflected = _eventView.latest;
    if (reflected != null && !reflected.isComplete) {
      throw PrivateEventSetupViewUnavailable(
        reflected.sourceCoverage,
        source: reflected.incompleteSource,
      );
    }
    _update((s) => s.copyWith(error: null));
  }
}

String _newRequestId() {
  final random = Random.secure();
  return List<int>.generate(
    24,
    (_) => random.nextInt(256),
  ).map((value) => value.toRadixString(16).padLeft(2, '0')).join();
}
