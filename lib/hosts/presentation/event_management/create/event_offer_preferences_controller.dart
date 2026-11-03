import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/read_model_follower.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_default_view_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_configuration_reads.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_journal.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_preferences_editor.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/hosts/presentation/event_management/create/event_preferences_editor.dart';

part 'event_offer_preferences_controller.g.dart';

typedef WriteEventOfferPreferences =
    Future<EventOfferPreferencesReceipt> Function(
      EventOfferPreferencesUpdateRequest request,
    );

/// Commands and services. The offer settings and the organizer defaults are
/// read through their listener read owners, `eventOfferConfigurationProvider`
/// and `managerEventSetupDefaultsViewProvider`.
class EventOfferPreferencesDependencies {
  const EventOfferPreferencesDependencies({
    required this.write,
    this.readPreview,
    this.currentUserId,
    this.journal = const EventOfferPreferencesJournal(),
  });
  final WriteEventOfferPreferences write;
  final PreviewEventOfferPreferences? readPreview;
  final String? Function()? currentUserId;
  final EventOfferPreferencesJournal journal;
}

@riverpod
EventOfferPreferencesDependencies eventOfferPreferencesDependencies(Ref ref) {
  final functions = ref.watch(firebaseFunctionsProvider);
  return EventOfferPreferencesDependencies(
    write: EventOfferPreferencesRepository(functions).configure,
    readPreview: EventOfferPreferencesRepository(functions).preview,
    currentUserId: () => ref.read(uidProvider).asData?.value,
  );
}

@riverpod
class EventOfferPreferencesController extends _$EventOfferPreferencesController
    with EventPreferencesEditorController {
  late ReadModelFollower<EventOfferConfiguration> _configurationView;
  late ReadModelFollower<ManagerEventSetupDefaultsView> _defaultsView;
  bool _journalLoaded = false;
  Object? _listenerError;

  @override
  EventPreferencesEditorState build(EventEditorScope scope) {
    final dependencies = ref.watch(eventOfferPreferencesDependenciesProvider);
    _configurationView = ReadModelFollower(
      onValue: _onConfiguration,
      onError: _onListenerError,
    );
    _defaultsView = ReadModelFollower(
      onValue: _onDefaultsView,
      onError: _onListenerError,
    );
    ref.onDispose(() {
      _configurationView.close();
      _defaultsView.close();
    });
    bindActor();
    return EventPreferencesEditorState(
      published: true,
      previewAvailable: dependencies.readPreview != null,
    );
  }

  @override
  EventEditorScope scopeIdentity() => scope;
  @override
  String? Function()? actorReader() => _dependencies.currentUserId;
  @override
  PreviewEventOfferPreferences? previewReader() => _dependencies.readPreview;
  EventOfferPreferencesDependencies get _dependencies =>
      ref.read(eventOfferPreferencesDependenciesProvider);
  String get _userId => scope.userId;
  String get _organizerId => scope.organizerId;
  String get _eventId => scope.eventId;
  WriteEventOfferPreferences get _write => _dependencies.write;
  EventOfferPreferencesJournal get _journal => _dependencies.journal;
  EventOfferPreferencesUpdateRequest? get _pending => state.offerPending;
  set _pending(EventOfferPreferencesUpdateRequest? value) =>
      updateEditor((s) => s.copyWith(offerPending: value));
  EventOfferConfiguration? get _configuration => state.configuration;
  set _configuration(EventOfferConfiguration? value) =>
      updateEditor((s) => s.copyWith(configuration: value));
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
    _configurationView.close();
    _defaultsView.close();
    super.invalidateActor();
  }

  /// Listens to the offer settings and the organizer defaults (before the
  /// journal read) and stays loading until both have delivered.
  Future<void> load() async {
    if (!actorIsAvailable() || _loading || _saving) return;
    resetDraft();
    _journalLoaded = false;
    _listenerError = null;
    _loading = true;
    _error = null;
    _configuration = null;
    _defaults = null;
    _configurationView.follow(
      ref,
      eventOfferConfigurationProvider(
        organizerId: _organizerId,
        eventId: _eventId,
      ),
    );
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
  }

  void _onConfiguration(EventOfferConfiguration configuration) {
    if (!actorIsAvailable()) return;
    _configuration = configuration;
    _clearListenerError();
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
    if (_configurationView.latest == null) _configuration = null;
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
    if (!_loading) return;
    final answered =
        _listenerError != null || (_configuration != null && _defaults != null);
    if (_journalLoaded && answered) _loading = false;
  }

  @override
  EventOfferPreferencesUpdateRequest previewRequest(
    PrivateEventPreferenceIntents intents,
  ) => EventOfferPreferencesUpdateRequest(
    expectedActorUid: _userId,
    organizerId: _organizerId,
    eventId: _eventId,
    requestId: _newOfferSettingsRequestId(),
    expectedEventSourceRevision: _configuration!.eventSourceRevision,
    expectedPreferencesRevision: _configuration!.preferencesRevision,
    reviewedDefaultsHash: _defaults!.preferencesHash,
    intents: intents,
  );

  @override
  Future<void> save(PrivateEventPreferenceIntents intents) async {
    if (!canEditNow()) return;
    final request = EventOfferPreferencesUpdateRequest(
      expectedActorUid: _userId,
      organizerId: _organizerId,
      eventId: _eventId,
      requestId: _newOfferSettingsRequestId(),
      expectedEventSourceRevision: _configuration!.eventSourceRevision,
      expectedPreferencesRevision: _configuration!.preferencesRevision,
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
      // A later denial cannot prove the original command was not applied.
      _error = cause;
    } finally {
      _saving = false;
    }
  }

  Future<void> _sendPending(EventOfferPreferencesUpdateRequest request) async {
    if (!actorIsAvailable()) {
      throw const SignInRequiredException('apply event settings');
    }
    late final EventOfferPreferencesReceipt receipt;
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
        // The listeners already hold the current settings and defaults.
        resetDraft();
      }
      rethrow;
    }
    if (receipt.eventId != _eventId ||
        receipt.preferencesRevision <= request.expectedPreferencesRevision) {
      throw const FormatException('Invalid offer settings receipt');
    }
    await _journal.clear(userId: _userId, request: request);
    if (!actorIsAvailable()) return;
    _pending = null;
    // No reread: the command settles when the listener delivers its revision.
    final applied = receipt.preferencesRevision;
    await _configurationView.until(
      (configuration) => configuration.preferencesRevision >= applied,
    );
    if (!actorIsAvailable()) return;
    _error = null;
  }
}

String _newOfferSettingsRequestId() {
  final random = Random.secure();
  return List<int>.generate(
    24,
    (_) => random.nextInt(256),
  ).map((value) => value.toRadixString(16).padLeft(2, '0')).join();
}
