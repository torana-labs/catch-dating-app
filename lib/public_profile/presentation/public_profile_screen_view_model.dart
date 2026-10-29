import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_controller.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_screen_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'public_profile_screen_view_model.g.dart';

@riverpod
PublicProfileScreenState publicProfileScreenState(
  Ref ref,
  PublicProfileScreenStateArgs args,
) {
  final profileAsync = ref.watch(watchPublicProfileProvider(args.uid));
  final viewerProfileAsync = ref.watch(watchUserProfileProvider);
  final viewerProfile = catchAsyncStateFromAsyncValue(viewerProfileAsync).value;
  final blockMutation = ref.watch(PublicProfileController.blockUserMutation);
  final reportMutation = ref.watch(PublicProfileController.reportUserMutation);

  return publicProfileScreenStateFromAsync(
    uid: args.uid,
    profileAsync: profileAsync,
    initialProfile: args.initialProfile,
    viewerProfile: viewerProfile,
    sharedRunTitle: args.sharedRunTitle,
    blockPending: blockMutation.isPending,
    reportPending: reportMutation.isPending,
  );
}

PublicProfileScreenState publicProfileScreenStateFromAsync({
  required String uid,
  required AsyncValue<PublicProfile?> profileAsync,
  required PublicProfile? initialProfile,
  required UserProfile? viewerProfile,
  required String? sharedRunTitle,
  required bool blockPending,
  required bool reportPending,
}) {
  final mutationMode = publicProfileMutationModeFromFlags(
    blockPending: blockPending,
    reportPending: reportPending,
  );

  return switch (profileAsync) {
    AsyncLoading() =>
      initialProfile == null
          ? PublicProfileScreenState(
              uid: uid,
              status: PublicProfileRouteStatus.loading,
              mutationMode: mutationMode,
              viewerProfile: viewerProfile,
              sharedRunTitle: sharedRunTitle,
            )
          : PublicProfileScreenState(
              uid: uid,
              status: PublicProfileRouteStatus.ready,
              profile: initialProfile,
              viewerProfile: viewerProfile,
              mutationMode: mutationMode,
              sharedRunTitle: sharedRunTitle,
              isInitialProfileFallback: true,
            ),
    AsyncError(:final error) => PublicProfileScreenState(
      uid: uid,
      status: PublicProfileRouteStatus.error,
      error: error,
      mutationMode: mutationMode,
      viewerProfile: viewerProfile,
      sharedRunTitle: sharedRunTitle,
      retryIntent: PublicProfileRetryIntent.reloadProfile,
    ),
    AsyncData(:final value) =>
      value == null
          ? PublicProfileScreenState(
              uid: uid,
              status: PublicProfileRouteStatus.unavailable,
              mutationMode: mutationMode,
              viewerProfile: viewerProfile,
              sharedRunTitle: sharedRunTitle,
            )
          : PublicProfileScreenState(
              uid: uid,
              status: PublicProfileRouteStatus.ready,
              profile: value,
              viewerProfile: viewerProfile,
              mutationMode: mutationMode,
              sharedRunTitle: sharedRunTitle,
            ),
  };
}
