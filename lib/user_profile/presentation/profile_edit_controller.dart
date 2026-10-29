import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'profile_edit_controller.g.dart';

typedef _QueuedProfileSave =
    Future<void> Function(UserProfileRepository repository, String uid);

typedef LatestProfilePatchBuilder =
    UpdateUserProfilePatch Function(UserProfile user);

/// **Pattern A: Action controller + static Mutations**
///
/// Serializes profile-field saves so rapid bottom-sheet edits cannot race.
@riverpod
class ProfileEditController extends _$ProfileEditController {
  static final saveFieldsMutation = Mutation<void>();

  Future<void> _pendingSave = Future.value();

  @override
  void build() {}

  Future<void> saveFields(UpdateUserProfilePatch patch) {
    if (patch.isEmpty) return Future<void>.value();

    final uid = requireSignedInUid(ref, action: 'save profile edits');
    return _enqueueSave(
      uid,
      (repository, activeUid) =>
          repository.updateUserProfile(uid: activeUid, patch: patch),
    );
  }

  Future<void> saveFieldsFromLatest(LatestProfilePatchBuilder buildPatch) {
    final uid = requireSignedInUid(ref, action: 'save profile edits');
    return _enqueueSave(uid, (repository, activeUid) async {
      final latest = await repository.fetchUserProfile(uid: activeUid);
      if (latest == null) {
        throw const DocumentNotFoundException(
          'profile',
          context: BackendErrorContext(
            service: BackendService.firestore,
            action: 'fetch latest profile before save',
            resource: 'users',
          ),
        );
      }

      final patch = buildPatch(latest);
      if (patch.isEmpty) return;
      await repository.updateUserProfile(uid: activeUid, patch: patch);
    });
  }

  Future<void> _enqueueSave(String queuedUid, _QueuedProfileSave save) {
    final nextSave = _pendingSave
        .catchError((Object error, StackTrace stack) {
          ref
              .read(errorLoggerProvider)
              .logAppException(
                normalizeBackendError(
                  error,
                  stackTrace: stack,
                  context: const BackendErrorContext(
                    service: BackendService.local,
                    action: 'save queued profile edits',
                    resource: 'profile_edit_controller',
                  ),
                ),
              );
        })
        .then((_) async {
          final activeUid = requireSignedInUid(
            ref,
            action: 'save profile edits',
          );
          if (activeUid != queuedUid) {
            throw const BackendOperationException(
              code: 'profile-edit-session-changed',
              message: 'Profile changed while saving. Please try again.',
              context: BackendErrorContext(
                service: BackendService.local,
                action: 'save queued profile edits',
                resource: 'profile_edit_controller',
              ),
            );
          }
          await save(ref.read(userProfileRepositoryProvider), activeUid);
        });
    _pendingSave = nextSave.catchError((Object error, StackTrace stack) {
      ref
          .read(errorLoggerProvider)
          .logAppException(
            normalizeBackendError(
              error,
              stackTrace: stack,
              context: const BackendErrorContext(
                service: BackendService.local,
                action: 'save profile edits',
                resource: 'profile_edit_controller',
              ),
            ),
          );
    });
    return nextSave;
  }
}
