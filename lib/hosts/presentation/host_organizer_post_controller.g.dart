// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_organizer_post_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostOrganizerPostController)
final hostOrganizerPostControllerProvider =
    HostOrganizerPostControllerProvider._();

final class HostOrganizerPostControllerProvider
    extends
        $FunctionalProvider<
          HostOrganizerPostController,
          HostOrganizerPostController,
          HostOrganizerPostController
        >
    with $Provider<HostOrganizerPostController> {
  HostOrganizerPostControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostOrganizerPostControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostOrganizerPostControllerHash();

  @$internal
  @override
  $ProviderElement<HostOrganizerPostController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostOrganizerPostController create(Ref ref) {
    return hostOrganizerPostController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostOrganizerPostController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostOrganizerPostController>(value),
    );
  }
}

String _$hostOrganizerPostControllerHash() =>
    r'8467fe3324dd1c1e1c694cb4cc85aabff5c2d25d';
