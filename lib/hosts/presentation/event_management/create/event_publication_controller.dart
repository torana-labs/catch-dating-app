import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_publication_journal.dart';
import 'package:catch_dating_app/contexts/events/data/event_publication_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/data/read_model_follower.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_view_reads.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_preferences_editor.dart';
import 'package:catch_platform/analytics/app_analytics.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_publication_controller.freezed.dart';
part 'event_publication_controller.g.dart';

/// Commands and services. The event is read through its listener read owner,
/// `privateEventSetupViewProvider`.
class EventPublicationDependencies {
  const EventPublicationDependencies({
    required this.write,
    this.currentUserId,
    this.journal = const EventPublicationJournal(),
  });
  final Future<EventPublicationReceipt> Function(EventPublicationRequest) write;
  final String? Function()? currentUserId;
  final EventPublicationJournal journal;
}

@riverpod
EventPublicationDependencies eventPublicationDependencies(Ref ref) {
  final functions = ref.watch(firebaseFunctionsProvider);
  return EventPublicationDependencies(
    write: EventPublicationRepository(functions).set,
    currentUserId: () => ref.read(uidProvider).asData?.value,
  );
}

@freezed
abstract class EventPublicationState with _$EventPublicationState {
  const EventPublicationState._();
  const factory EventPublicationState({
    PrivateEventBasicSummary? event,
    EventPublicationRequest? pending,
    EventPublicationReceipt? receipt,
    Object? error,
    @Default(false) bool loading,
    @Default(false) bool saving,
    @Default(true) bool actorAvailable,
  }) = _EventPublicationState;
  bool get canChange =>
      actorAvailable && event != null && !loading && !saving && pending == null;
  bool get canPublish =>
      canChange &&
      event!.publicationState == 'private' &&
      event!.publicationReadiness?.canPublish == true;
  bool get canUnpublish => canChange && event!.publicationState == 'published';
}

@riverpod
class EventPublicationController extends _$EventPublicationController {
  late ReadModelFollower<PrivateEventSetupView> _eventView;
  bool _journalLoaded = false;

  @override
  EventPublicationState build(EventEditorScope scope) {
    ref.watch(eventPublicationDependenciesProvider);
    _eventView = ReadModelFollower(
      onValue: _onEventView,
      onError: _onListenerError,
    );
    ref.onDispose(() => _eventView.close());
    ref.listen(uidProvider, (_, next) {
      if (next.asData?.value != scope.userId) invalidateActor();
    });
    return const EventPublicationState();
  }

  EventPublicationDependencies get _dependencies =>
      ref.read(eventPublicationDependenciesProvider);
  String get _userId => scope.userId;
  String get _organizerId => scope.organizerId;
  String get _eventId => scope.eventId;

  Future<EventPublicationReceipt> Function(EventPublicationRequest)
  get _write => _dependencies.write;
  EventPublicationJournal get _journal => _dependencies.journal;
  bool get _actorAvailable {
    if (!ref.mounted || !state.actorAvailable) return false;
    final actor = _dependencies.currentUserId;
    if (actor != null && actor() != _userId) {
      invalidateActor();
      return false;
    }
    return true;
  }

  void invalidateActor() {
    _eventView.close();
    if (ref.mounted) {
      state = state.copyWith(actorAvailable: false, event: null, receipt: null);
    }
  }

  void _update(EventPublicationState Function(EventPublicationState) update) {
    if (_actorAvailable) state = update(state);
  }

  PrivateEventBasicSummary? get _event => state.event;
  set _event(PrivateEventBasicSummary? value) =>
      _update((s) => s.copyWith(event: value));
  EventPublicationRequest? get _pending => state.pending;
  set _pending(EventPublicationRequest? value) =>
      _update((s) => s.copyWith(pending: value));
  set _receipt(EventPublicationReceipt? value) =>
      _update((s) => s.copyWith(receipt: value));
  set _error(Object? value) => _update((s) => s.copyWith(error: value));
  bool get _loading => state.loading;
  set _loading(bool value) => _update((s) => s.copyWith(loading: value));
  bool get _saving => state.saving;
  set _saving(bool value) => _update((s) => s.copyWith(saving: value));
  bool get _canPublish => _actorAvailable && state.canPublish;
  bool get _canUnpublish => _actorAvailable && state.canUnpublish;

