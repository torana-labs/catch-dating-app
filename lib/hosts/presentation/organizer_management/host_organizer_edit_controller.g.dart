// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_organizer_edit_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostOrganizerEditController)
final hostOrganizerEditControllerProvider = HostOrganizerEditControllerProvider._();

final class HostOrganizerEditControllerProvider
    extends
        $FunctionalProvider<
          HostOrganizerEditActions,
          HostOrganizerEditActions,
          HostOrganizerEditActions
        >
    with $Provider<HostOrganizerEditActions> {
  HostOrganizerEditControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostClubEditControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostOrganizerEditControllerHash();

  @$internal
  @override
  $ProviderElement<HostOrganizerEditActions> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostOrganizerEditActions create(Ref ref) {
    return hostOrganizerEditController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostOrganizerEditActions value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostOrganizerEditActions>(value),
    );
  }
}

String _$hostOrganizerEditControllerHash() =>
    r'83e16b57a3a0368a9f97b48a75b656199e45b140';
