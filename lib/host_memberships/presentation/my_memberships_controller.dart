import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'my_memberships_controller.g.dart';

/// Member self-serve pause, resume and cancel-at-period-end.
@riverpod
class MyMembershipsController extends _$MyMembershipsController {
  static final changeMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> change({
    required String membershipId,
    required HostMembershipAction action,
  }) => ref
      .read(hostMembershipRepositoryProvider)
      .manageMembership(membershipId: membershipId, action: action);
}
