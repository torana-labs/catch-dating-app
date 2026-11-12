// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'live_brand.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The brand values to use, read once from config/brand (Firestore serves its
/// offline cache when the network is slow) and kept for the session. Nothing
/// reads this at startup: a store link awaits it when tapped, and any failure
/// or a slow read falls back to the generated values.
// keepalive: account-free: one read of a public config document, shared by
// every screen that links to a store.

@ProviderFor(liveBrand)
final liveBrandProvider = LiveBrandProvider._();

/// The brand values to use, read once from config/brand (Firestore serves its
/// offline cache when the network is slow) and kept for the session. Nothing
/// reads this at startup: a store link awaits it when tapped, and any failure
/// or a slow read falls back to the generated values.
// keepalive: account-free: one read of a public config document, shared by
// every screen that links to a store.

final class LiveBrandProvider
    extends
        $FunctionalProvider<
          AsyncValue<LiveBrand>,
          LiveBrand,
          FutureOr<LiveBrand>
        >
    with $FutureModifier<LiveBrand>, $FutureProvider<LiveBrand> {
  /// The brand values to use, read once from config/brand (Firestore serves its
  /// offline cache when the network is slow) and kept for the session. Nothing
  /// reads this at startup: a store link awaits it when tapped, and any failure
  /// or a slow read falls back to the generated values.
  // keepalive: account-free: one read of a public config document, shared by
  // every screen that links to a store.
  LiveBrandProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'liveBrandProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$liveBrandHash();

  @$internal
  @override
  $FutureProviderElement<LiveBrand> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<LiveBrand> create(Ref ref) {
    return liveBrand(ref);
  }
}

String _$liveBrandHash() => r'cf799bbdc51750751acab0c7bf6ac3737d1d762b';
