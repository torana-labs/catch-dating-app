// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'city_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(cityRepository)
final cityRepositoryProvider = CityRepositoryProvider._();

final class CityRepositoryProvider
    extends $FunctionalProvider<CityRepository, CityRepository, CityRepository>
    with $Provider<CityRepository> {
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

String _$cityRepositoryHash() => r'74aa633053874ad70768d83e4c917fe835b6a308';

/// List of supported cities, fetched once and cached for the app lifetime.
///
/// Returns the Firestore-backed list or the launched defaults.
// keepalive: account-free: the city list is app-wide discovery configuration
// reused by Explore, onboarding and profile flows.

@ProviderFor(cityList)
final cityListProvider = CityListProvider._();

/// List of supported cities, fetched once and cached for the app lifetime.
///
/// Returns the Firestore-backed list or the launched defaults.
// keepalive: account-free: the city list is app-wide discovery configuration
// reused by Explore, onboarding and profile flows.

final class CityListProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<CityData>>,
          List<CityData>,
          FutureOr<List<CityData>>
        >
    with $FutureModifier<List<CityData>>, $FutureProvider<List<CityData>> {
  /// List of supported cities, fetched once and cached for the app lifetime.
  ///
  /// Returns the Firestore-backed list or the launched defaults.
  // keepalive: account-free: the city list is app-wide discovery configuration
  // reused by Explore, onboarding and profile flows.
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
