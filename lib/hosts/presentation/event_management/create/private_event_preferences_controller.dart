import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_journal.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/data/read_model_follower.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_preferences_editor.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/hosts/presentation/event_management/create/event_preferences_editor.dart';

part 'private_event_preferences_controller.g.dart';

typedef WritePrivateEventPreferences =
    Future<PrivateEventCreateReceipt> Function(
      PrivateEventPreferencesUpdateRequest request,
    );

/// Commands and services. The event and the organizer defaults are read
/// through their listener read owners, `privateEventSetupViewProvider` and
/// `managerEventSetupDefaultsViewProvider`.
class PrivateEventPreferencesDependencies {
  const PrivateEventPreferencesDependencies({
    required this.write,
    this.readPreview,
    this.currentUserId,
    this.journal = const PrivateEventPreferencesJournal(),
  });
  final WritePrivateEventPreferences write;
  final PreviewEventOfferPreferences? readPreview;
  final String? Function()? currentUserId;
  final PrivateEventPreferencesJournal journal;
}

@riverpod
PrivateEventPreferencesDependencies privateEventPreferencesDependencies(
  Ref ref,
) {
  final functions = ref.watch(firebaseFunctionsProvider);
  return PrivateEventPreferencesDependencies(
    write: PrivateEventPreferencesRepository(functions).update,
    readPreview: EventOfferPreferencesRepository(functions).preview,
    currentUserId: () => ref.read(uidProvider).asData?.value,
  );
}

