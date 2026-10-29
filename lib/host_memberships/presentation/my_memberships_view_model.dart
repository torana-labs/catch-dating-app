import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'my_memberships_view_model.g.dart';

@riverpod
Future<MyMembershipsState> myMembershipsViewModel(Ref ref, String uid) async {
  final memberships = await ref.watch(
    watchMyHostMembershipsProvider(uid).future,
  );
  final benefitUses = await ref.watch(
    watchMyHostMembershipBenefitUsesProvider(uid).future,
  );
  return MyMembershipsState.from(
    memberships: memberships,
    benefitUses: benefitUses,
  );
}
