// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_audience_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostAudienceController)
final hostAudienceControllerProvider = HostAudienceControllerProvider._();

final class HostAudienceControllerProvider
    extends
        $FunctionalProvider<
          HostAudienceController,
          HostAudienceController,
          HostAudienceController
        >
    with $Provider<HostAudienceController> {
  HostAudienceControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostAudienceControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostAudienceControllerHash();

  @$internal
  @override
  $ProviderElement<HostAudienceController> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostAudienceController create(Ref ref) {
    return hostAudienceController(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostAudienceController value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostAudienceController>(value),
    );
  }
}

String _$hostAudienceControllerHash() =>
    r'db474e2f6a8d68c9db86880702195ab9917f98d8';
