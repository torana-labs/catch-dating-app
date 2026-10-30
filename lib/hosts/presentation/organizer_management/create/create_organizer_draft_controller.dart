import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_draft_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_draft.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'create_organizer_draft_controller.g.dart';

/// **Pattern A: Action controller + static Mutations**
///
/// Owns local create-club draft persistence. The screen owns text
/// controllers and restoration because those are UI mechanics.
@riverpod
class CreateOrganizerDraftController extends _$CreateOrganizerDraftController {
  static final loadDraftMutation = Mutation<OrganizerDraft?>();
  static final saveDraftMutation = Mutation<OrganizerDraft?>();
  static final deleteDraftMutation = Mutation<void>();

  Future<OrganizerDraft?>? _saveDraftInFlight;

  @override
  void build() {}

  Future<OrganizerDraft?> loadDraft() {
    final uid = requireSignedInUid(ref, action: 'load organizer draft');
    return ref.read(organizerDraftRepositoryProvider).loadDraft(userId: uid);
  }

  Future<OrganizerDraft?> saveDraft(OrganizerDraft draft) {
    final existingRequest = _saveDraftInFlight;
    if (existingRequest != null) return existingRequest;

    late final Future<OrganizerDraft?> trackedRequest;
    trackedRequest = _saveDraft(draft).whenComplete(() {
      if (identical(_saveDraftInFlight, trackedRequest)) {
        _saveDraftInFlight = null;
      }
    });
    _saveDraftInFlight = trackedRequest;
    return trackedRequest;
  }

  Future<OrganizerDraft?> _saveDraft(OrganizerDraft draft) async {
    if (draft.isEmpty) return null;

    final uid = requireSignedInUid(ref, action: 'save organizer draft');
    await ref
        .read(organizerDraftRepositoryProvider)
        .saveDraft(userId: uid, draft: draft);
    return draft;
  }

  Future<void> deleteDraft() {
    final uid = requireSignedInUid(ref, action: 'delete organizer draft');
    return ref.read(organizerDraftRepositoryProvider).deleteDraft(userId: uid);
  }
}
