import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'my_memberships_view_model.g.dart';

/// My memberships reads only the member's memberships: each carries the
/// savings total the server keeps from its member-priced bookings.
@riverpod
Future<MyMembershipsState> myMembershipsViewModel(Ref ref, String uid) async {
  final memberships = await ref.watch(
    watchMyHostMembershipsProvider(uid).future,
  );
  return MyMembershipsState.from(memberships: memberships);
}
