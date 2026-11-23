// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'router_frame.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(initialAppLocation)
final initialAppLocationProvider = InitialAppLocationProvider._();

final class InitialAppLocationProvider
    extends $FunctionalProvider<String, String, String>
    with $Provider<String> {
  InitialAppLocationProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'initialAppLocationProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$initialAppLocationHash();

  @$internal
  @override
  $ProviderElement<String> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  String create(Ref ref) {
    return initialAppLocation(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String>(value),
    );
  }
}

String _$initialAppLocationHash() =>
    r'ab5cec714541abbbe7d7987f4ea6a5d4479e34e5';
