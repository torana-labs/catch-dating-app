import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_checkout.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_membership_join_controller.g.dart';

/// Starts a membership purchase: the server creates the subscription and the
/// member authorizes the mandate on Razorpay's hosted page. Status arrives
/// from verified provider evidence, so the app only refreshes it.
@riverpod
class HostMembershipJoinController extends _$HostMembershipJoinController {
  static final startMutation = Mutation<HostMembershipCheckout>();
  static final refreshMutation = Mutation<HostMembershipCheckout>();

  @override
  void build() {}

  Future<HostMembershipCheckout> start({
    required String organizerId,
    required String planId,
    required HostMembershipInterval interval,
  }) async {
    final checkout = await ref
        .read(hostMembershipRepositoryProvider)
        .prepareCheckout(
          organizerId: organizerId,
          planId: planId,
          interval: interval,
        );
    final url = checkout.authorizationUrl;
    if (url != null) {
      await ref.read(externalLinkControllerProvider).openExternal(url);
    }
    return checkout;
  }

  Future<HostMembershipCheckout> refresh(String checkoutId) =>
      ref.read(hostMembershipRepositoryProvider).refreshCheckout(checkoutId);

  Future<void> reopen(Uri authorizationUrl) =>
      ref.read(externalLinkControllerProvider).openExternal(authorizationUrl);
}
