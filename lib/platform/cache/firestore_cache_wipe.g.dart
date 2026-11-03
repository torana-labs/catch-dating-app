// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'firestore_cache_wipe.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(firestoreCacheWipe)
final firestoreCacheWipeProvider = FirestoreCacheWipeProvider._();

final class FirestoreCacheWipeProvider
    extends
        $FunctionalProvider<
          FirestoreCacheWipe,
          FirestoreCacheWipe,
          FirestoreCacheWipe
        >
    with $Provider<FirestoreCacheWipe> {
  FirestoreCacheWipeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'firestoreCacheWipeProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$firestoreCacheWipeHash();

  @$internal
  @override
  $ProviderElement<FirestoreCacheWipe> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  FirestoreCacheWipe create(Ref ref) {
    return firestoreCacheWipe(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(FirestoreCacheWipe value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<FirestoreCacheWipe>(value),
    );
  }
}

String _$firestoreCacheWipeHash() =>
    r'5db8fec4b6dcda2049a9668d4cdf40c183ffb573';
