import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'organizer_membership_controller.g.dart';

/// **Pattern A: Action controller + static Mutations**
///
/// Owns follow actions from both the organizer list and detail screens.
/// The UI watches mutation state to show loading spinners and error banners.
@riverpod
class OrganizerMembershipController extends _$OrganizerMembershipController {
  static final joinMutation = Mutation<void>();
  static final leaveMutation = Mutation<void>();
  static final pushNotificationsMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> join(String clubId) async {
    requireSignedInUid(ref, action: 'follow an organizer');
    await ref.read(organizersRepositoryProvider).joinOrganizer(clubId);
  }

  Future<void> leave(String clubId) async {
    requireSignedInUid(ref, action: 'unfollow an organizer');
    await ref.read(organizersRepositoryProvider).leaveOrganizer(clubId);
  }

  Future<void> setPushNotifications({
    required String clubId,
    required bool enabled,
  }) async {
    requireSignedInUid(ref, action: 'update organizer notifications');
    await ref
        .read(organizersRepositoryProvider)
        .setOrganizerPushNotifications(clubId: clubId, enabled: enabled);
  }
}
