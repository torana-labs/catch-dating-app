import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'public_profile_controller.g.dart';

/// **Pattern A: Action controller + static Mutations**
///
/// Handles block and report actions from the public profile screen.
/// The UI wraps calls in `mutation.run(ref, ...)` to observe lifecycle.
@riverpod
class PublicProfileController extends _$PublicProfileController {
  static final blockUserMutation = Mutation<void>();
  static final reportUserMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> blockUser({required String targetUserId}) async {
    await ref
        .read(safetyRepositoryProvider)
        .blockUser(targetUserId: targetUserId);
  }

  Future<void> reportUser({
    required String targetUserId,
    required String reasonCode,
  }) async {
    await ref
        .read(safetyRepositoryProvider)
        .reportUser(targetUserId: targetUserId, reasonCode: reasonCode);
  }
}
