import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_journal.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_preferences_editor.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/hosts/presentation/event_management/create/event_preferences_editor.dart';

part 'event_offer_preferences_controller.g.dart';

typedef ReadEventOfferConfiguration =
    Future<EventOfferConfiguration> Function({
      required String organizerId,
      required String eventId,
    });
typedef ReadDefaultsForPublishedEvent =
    Future<ManagerEventSetupDefaults> Function(String organizerId);
typedef WriteEventOfferPreferences =
    Future<EventOfferPreferencesReceipt> Function(
      EventOfferPreferencesUpdateRequest request,
    );

class EventOfferPreferencesDependencies {
  const EventOfferPreferencesDependencies({
    required this.readConfiguration,
    required this.readDefaults,
    required this.write,
    this.readPreview,
    this.currentUserId,
    this.journal = const EventOfferPreferencesJournal(),
  });
  final ReadEventOfferConfiguration readConfiguration;
  final Future<ManagerEventSetupDefaults> Function(String) readDefaults;
  final WriteEventOfferPreferences write;
  final PreviewEventOfferPreferences? readPreview;
  final String? Function()? currentUserId;
  final EventOfferPreferencesJournal journal;
}

@riverpod
EventOfferPreferencesDependencies eventOfferPreferencesDependencies(Ref ref) {
  final functions = ref.watch(firebaseFunctionsProvider);
  return EventOfferPreferencesDependencies(
    readConfiguration: EventOfferPreferencesRepository(functions).get,
    readDefaults: ManagerEventSetupDefaultsRepository(functions).get,
    write: EventOfferPreferencesRepository(functions).configure,
    readPreview: EventOfferPreferencesRepository(functions).preview,
    currentUserId: () => ref.read(uidProvider).asData?.value,
  );
}

@riverpod
class EventOfferPreferencesController extends _$EventOfferPreferencesController
    with EventPreferencesEditorController {
  @override
  EventPreferencesEditorState build(EventEditorScope scope) {
    final dependencies = ref.watch(eventOfferPreferencesDependenciesProvider);
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
  ReadEventOfferConfiguration get _readConfiguration =>
      _dependencies.readConfiguration;
  Future<ManagerEventSetupDefaults> Function(String) get _readDefaults =>
      _dependencies.readDefaults;
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
  Future<void> load() async {
    if (!actorIsAvailable() || _loading || _saving) return;
    resetDraft();
    _loading = true;
    _error = null;
    _configuration = null;
    _defaults = null;
    try {
      _pending = await _journal.load(
        userId: _userId,
        organizerId: _organizerId,
        eventId: _eventId,
      );
      if (!actorIsAvailable()) return;
      final results = await Future.wait<Object>([
        _readConfiguration(organizerId: _organizerId, eventId: _eventId),
        _readDefaults(_organizerId),
      ]);
      if (!actorIsAvailable()) return;
      final nextConfiguration = results[0] as EventOfferConfiguration;
      final nextDefaults = results[1] as ManagerEventSetupDefaults;
      if (nextConfiguration.eventId != _eventId ||
          nextConfiguration.organizerId != _organizerId ||
          nextDefaults.organizerId != _organizerId) {
        throw const FormatException('Offer settings identity changed');
      }
      _configuration = nextConfiguration;
      _defaults = nextDefaults;
    } catch (cause) {
      _error = cause;
    } finally {
      _loading = false;
    }
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
        _configuration = null;
        _defaults = null;
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
    _configuration = null;
    _configuration = await _readConfiguration(
      organizerId: _organizerId,
      eventId: _eventId,
    );
    if (!actorIsAvailable()) return;
    if (_configuration!.eventId != _eventId ||
        _configuration!.organizerId != _organizerId ||
        _configuration!.preferencesRevision < receipt.preferencesRevision) {
      throw const FormatException('Offer settings reread changed identity');
    }
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
