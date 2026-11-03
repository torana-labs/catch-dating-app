// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'city_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// List of supported cities, fetched once and cached for the app lifetime.
///
/// Returns the Firestore-backed list or the 9 hardcoded defaults.
// keepalive: city repository backs global city selection and should remain a
// single cached Firestore facade.

@ProviderFor(cityRepository)
final cityRepositoryProvider = CityRepositoryProvider._();

/// List of supported cities, fetched once and cached for the app lifetime.
///
/// Returns the Firestore-backed list or the 9 hardcoded defaults.
// keepalive: city repository backs global city selection and should remain a
// single cached Firestore facade.

final class CityRepositoryProvider
    extends $FunctionalProvider<CityRepository, CityRepository, CityRepository>
    with $Provider<CityRepository> {
  /// List of supported cities, fetched once and cached for the app lifetime.
  ///
  /// Returns the Firestore-backed list or the 9 hardcoded defaults.
  // keepalive: city repository backs global city selection and should remain a
  // single cached Firestore facade.
  CityRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'cityRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$cityRepositoryHash();

  @$internal
  @override
  $ProviderElement<CityRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  CityRepository create(Ref ref) {
    return cityRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CityRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CityRepository>(value),
    );
  }
}

String _$cityRepositoryHash() => r'f662f86f2ef5af3a842d2250311c6d9a7dfbb81f';

@ProviderFor(cityList)
final cityListProvider = CityListProvider._();

final class CityListProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<CityData>>,
          List<CityData>,
          FutureOr<List<CityData>>
        >
    with $FutureModifier<List<CityData>>, $FutureProvider<List<CityData>> {
  CityListProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'cityListProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$cityListHash();

  @$internal
  @override
  $FutureProviderElement<List<CityData>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<CityData>> create(Ref ref) {
    return cityList(ref);
  }
}

String _$cityListHash() => r'610f2d4ed3cb64b54e7d0dcf8f518e65701af966';
