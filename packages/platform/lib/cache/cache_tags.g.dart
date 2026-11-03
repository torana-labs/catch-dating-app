// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cache_tags.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(cacheTags)
final cacheTagsProvider = CacheTagsProvider._();

final class CacheTagsProvider
    extends
        $FunctionalProvider<
          CacheTagRegistry,
          CacheTagRegistry,
          CacheTagRegistry
        >
    with $Provider<CacheTagRegistry> {
  CacheTagsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'cacheTagsProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$cacheTagsHash();

  @$internal
  @override
  $ProviderElement<CacheTagRegistry> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  CacheTagRegistry create(Ref ref) {
    return cacheTags(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CacheTagRegistry value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CacheTagRegistry>(value),
    );
  }
}

String _$cacheTagsHash() => r'b854f979191b0ba398a70f8ac850fda6f03dda7a';
