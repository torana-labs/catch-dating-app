import 'package:catch_dating_app/contexts/profiles/domain/profile_photo.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_edit_tab_state.dart';

class SelfProfilePhotoIntentFactory {
  const SelfProfilePhotoIntentFactory();

  SelfProfilePhotoEditorRequest editorRequest({
    required SelfProfilePhotoGridState state,
    required int index,
  }) {
    return SelfProfilePhotoEditorRequest(
      index: index,
      photo: index < state.profilePhotos.length
          ? state.profilePhotos[index]
          : null,
      canDelete: state.canDeletePhotos,
    );
  }

  SelfProfilePhotoDeleteIntent deleteIntent(int index) {
    return SelfProfilePhotoDeleteIntent(index: index);
  }

  SelfProfilePhotoReorderIntent reorderIntent({
    required int fromIndex,
    required int toIndex,
  }) {
    return SelfProfilePhotoReorderIntent(
      fromIndex: fromIndex,
      toIndex: toIndex,
    );
  }
}

class SelfProfilePhotoEditorRequest {
  const SelfProfilePhotoEditorRequest({
    required this.index,
    required this.photo,
    required this.canDelete,
  });

  final int index;
  final ProfilePhoto? photo;
  final bool canDelete;
}

class SelfProfilePhotoDeleteIntent {
  const SelfProfilePhotoDeleteIntent({required this.index});

  final int index;
}

class SelfProfilePhotoReorderIntent {
  const SelfProfilePhotoReorderIntent({
    required this.fromIndex,
    required this.toIndex,
  });

  final int fromIndex;
  final int toIndex;
}
