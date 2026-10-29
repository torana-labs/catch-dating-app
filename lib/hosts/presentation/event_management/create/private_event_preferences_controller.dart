import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_journal.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/event_preferences_editor.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/hosts/presentation/event_management/create/event_preferences_editor.dart';

part 'private_event_preferences_controller.g.dart';

typedef ReadPrivateEventForPreferences =
    Future<PrivateEventBasicSummary> Function({
      required String organizerId,
      required String eventId,
    });
typedef ReadDefaultsForPrivateEvent =
    Future<ManagerEventSetupDefaults> Function(String organizerId);
typedef WritePrivateEventPreferences =
    Future<PrivateEventCreateReceipt> Function(
      PrivateEventPreferencesUpdateRequest request,
    );

class PrivateEventPreferencesDependencies {
  const PrivateEventPreferencesDependencies({
    required this.readEvent,
    required this.readDefaults,
    required this.write,
    this.readPreview,
    this.currentUserId,
    this.journal = const PrivateEventPreferencesJournal(),
  });
  final ReadPrivateEventForPreferences readEvent;
  final Future<ManagerEventSetupDefaults> Function(String) readDefaults;
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
    readEvent: PrivateEventSetupRepository(functions).get,
    readDefaults: ManagerEventSetupDefaultsRepository(functions).get,
    write: PrivateEventPreferencesRepository(functions).update,
    readPreview: EventOfferPreferencesRepository(functions).preview,
    currentUserId: () => ref.read(uidProvider).asData?.value,
  );
}

@riverpod
class PrivateEventPreferencesController
    extends _$PrivateEventPreferencesController
    with EventPreferencesEditorController {
  @override
  EventPreferencesEditorState build(EventEditorScope scope) {
    final dependencies = ref.watch(privateEventPreferencesDependenciesProvider);
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
  ReadPrivateEventForPreferences get _readEvent => _dependencies.readEvent;
  Future<ManagerEventSetupDefaults> Function(String) get _readDefaults =>
      _dependencies.readDefaults;
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
  Future<void> load() async {
    if (!actorIsAvailable() || _loading || _saving) return;
    resetDraft();
    _loading = true;
    _error = null;
    _event = null;
    _defaults = null;
    try {
      _pending = await _journal.load(
        userId: _userId,
        organizerId: _organizerId,
        eventId: _eventId,
      );
      if (!actorIsAvailable()) return;
      final results = await Future.wait<Object>([
        _readEvent(organizerId: _organizerId, eventId: _eventId),
        _readDefaults(_organizerId),
      ]);
      if (!actorIsAvailable()) return;
      final nextEvent = results[0] as PrivateEventBasicSummary;
      final nextDefaults = results[1] as ManagerEventSetupDefaults;
      if (nextEvent.eventId != _eventId ||
          nextEvent.organizerId != _organizerId ||
          nextDefaults.organizerId != _organizerId) {
        throw const FormatException(
          'Private event preferences identity changed',
        );
      }
      _event = nextEvent;
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
        _event = null;
        _defaults = null;
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
    // The command is settled, but its new revision must be read before a
    // second command can be built. A failed reread must not reuse stale state.
    _event = null;
    _event = await _readEvent(organizerId: _organizerId, eventId: _eventId);
    if (!actorIsAvailable()) return;
    if (_event!.eventId != _eventId || _event!.organizerId != _organizerId) {
      throw const FormatException('Private event reread changed identity');
    }
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
