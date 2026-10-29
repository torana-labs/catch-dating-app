import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_upload_controller.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/user_profile/presentation/profile_edit_controller.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_screen_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'self_profile_screen_state_provider.g.dart';

@riverpod
SelfProfileScreenState selfProfileScreenState(Ref ref) {
  final profileAsync = ref.watch(watchUserProfileProvider);
  final uploadState = ref.watch(photoUploadControllerProvider);
  final uploadMutation = ref.watch(PhotoUploadController.uploadPhotoMutation);
  final saveMutation = ref.watch(ProfileEditController.saveFieldsMutation);

  return SelfProfileScreenState.fromAsync(
    profileState: _catchAsyncState(profileAsync),
    today: DateTime.now(),
    uploadState: uploadState,
    uploadMutationPending: uploadMutation.isPending,
    saveMutationPending: saveMutation.isPending,
  );
}

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return catchAsyncStateFromAsyncValue(value);
}
