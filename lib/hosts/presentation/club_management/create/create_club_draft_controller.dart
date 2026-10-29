import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_draft_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_draft.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'create_club_draft_controller.g.dart';

/// **Pattern A: Action controller + static Mutations**
///
/// Owns local create-club draft persistence. The screen owns text
/// controllers and restoration because those are UI mechanics.
@riverpod
class CreateClubDraftController extends _$CreateClubDraftController {
  static final loadDraftMutation = Mutation<ClubDraft?>();
  static final saveDraftMutation = Mutation<ClubDraft?>();
  static final deleteDraftMutation = Mutation<void>();

  Future<ClubDraft?>? _saveDraftInFlight;

  @override
  void build() {}

  Future<ClubDraft?> loadDraft() {
    final uid = requireSignedInUid(ref, action: 'load organizer draft');
    return ref.read(clubDraftRepositoryProvider).loadDraft(userId: uid);
  }

  Future<ClubDraft?> saveDraft(ClubDraft draft) {
    final existingRequest = _saveDraftInFlight;
    if (existingRequest != null) return existingRequest;

    late final Future<ClubDraft?> trackedRequest;
    trackedRequest = _saveDraft(draft).whenComplete(() {
      if (identical(_saveDraftInFlight, trackedRequest)) {
        _saveDraftInFlight = null;
      }
    });
    _saveDraftInFlight = trackedRequest;
    return trackedRequest;
  }

  Future<ClubDraft?> _saveDraft(ClubDraft draft) async {
    if (draft.isEmpty) return null;

    final uid = requireSignedInUid(ref, action: 'save organizer draft');
    await ref
        .read(clubDraftRepositoryProvider)
        .saveDraft(userId: uid, draft: draft);
    return draft;
  }

  Future<void> deleteDraft() {
    final uid = requireSignedInUid(ref, action: 'delete organizer draft');
    return ref.read(clubDraftRepositoryProvider).deleteDraft(userId: uid);
  }
}
