// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_membership_join_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Starts a membership purchase: the server creates the subscription and the
/// member authorizes the mandate on Razorpay's hosted page. Status arrives
/// from verified provider evidence, so the app only refreshes it.

@ProviderFor(HostMembershipJoinController)
final hostMembershipJoinControllerProvider =
    HostMembershipJoinControllerProvider._();

/// Starts a membership purchase: the server creates the subscription and the
/// member authorizes the mandate on Razorpay's hosted page. Status arrives
/// from verified provider evidence, so the app only refreshes it.
final class HostMembershipJoinControllerProvider
    extends $NotifierProvider<HostMembershipJoinController, void> {
  /// Starts a membership purchase: the server creates the subscription and the
  /// member authorizes the mandate on Razorpay's hosted page. Status arrives
  /// from verified provider evidence, so the app only refreshes it.
  HostMembershipJoinControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostMembershipJoinControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostMembershipJoinControllerHash();

  @$internal
  @override
  HostMembershipJoinController create() => HostMembershipJoinController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostMembershipJoinControllerHash() =>
    r'aaa77df20b3bf13d50cfb1004da6cfa1633bde95';

/// Starts a membership purchase: the server creates the subscription and the
/// member authorizes the mandate on Razorpay's hosted page. Status arrives
/// from verified provider evidence, so the app only refreshes it.

abstract class _$HostMembershipJoinController extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
