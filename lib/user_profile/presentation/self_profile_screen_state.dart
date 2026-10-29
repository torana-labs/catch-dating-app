import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';

enum SelfProfileRouteStatus { loading, error, unavailable, ready }

enum SelfProfileRetryIntent { reloadProfile }

enum SelfProfileMutationMode {
  idle,
  uploadPending,
  savePending,
  uploadAndSavePending,
}

class SelfProfileScreenState {
  const SelfProfileScreenState({
    required this.status,
    required this.uploadState,
    required this.mutationMode,
    this.error,
    this.user,
    this.previewProfile,
    this.retryIntent,
  });

  factory SelfProfileScreenState.fromAsync({
    required CatchAsyncState<UserProfile?> profileState,
    required DateTime today,
    required PhotoUploadState uploadState,
    required bool uploadMutationPending,
    required bool saveMutationPending,
  }) {
    final mutationMode = selfProfileMutationModeFromFlags(
      uploadPending:
          uploadMutationPending || uploadState.loadingIndices.isNotEmpty,
      savePending: saveMutationPending,
    );

    // Own-account routes render during profile reloads, including account
    // changes. Never render or edit retained profile data across that boundary.
    switch (profileState.phase) {
      case CatchAsyncPhase.initialLoading:
      case CatchAsyncPhase.retrying:
      case CatchAsyncPhase.refreshing:
        return SelfProfileScreenState(
          status: SelfProfileRouteStatus.loading,
          uploadState: uploadState,
          mutationMode: mutationMode,
        );
      case CatchAsyncPhase.staleDataWithError:
      case CatchAsyncPhase.terminalError:
        return SelfProfileScreenState(
          status: SelfProfileRouteStatus.error,
          error: profileState.error,
          uploadState: uploadState,
          mutationMode: mutationMode,
          retryIntent: SelfProfileRetryIntent.reloadProfile,
        );
      case CatchAsyncPhase.data:
        final value = profileState.value;
        return value == null ||
                value.dateOfBirth == null ||
                value.gender == null
            ? SelfProfileScreenState(
                status: SelfProfileRouteStatus.unavailable,
                uploadState: uploadState,
                mutationMode: mutationMode,
              )
            : SelfProfileScreenState(
                status: SelfProfileRouteStatus.ready,
                user: value,
                previewProfile: publicProfileFromUserProfile(
                  value,
                  today: today,
                ),
                uploadState: uploadState,
                mutationMode: mutationMode,
              );
    }
  }

  final SelfProfileRouteStatus status;
  final Object? error;
  final UserProfile? user;
  final PublicProfile? previewProfile;
  final PhotoUploadState uploadState;
  final SelfProfileMutationMode mutationMode;
  final SelfProfileRetryIntent? retryIntent;

  bool get isReady => status == SelfProfileRouteStatus.ready;
  bool get isMutating => mutationMode != SelfProfileMutationMode.idle;
  bool get isUploadMutating =>
      mutationMode == SelfProfileMutationMode.uploadPending ||
      mutationMode == SelfProfileMutationMode.uploadAndSavePending;
  bool get isSaveMutating =>
      mutationMode == SelfProfileMutationMode.savePending ||
      mutationMode == SelfProfileMutationMode.uploadAndSavePending;
}

SelfProfileMutationMode selfProfileMutationModeFromFlags({
  required bool uploadPending,
  required bool savePending,
}) {
  if (uploadPending && savePending) {
    return SelfProfileMutationMode.uploadAndSavePending;
  }
  if (uploadPending) return SelfProfileMutationMode.uploadPending;
  if (savePending) return SelfProfileMutationMode.savePending;
  return SelfProfileMutationMode.idle;
}