@riverpod
class PrivateEventPreferencesController
    extends _$PrivateEventPreferencesController
    with EventPreferencesEditorController {
  late ReadModelFollower<PrivateEventSetupView> _eventView;
  late ReadModelFollower<ManagerEventSetupDefaultsView> _defaultsView;
  bool _journalLoaded = false;
  Object? _listenerError;

  @override
  EventPreferencesEditorState build(EventEditorScope scope) {
    final dependencies = ref.watch(privateEventPreferencesDependenciesProvider);
    _eventView = ReadModelFollower(
      onValue: _onEventView,
      onError: _onListenerError,
      reject: (view) => privateEventSetupViewMismatch(view, scope),
    );
    _defaultsView = ReadModelFollower(
      onValue: _onDefaultsView,
      onError: _onListenerError,
      reject: (view) => defaultsViewMismatch(view, scope.organizerId),
    );
    ref.onDispose(() {
      _eventView.close();
      _defaultsView.close();
    });
    bindActor();
    return EventPreferencesEditorState(
      previewAvailable: dependencies.readPreview != null,
    );
  }

  @override
  EventEditorScope scopeIdentity() => scope;
  @override
  String? Function()? actorReader() => _dependencies.currentUserId;
  @override
  PreviewEventOfferPreferences? previewReader() => _dependencies.readPreview;
  PrivateEventPreferencesDependencies get _dependencies =>
      ref.read(privateEventPreferencesDependenciesProvider);
  String get _userId => scope.userId;
  String get _organizerId => scope.organizerId;
  String get _eventId => scope.eventId;
  WritePrivateEventPreferences get _write => _dependencies.write;
  PrivateEventPreferencesJournal get _journal => _dependencies.journal;
  PrivateEventPreferencesUpdateRequest? get _pending => state.privatePending;
  set _pending(PrivateEventPreferencesUpdateRequest? value) =>
      updateEditor((s) => s.copyWith(privatePending: value));
  PrivateEventBasicSummary? get _event => state.event;
  set _event(PrivateEventBasicSummary? value) =>
      updateEditor((s) => s.copyWith(event: value));
  ManagerEventSetupDefaults? get _defaults => state.defaults;
  set _defaults(ManagerEventSetupDefaults? value) =>
      updateEditor((s) => s.copyWith(defaults: value));
  bool get _loading => state.loading;
  set _loading(bool value) => updateEditor((s) => s.copyWith(loading: value));
  bool get _saving => state.saving;
  set _saving(bool value) => updateEditor((s) => s.copyWith(saving: value));
  set _error(Object? value) => updateEditor((s) => s.copyWith(error: value));
  @override
  void invalidateActor() {
    _eventView.close();
    _defaultsView.close();
    super.invalidateActor();
  }

  /// Listens to the event and the organizer defaults (before the journal
  /// read) and stays loading until both have delivered. A missing view keeps
  /// the step loading; an invalid one is a typed error.
  Future<void> load() async {
    if (!actorIsAvailable() || _loading || _saving) return;
    resetDraft();
    _journalLoaded = false;
    _listenerError = null;
    _loading = true;
    _error = null;
    _event = null;
    _defaults = null;
    _followEvent();
    _defaultsView.follow(
      ref,
      managerEventSetupDefaultsViewProvider(_organizerId),
    );
    try {
      _pending = await _journal.load(
        userId: _userId,
        organizerId: _organizerId,
        eventId: _eventId,
      );
    } catch (cause) {
      _error = cause;
    } finally {
      _journalLoaded = true;
      _settleLoading();
    }
    // Returns once every listener has answered, loaded or not.
    await Future.wait([_eventView.firstDelivery, _defaultsView.firstDelivery]);
  }

  void _followEvent() => _eventView.follow(
    ref,
    privateEventSetupViewProvider(organizerId: _organizerId, eventId: _eventId),
  );

  void _onEventView(PrivateEventSetupView view) {
    if (!actorIsAvailable()) return;
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
      _event = view.summary;
      _clearListenerError();
    }
    _settleLoading();
  }

  void _onDefaultsView(ManagerEventSetupDefaultsView view) {
    if (!actorIsAvailable()) return;
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
      _defaults = view.defaults;
      _clearListenerError();
    }
    _settleLoading();
  }

  void _onListenerError(Object error) {
    if (!actorIsAvailable()) return;
    _listenerError = error;
    if (!(_eventView.latest?.isComplete ?? false)) _event = null;
    if (!(_defaultsView.latest?.isComplete ?? false)) _defaults = null;
    _error = error;
    _settleLoading();
  }

  void _clearListenerError() {
    if (_listenerError != null && identical(state.error, _listenerError)) {
      _error = null;
    }
    _listenerError = null;
  }

  /// Loading ends when the journal and both listeners have answered.
  void _settleLoading() {
    if (!ref.mounted) return;
    if (!_loading) return;
    final answered =
        _listenerError != null || (_event != null && _defaults != null);
    if (_journalLoaded && answered) _loading = false;
  }

  @override
  EventOfferPreferencesUpdateRequest previewRequest(
    PrivateEventPreferenceIntents intents,
  ) => EventOfferPreferencesUpdateRequest(
    expectedActorUid: _userId,
    organizerId: _organizerId,
    eventId: _eventId,
    requestId: _newRequestId(),
    expectedEventSourceRevision: _event!.setupRevision,
    expectedPreferencesRevision: _event!.eventPreferences?.revision ?? 0,
    reviewedDefaultsHash: _defaults!.preferencesHash,
    intents: intents,
  );

  @override
  Future<void> save(PrivateEventPreferenceIntents intents) async {
    if (!canEditNow()) return;
    final request = PrivateEventPreferencesUpdateRequest(
      expectedActorUid: _userId,
      organizerId: _organizerId,
      eventId: _eventId,
      requestId: _newRequestId(),
      expectedSetupRevision: _event!.setupRevision,
      expectedPreferencesRevision: _event!.eventPreferences?.revision ?? 0,
      reviewedDefaultsHash: _defaults!.preferencesHash,
      intents: intents,
    );
    if (!request.isValid) {
      _error = ArgumentError.value(intents, 'intents');
      return;
    }
    _saving = true;
    _error = null;
    try {
      await _journal.save(userId: _userId, request: request);
      if (!actorIsAvailable()) return;
      _pending = request;
      await _sendPending(request);
      if (!actorIsAvailable()) return;
    } catch (cause) {
      _error = cause;
    } finally {
      _saving = false;
    }
  }

  Future<void> retryPending() async {
    if (!actorIsAvailable() || _pending == null || _saving || _loading) return;
    _saving = true;
    _error = null;
    try {
      await _sendPending(_pending!);
      if (!actorIsAvailable()) return;
    } catch (cause) {
      // A later permission/precondition error is not proof that the original
      // send failed. Never rotate its identity or payload here.
      _error = cause;
    } finally {
      _saving = false;
    }
  }

  Future<void> _sendPending(
    PrivateEventPreferencesUpdateRequest request,
  ) async {
    if (!actorIsAvailable()) {
      throw const SignInRequiredException('apply event settings');
    }
    late final PrivateEventCreateReceipt receipt;
    try {
      receipt = await _write(request);
      if (!actorIsAvailable()) return;
    } catch (cause) {
      if (actorIsAvailable() &&
          isDefinitiveEventPreferenceRejection(
            cause,
            requestId: request.requestId,
            eventId: _eventId,
            organizerId: _organizerId,
          )) {
        await _journal.clear(userId: _userId, request: request);
        if (!actorIsAvailable()) return;
        _pending = null;
        // The listeners already hold the current event and defaults.
        resetDraft();
      }
      rethrow;
    }
    if (receipt.eventId != _eventId ||
        receipt.setupRevision <= request.expectedSetupRevision) {
      throw const FormatException('Invalid event preferences receipt');
    }
    await _journal.clear(userId: _userId, request: request);
    if (!actorIsAvailable()) return;
    _pending = null;
    // No reread: saving ends when the listener delivers the committed
    // revision, so a second command is built from it.
    final revision = receipt.setupRevision;
    if (!_eventView.following) _followEvent();
    await _eventView.until(
      (view) =>
          view.reflects(revision) ||
          view.sourceCoverage == PrivateEventSetupCoverage.invalidSource,
    );
    if (!actorIsAvailable()) return;
    _eventView.latest?.requireSummary();
    _error = null;
  }
}

String _newRequestId() {
  final random = Random.secure();
  return List<int>.generate(
    24,
    (_) => random.nextInt(256),
  ).map((value) => value.toRadixString(16).padLeft(2, '0')).join();
}
