// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_organizer_bills_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostOrganizerBillsController)
final hostOrganizerBillsControllerProvider =
    HostOrganizerBillsControllerProvider._();

final class HostOrganizerBillsControllerProvider
    extends
        $FunctionalProvider<
          HostOrganizerBillsController,
          HostOrganizerBillsController,
          HostOrganizerBillsController
        >
    with $Provider<HostOrganizerBillsController> {
  HostOrganizerBillsControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostOrganizerBillsControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostOrganizerBillsControllerHash();

  @$internal
  @override
  $ProviderElement<HostOrganizerBillsController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostOrganizerBillsController create(Ref ref) {
    return hostOrganizerBillsController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostOrganizerBillsController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostOrganizerBillsController>(value),
    );
  }
}

String _$hostOrganizerBillsControllerHash() =>
    r'5f871465e425f017168600d18263b3fac3c3cc54';
