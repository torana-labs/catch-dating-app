import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_preferences_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/event_offer_preferences_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'event_preferences_editor.freezed.dart';

typedef EventEditorScope = ({
  String userId,
  String organizerId,
  String eventId,
});

@freezed
abstract class EventPreferencesEditorState with _$EventPreferencesEditorState {
  const EventPreferencesEditorState._();
  const factory EventPreferencesEditorState({
    PrivateEventBasicSummary? event,
    EventOfferConfiguration? configuration,
    ManagerEventSetupDefaults? defaults,
    PrivateEventPreferencesUpdateRequest? privatePending,
    EventOfferPreferencesUpdateRequest? offerPending,
    String? displayName,
    Object? error,
    @Default(false) bool loading,
    @Default(false) bool saving,
    @Default(false) bool previewing,
    @Default(false) bool previewAvailable,
    PrivateEventPreferenceIntents? draftIntents,
    EventOfferPreferencesPreview? review,
    @Default(false) bool published,
    @Default(true) bool actorAvailable,
  }) = _EventPreferencesEditorState;
  String? get eventName => published ? displayName : event?.name;
  bool get hasLoadedEvent => published ? configuration != null : event != null;
  bool get isPrivateEvent => !published;
  bool get hasPending => privatePending != null || offerPending != null;
  PrivateEventPreferenceIntents get intents =>
      (published
          ? configuration?.preferences?.intents
          : event?.eventPreferences?.intents) ??
      const PrivateEventPreferenceIntents();
  PrivateEventPreferenceIntents get editorIntents => draftIntents ?? intents;
  Map<String, Object?> get resolvedValues =>
      (published
          ? configuration?.preferences?.resolvedValues
          : event?.eventPreferences?.resolvedValues) ??
      defaults?.preferences.toSparseJson() ??
      const <String, Object?>{};
  bool get canEdit =>
      actorAvailable &&
      (published ? configuration != null : event?.canEditBasics == true) &&
      defaults != null &&
      !hasPending &&
      !loading &&
      !saving &&
      !previewing;
}

/// Shared commands, with immutable state owned by each generated provider.
/// Private and published editors keep separate durable command protocols.
mixin EventPreferencesEditorController
    on AnyNotifier<EventPreferencesEditorState, EventPreferencesEditorState> {
  @protected
  EventEditorScope scopeIdentity();
  @protected
  String? Function()? actorReader();
  @protected
  PreviewEventOfferPreferences? previewReader();
  EventOfferPreferencesUpdateRequest previewRequest(
    PrivateEventPreferenceIntents intents,
  );
  Future<void> save(PrivateEventPreferenceIntents intents);
  int _reviewEpoch = 0;
  @protected
  void bindActor() {
    ref.listen(uidProvider, (_, next) {
      if (next.asData?.value != scopeIdentity().userId) invalidateActor();
    });
  }

  bool actorIsAvailable() {
    if (!ref.mounted || !state.actorAvailable) return false;
    final current = actorReader();
    if (current != null && current() != scopeIdentity().userId) {
      invalidateActor();
      return false;
    }
    return true;
  }

  void invalidateActor() {
    if (!ref.mounted) return;
    _reviewEpoch++;
    state = state.copyWith(
      actorAvailable: false,
      event: null,
      configuration: null,
      defaults: null,
      draftIntents: null,
      review: null,
      previewing: false,
    );
  }

  @protected
  void updateEditor(
    EventPreferencesEditorState Function(EventPreferencesEditorState) change,
  ) {
    if (actorIsAvailable()) state = change(state);
  }

  @protected
  bool canEditNow() => actorIsAvailable() && state.canEdit;
  PrivateEventPreferenceIntents get _editorIntents => state.editorIntents;
  PreviewEventOfferPreferences? get _readPreview => previewReader();
  EventOfferPreferencesUpdateRequest _buildPreviewRequest(
    PrivateEventPreferenceIntents intents,
  ) => previewRequest(intents);
  set _error(Object? value) => updateEditor((s) => s.copyWith(error: value));
  set _previewing(bool value) =>
      updateEditor((s) => s.copyWith(previewing: value));
  set _draftIntents(PrivateEventPreferenceIntents? value) =>
      updateEditor((s) => s.copyWith(draftIntents: value));
  EventOfferPreferencesPreview? get _review => state.review;
  set _review(EventOfferPreferencesPreview? value) =>
      updateEditor((s) => s.copyWith(review: value));
  void stage(PrivateEventPreferenceIntents next) {
    if (!canEditNow()) return;
    _draftIntents = next;
    _review = null;
    _error = null;
    _reviewEpoch++;
  }

  @protected
  void resetDraft() {
    _draftIntents = null;
    _review = null;
    _previewing = false;
    _reviewEpoch++;
  }

  Future<void> previewChanges() async {
    if (!actorIsAvailable()) return;
    final reader = _readPreview;
    if (!canEditNow() || reader == null) return;
    final request = _buildPreviewRequest(_editorIntents);
    final epoch = ++_reviewEpoch;
    _previewing = true;
    _review = null;
    _error = null;

    try {
      final result = await reader(request);
      if (!actorIsAvailable() || epoch != _reviewEpoch) return;
      if (!const DeepCollectionEquality().equals(
        result.request.toJson(),
        request.toJson(),
      )) {
        throw const FormatException('Preview command identity changed');
      }
      _review = result;
    } catch (cause) {
      if (actorIsAvailable() && epoch == _reviewEpoch) _error = cause;
    } finally {
      if (actorIsAvailable() && epoch == _reviewEpoch) {
        _previewing = false;
      }
    }
  }

  Future<void> applyReview() async {
    if (!actorIsAvailable()) return;
    final approved = _review;
    if (!canEditNow() || approved == null) return;
    final current = _buildPreviewRequest(_editorIntents);
    final frozen = approved.request;
    if (current.organizerId != frozen.organizerId ||
        current.eventId != frozen.eventId ||
        current.expectedEventSourceRevision !=
            frozen.expectedEventSourceRevision ||
        current.expectedPreferencesRevision !=
            frozen.expectedPreferencesRevision ||
        current.reviewedDefaultsHash != frozen.reviewedDefaultsHash) {
      resetDraft();
      reportError(
        StateError('Event settings changed. Reload and review again.'),
      );
      return;
    }
    await save(frozen.intents);
    if (!actorIsAvailable()) return;
    // A failed write may have committed. Its existing journal owns all retries.
    resetDraft();
  }

  void reportError(Object cause) {
    _error = cause;
  }
}
