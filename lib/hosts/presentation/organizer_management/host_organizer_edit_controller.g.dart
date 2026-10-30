// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_organizer_edit_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostOrganizerEditController)
final hostOrganizerEditControllerProvider =
    HostOrganizerEditControllerProvider._();

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
        name: r'hostOrganizerEditControllerProvider',
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
    r'cb7ccd144faf1004afc04caa1f56d4ea5a11db9d';
