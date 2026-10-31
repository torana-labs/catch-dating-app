import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_team_management_controller.g.dart';

@riverpod
class HostTeamManagementController extends _$HostTeamManagementController {
  static final addHostMutation = Mutation<void>();
  static final removeHostMutation = Mutation<void>();
  static final transferOwnershipMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> addHostByPhone({
    required String organizerId,
    required String phoneNumber,
  }) async {
    requireSignedInUid(ref, action: 'add an organizer manager');
    await ref
        .read(organizersRepositoryProvider)
        .addOrganizerHost(organizerId: organizerId, phoneNumber: phoneNumber);
  }

  Future<void> removeHost({required String organizerId, required String uid}) async {
    requireSignedInUid(ref, action: 'remove an organizer manager');
    await ref
        .read(organizersRepositoryProvider)
        .removeOrganizerHost(organizerId: organizerId, uid: uid);
  }

  Future<void> transferOwnership({
    required String organizerId,
    required String uid,
  }) async {
    requireSignedInUid(ref, action: 'transfer organizer ownership');
    await ref
        .read(organizersRepositoryProvider)
        .transferOrganizerOwnership(organizerId: organizerId, uid: uid);
  }
}
