import 'package:catch_dating_app/contexts/profiles/domain/onboarding_draft.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'onboarding_draft_repository.g.dart';

class OnboardingDraftRepository {
  const OnboardingDraftRepository(this._db);

  static const _collectionPath = 'onboarding_drafts';

  final FirebaseFirestore _db;

  DocumentReference<Map<String, dynamic>> _draftRef(String uid) =>
      _db.collection(_collectionPath).doc(uid);

  Future<OnboardingDraft?> fetchDraft({required String uid}) =>
      withBackendErrorContext(
        () async {
          final snap = await _draftRef(uid).get();
          if (!snap.exists) return null;
          return OnboardingDraft.fromJson(snap.data()!);
        },
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'fetch onboarding draft',
          resource: _collectionPath,
        ),
      );

  Future<void> saveDraft({
    required String uid,
    required OnboardingDraft draft,
  }) => withBackendErrorContext(
    () => _draftRef(uid).set(draft.toJson()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'save draft',
      resource: _collectionPath,
    ),
  );

  Future<void> deleteDraft({required String uid}) => withBackendErrorContext(
    () => _draftRef(uid).delete(),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'delete draft',
      resource: _collectionPath,
    ),
  );
}

// keepalive: onboarding draft repository is shared by the multi-step flow and
// persists progress across route rebuilds.
@Riverpod(keepAlive: true)
OnboardingDraftRepository onboardingDraftRepository(Ref ref) =>
    OnboardingDraftRepository(ref.watch(firebaseFirestoreProvider));