  /// Listens to the event (before the journal read) and stays loading until
  /// it has delivered. A missing view keeps loading; an invalid one is a
  /// typed error.
  Future<void> load() async {
    if (!_actorAvailable || _loading || _saving) return;
    _journalLoaded = false;
    _loading = true;
    _event = null;
    _error = null;
    _eventView.follow(
      ref,
      privateEventSetupViewProvider(
        organizerId: _organizerId,
        eventId: _eventId,
      ),
    );
    try {
      _pending = await _journal.load(
        userId: _userId,
        organizerId: _organizerId,
        eventId: _eventId,
      );
    } catch (cause) {
      if (_actorAvailable) _error = cause;
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
    if (view.isComplete) _event = view.summary;
    _settleLoading();
  }

  void _onListenerError(Object error) {
    if (!_actorAvailable) return;
    _event = null;
    _error = error;
    if (_journalLoaded) _loading = false;
  }

  void _settleLoading() {
    if (_loading && _journalLoaded && (_event != null || state.error != null)) {
      _loading = false;
    }
  }

  /// No reread after a command: wait until the listener delivers [revision].
  Future<void> _reflecting(int revision) async {
    await _eventView.until(
      (view) =>
          view.reflects(revision) ||
          view.sourceCoverage == PrivateEventSetupCoverage.invalidSource,
    );
    if (!_actorAvailable) return;
    _eventView.latest?.requireSummary();
  }

  Future<void> changeTo(String publicationState) async {
    if (publicationState == 'published'
        ? !_canPublish
        : publicationState != 'private' || !_canUnpublish) {
      return;
    }
    final random = Random.secure();
    final request = EventPublicationRequest(
      organizerId: _organizerId,
      eventId: _eventId,
      requestId: List<int>.generate(
        24,
        (_) => random.nextInt(256),
      ).map((value) => value.toRadixString(16).padLeft(2, '0')).join(),
      expectedSetupRevision: _event!.setupRevision,
      publicationState: publicationState,
    );
    _saving = true;
    _error = null;
    _receipt = null;
    try {
      await _journal.save(userId: _userId, request: request);
      if (!_actorAvailable) return;
      _pending = request;
      if (!_actorAvailable) return;
      await _send(request);
      if (!_actorAvailable) return;
    } catch (cause) {
      if (_actorAvailable) _error = cause;
    } finally {
      _saving = false;
    }
  }

  Future<void> retry() async {
    if (!_actorAvailable || _pending == null || _saving || _loading) return;
    _saving = true;
    _error = null;
    try {
      await _send(_pending!);
      if (!_actorAvailable) return;
    } catch (cause) {
      if (_actorAvailable) _error = cause;
    } finally {
      _saving = false;
    }
  }

  Future<void> _send(EventPublicationRequest request) async {
    if (!_actorAvailable) return;
    final reportPublished = ref
        .read(appAnalyticsProvider)
        .hostEventCompletion(AnalyticsEvents.hostEventPublished);
    EventPublicationReceipt result;
    try {
      result = await _write(request);
      if (!_actorAvailable) return;
    } catch (cause) {
      if (_actorAvailable && isDefinitivePublicationRejection(cause, request)) {
        await _journal.clear(userId: _userId, request: request);
        if (!_actorAvailable) return;
        // The listener already holds the current visibility.
        _pending = null;
      }
      rethrow;
    }
    if (!_actorAvailable) return;
    if (result.eventId != _eventId ||
        result.publicationState != request.publicationState ||
        result.setupRevision != request.expectedSetupRevision + 1) {
      throw const FormatException('Invalid publication receipt');
    }
    if (!result.replayed && result.publicationState == 'published') {
      reportPublished();
    }
    await _journal.clear(userId: _userId, request: request);
    if (!_actorAvailable) return;
    _pending = null;
    _receipt = result;
    if (!_actorAvailable) return;
    await _reflecting(result.setupRevision);
  }
}
