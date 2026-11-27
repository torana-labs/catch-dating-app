// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'private_event_media_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(privateEventMediaService)
final privateEventMediaServiceProvider = PrivateEventMediaServiceProvider._();

final class PrivateEventMediaServiceProvider
    extends
        $FunctionalProvider<
          PrivateEventMediaService,
          PrivateEventMediaService,
          PrivateEventMediaService
        >
    with $Provider<PrivateEventMediaService> {
  PrivateEventMediaServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'privateEventMediaServiceProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$privateEventMediaServiceHash();

  @$internal
  @override
  $ProviderElement<PrivateEventMediaService> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PrivateEventMediaService create(Ref ref) {
    return privateEventMediaService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PrivateEventMediaService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PrivateEventMediaService>(value),
    );
  }
}

String _$privateEventMediaServiceHash() =>
    r'85fad90996af28c3dbab4cb796eefe7fb737e0c3';
