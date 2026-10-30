import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_fields.dart';

enum HostMembershipCheckoutState {
  creating,
  open,
  authorized,
  expired,
  failed;

  static HostMembershipCheckoutState fromWire(String value) =>
      membershipEnum(values, value, (state) => state.name);
}

/// Progress of one subscription purchase from `manageHostMembershipCheckout`.
class HostMembershipCheckout {
  const HostMembershipCheckout({
    required this.checkoutId,
    required this.state,
    required this.authorizationUrl,
    required this.expiresAt,
    required this.membershipId,
    required this.membershipStatus,
  });

  factory HostMembershipCheckout.fromResponse(Object? data) {
    final map = membershipMap(data, 'membership checkout');
    final url = membershipNullableString(map, 'authorizationUrl');
    final status = membershipNullableString(map, 'membershipStatus');
    return HostMembershipCheckout(
      checkoutId: membershipString(map, 'checkoutId'),
      state: HostMembershipCheckoutState.fromWire(
        membershipString(map, 'state'),
      ),
      authorizationUrl: url == null ? null : Uri.parse(url),
      expiresAt: membershipDateTime(map, 'expiresAtMillis')!,
      membershipId: membershipNullableString(map, 'membershipId'),
      membershipStatus: status == null
          ? null
          : HostMembershipStatus.fromWire(status),
    );
  }

  final String checkoutId;
  final HostMembershipCheckoutState state;
  final Uri? authorizationUrl;
  final DateTime expiresAt;
  final String? membershipId;
  final HostMembershipStatus? membershipStatus;

  bool get isComplete =>
      state == HostMembershipCheckoutState.authorized && membershipId != null;
}
