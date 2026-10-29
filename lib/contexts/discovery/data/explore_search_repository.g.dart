// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'explore_search_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(exploreSearchRepository)
final exploreSearchRepositoryProvider = ExploreSearchRepositoryProvider._();

final class ExploreSearchRepositoryProvider
    extends
        $FunctionalProvider<
          ExploreSearchRepository,
          ExploreSearchRepository,
          ExploreSearchRepository
        >
    with $Provider<ExploreSearchRepository> {
  ExploreSearchRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'exploreSearchRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$exploreSearchRepositoryHash();

  @$internal
  @override
  $ProviderElement<ExploreSearchRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ExploreSearchRepository create(Ref ref) {
    return exploreSearchRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExploreSearchRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExploreSearchRepository>(value),
    );
  }
}

String _$exploreSearchRepositoryHash() =>
    r'1dc66d8b884e59cb6e3ed826c0ea4b35c5460ff7';

@ProviderFor(exploreServerSearch)
final exploreServerSearchProvider = ExploreServerSearchFamily._();

final class ExploreServerSearchProvider
    extends
        $FunctionalProvider<
          AsyncValue<ExploreSearchResult?>,
          ExploreSearchResult?,
          FutureOr<ExploreSearchResult?>
        >
    with
        $FutureModifier<ExploreSearchResult?>,
        $FutureProvider<ExploreSearchResult?> {
  ExploreServerSearchProvider._({
    required ExploreServerSearchFamily super.from,
    required ({String query, String cityName}) super.argument,
  }) : super(
         retry: null,
         name: r'exploreServerSearchProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$exploreServerSearchHash();

  @override
  String toString() {
    return r'exploreServerSearchProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ExploreSearchResult?> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ExploreSearchResult?> create(Ref ref) {
    final argument = this.argument as ({String query, String cityName});
    return exploreServerSearch(
      ref,
      query: argument.query,
      cityName: argument.cityName,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is ExploreServerSearchProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$exploreServerSearchHash() =>
    r'dd396053d3599d7e0c053bcc4501e5eee280b611';

final class ExploreServerSearchFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ExploreSearchResult?>,
          ({String query, String cityName})
        > {
  ExploreServerSearchFamily._()
    : super(
        retry: null,
        name: r'exploreServerSearchProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ExploreServerSearchProvider call({
    required String query,
    required String cityName,
  }) => ExploreServerSearchProvider._(
    argument: (query: query, cityName: cityName),
    from: this,
  );

  @override
  String toString() => r'exploreServerSearchProvider';
}
