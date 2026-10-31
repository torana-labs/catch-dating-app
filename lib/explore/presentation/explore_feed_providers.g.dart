// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'explore_feed_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Shared wall-clock snapshot for one mounted Explore surface.
///
/// Keeping the query window and date-strip labels on the same provider avoids
/// midnight drift and gives capture/tests one explicit deterministic seam.

@ProviderFor(exploreDiscoveryReferenceNow)
final exploreDiscoveryReferenceNowProvider =
    ExploreDiscoveryReferenceNowProvider._();

/// Shared wall-clock snapshot for one mounted Explore surface.
///
/// Keeping the query window and date-strip labels on the same provider avoids
/// midnight drift and gives capture/tests one explicit deterministic seam.

final class ExploreDiscoveryReferenceNowProvider
    extends $FunctionalProvider<DateTime, DateTime, DateTime>
    with $Provider<DateTime> {
  /// Shared wall-clock snapshot for one mounted Explore surface.
  ///
  /// Keeping the query window and date-strip labels on the same provider avoids
  /// midnight drift and gives capture/tests one explicit deterministic seam.
  ExploreDiscoveryReferenceNowProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'exploreDiscoveryReferenceNowProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$exploreDiscoveryReferenceNowHash();

  @$internal
  @override
  $ProviderElement<DateTime> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  DateTime create(Ref ref) {
    return exploreDiscoveryReferenceNow(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DateTime value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DateTime>(value),
    );
  }
}

String _$exploreDiscoveryReferenceNowHash() =>
    r'a1729036b2bf1839fc9346fabae727c629c54e4f';

@ProviderFor(exploreViewerCohortId)
final exploreViewerCohortIdProvider = ExploreViewerCohortIdProvider._();

final class ExploreViewerCohortIdProvider
    extends
        $FunctionalProvider<
          AsyncValue<String?>,
          AsyncValue<String?>,
          AsyncValue<String?>
        >
    with $Provider<AsyncValue<String?>> {
  ExploreViewerCohortIdProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'exploreViewerCohortIdProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$exploreViewerCohortIdHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<String?>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<String?> create(Ref ref) {
    return exploreViewerCohortId(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<String?> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<String?>>(value),
    );
  }
}

String _$exploreViewerCohortIdHash() =>
    r'64043ba379df476dc5d53ecb74fa738f3fa29a17';

@ProviderFor(exploreFeedViewModel)
final exploreFeedViewModelProvider = ExploreFeedViewModelProvider._();

final class ExploreFeedViewModelProvider
    extends
        $FunctionalProvider<
          AsyncValue<ExploreFeedViewModel>,
          AsyncValue<ExploreFeedViewModel>,
          AsyncValue<ExploreFeedViewModel>
        >
    with $Provider<AsyncValue<ExploreFeedViewModel>> {
  ExploreFeedViewModelProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'exploreFeedViewModelProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$exploreFeedViewModelHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<ExploreFeedViewModel>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<ExploreFeedViewModel> create(Ref ref) {
    return exploreFeedViewModel(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<ExploreFeedViewModel> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<ExploreFeedViewModel>>(
        value,
      ),
    );
  }
}

String _$exploreFeedViewModelHash() =>
    r'bf86086bd02282eaea59ad32c866bf995cd21121';

@ProviderFor(exploreRecommendations)
final exploreRecommendationsProvider = ExploreRecommendationsProvider._();

final class ExploreRecommendationsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ExploreEventRecommendation>>,
          AsyncValue<List<ExploreEventRecommendation>>,
          AsyncValue<List<ExploreEventRecommendation>>
        >
    with $Provider<AsyncValue<List<ExploreEventRecommendation>>> {
  ExploreRecommendationsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'exploreRecommendationsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$exploreRecommendationsHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<List<ExploreEventRecommendation>>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<List<ExploreEventRecommendation>> create(Ref ref) {
    return exploreRecommendations(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(
    AsyncValue<List<ExploreEventRecommendation>> value,
  ) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<List<ExploreEventRecommendation>>>(
            value,
          ),
    );
  }
}

String _$exploreRecommendationsHash() =>
    r'bd1d80fc17668665e6726a9fbe6a3db894a5318a';
