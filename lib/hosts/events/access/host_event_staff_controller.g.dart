// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_staff_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostEventStaffController)
final hostEventStaffControllerProvider = HostEventStaffControllerProvider._();

final class HostEventStaffControllerProvider
    extends
        $FunctionalProvider<
          HostEventStaffController,
          HostEventStaffController,
          HostEventStaffController
        >
    with $Provider<HostEventStaffController> {
  HostEventStaffControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventStaffControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventStaffControllerHash();

  @$internal
  @override
  $ProviderElement<HostEventStaffController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventStaffController create(Ref ref) {
    return hostEventStaffController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventStaffController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventStaffController>(value),
    );
  }
}

String _$hostEventStaffControllerHash() =>
    r'145473acf25c6aac6e1899b6f9abf64a95f87b5f';
