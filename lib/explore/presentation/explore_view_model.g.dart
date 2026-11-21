// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'explore_view_model.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Holds the currently selected city for club browsing. Uses an
/// internal `_userSelected` flag so GPS auto-detection never overrides a
/// manual user pick.
///
/// Session lifetime: the city is browse state shared by the Explore list, map
/// and city controllers across tab switches, and the next account starts from
/// the market default.

@ProviderFor(SelectedExploreCity)
final selectedExploreCityProvider = SelectedExploreCityProvider._();

/// Holds the currently selected city for club browsing. Uses an
/// internal `_userSelected` flag so GPS auto-detection never overrides a
/// manual user pick.
///
/// Session lifetime: the city is browse state shared by the Explore list, map
/// and city controllers across tab switches, and the next account starts from
/// the market default.
final class SelectedExploreCityProvider
    extends $NotifierProvider<SelectedExploreCity, CityData> {
  /// Holds the currently selected city for club browsing. Uses an
  /// internal `_userSelected` flag so GPS auto-detection never overrides a
  /// manual user pick.
  ///
  /// Session lifetime: the city is browse state shared by the Explore list, map
  /// and city controllers across tab switches, and the next account starts from
  /// the market default.
  SelectedExploreCityProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'selectedExploreCityProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$selectedExploreCityHash();

  @$internal
  @override
  SelectedExploreCity create() => SelectedExploreCity();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CityData value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CityData>(value),
    );
  }
}

String _$selectedExploreCityHash() =>
    r'a0c4c2cf1cc5b82a61d5eaa32315458b76db89c6';

/// Holds the currently selected city for club browsing. Uses an
/// internal `_userSelected` flag so GPS auto-detection never overrides a
/// manual user pick.
///
/// Session lifetime: the city is browse state shared by the Explore list, map
/// and city controllers across tab switches, and the next account starts from
/// the market default.

abstract class _$SelectedExploreCity extends $Notifier<CityData> {
  CityData build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<CityData, CityData>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<CityData, CityData>,
              CityData,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

/// Session lifetime: whether the city was picked by hand, which protects that
/// choice from later auto-detection while browsing.

@ProviderFor(SelectedExploreCityWasUserSelected)
final selectedExploreCityWasUserSelectedProvider =
    SelectedExploreCityWasUserSelectedProvider._();

/// Session lifetime: whether the city was picked by hand, which protects that
/// choice from later auto-detection while browsing.
final class SelectedExploreCityWasUserSelectedProvider
    extends $NotifierProvider<SelectedExploreCityWasUserSelected, bool> {
  /// Session lifetime: whether the city was picked by hand, which protects that
  /// choice from later auto-detection while browsing.
  SelectedExploreCityWasUserSelectedProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'selectedExploreCityWasUserSelectedProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$selectedExploreCityWasUserSelectedHash();

  @$internal
  @override
  SelectedExploreCityWasUserSelected create() =>
      SelectedExploreCityWasUserSelected();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }
}

String _$selectedExploreCityWasUserSelectedHash() =>
    r'338ded55253758a9689aedcbc62e7190d7bb23df';

/// Session lifetime: whether the city was picked by hand, which protects that
/// choice from later auto-detection while browsing.

abstract class _$SelectedExploreCityWasUserSelected extends $Notifier<bool> {
  bool build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<bool, bool>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<bool, bool>,
              bool,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

/// Holds the current search query text.
///
/// Session lifetime: the query survives tab switches and Explore route and
/// chrome rebuilds, and the next account starts from an empty search.

@ProviderFor(ExploreSearchQuery)
final exploreSearchQueryProvider = ExploreSearchQueryProvider._();

/// Holds the current search query text.
///
/// Session lifetime: the query survives tab switches and Explore route and
/// chrome rebuilds, and the next account starts from an empty search.
final class ExploreSearchQueryProvider
    extends $NotifierProvider<ExploreSearchQuery, String> {
  /// Holds the current search query text.
  ///
  /// Session lifetime: the query survives tab switches and Explore route and
  /// chrome rebuilds, and the next account starts from an empty search.
  ExploreSearchQueryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'exploreSearchQueryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$exploreSearchQueryHash();

  @$internal
  @override
  ExploreSearchQuery create() => ExploreSearchQuery();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String>(value),
    );
  }
}

String _$exploreSearchQueryHash() =>
    r'88fb0f3df7583acd4310b07981a295c2e8e7c266';

/// Holds the current search query text.
///
/// Session lifetime: the query survives tab switches and Explore route and
/// chrome rebuilds, and the next account starts from an empty search.

abstract class _$ExploreSearchQuery extends $Notifier<String> {
  String build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<String, String>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<String, String>,
              String,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

/// The search query after a short typing pause, trimmed for use as the
/// server-search key.
///
/// Keeps a fast typist from firing one Cloud Function call per keystroke — we
/// issue at most one search per settled phrase. Local substring filtering stays
/// instant because it reads [exploreSearchQueryProvider] directly; only the
/// (networked) server search keys off this debounced value. Short/empty queries
/// settle immediately — a clear shouldn't lag, and [exploreServerSearch] ignores
/// queries under two characters anyway. Longer queries wait out a ~300ms pause;
/// if the query changes again the pending delay is cancelled (via onDispose), so
/// rapid typing collapses to a single server call. Trimming also means a trailing
/// space no longer mints a distinct search key for an otherwise identical query.

@ProviderFor(debouncedExploreSearchQuery)
final debouncedExploreSearchQueryProvider =
    DebouncedExploreSearchQueryProvider._();

/// The search query after a short typing pause, trimmed for use as the
/// server-search key.
///
/// Keeps a fast typist from firing one Cloud Function call per keystroke — we
/// issue at most one search per settled phrase. Local substring filtering stays
/// instant because it reads [exploreSearchQueryProvider] directly; only the
/// (networked) server search keys off this debounced value. Short/empty queries
/// settle immediately — a clear shouldn't lag, and [exploreServerSearch] ignores
/// queries under two characters anyway. Longer queries wait out a ~300ms pause;
/// if the query changes again the pending delay is cancelled (via onDispose), so
/// rapid typing collapses to a single server call. Trimming also means a trailing
/// space no longer mints a distinct search key for an otherwise identical query.

final class DebouncedExploreSearchQueryProvider
    extends $FunctionalProvider<AsyncValue<String>, String, FutureOr<String>>
    with $FutureModifier<String>, $FutureProvider<String> {
  /// The search query after a short typing pause, trimmed for use as the
  /// server-search key.
  ///
  /// Keeps a fast typist from firing one Cloud Function call per keystroke — we
  /// issue at most one search per settled phrase. Local substring filtering stays
  /// instant because it reads [exploreSearchQueryProvider] directly; only the
  /// (networked) server search keys off this debounced value. Short/empty queries
  /// settle immediately — a clear shouldn't lag, and [exploreServerSearch] ignores
  /// queries under two characters anyway. Longer queries wait out a ~300ms pause;
  /// if the query changes again the pending delay is cancelled (via onDispose), so
  /// rapid typing collapses to a single server call. Trimming also means a trailing
  /// space no longer mints a distinct search key for an otherwise identical query.
  DebouncedExploreSearchQueryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'debouncedExploreSearchQueryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$debouncedExploreSearchQueryHash();

  @$internal
  @override
  $FutureProviderElement<String> $createElement($ProviderPointer pointer) =>
      $FutureProviderElement(pointer);

  @override
  FutureOr<String> create(Ref ref) {
    return debouncedExploreSearchQuery(ref);
  }
}

String _$debouncedExploreSearchQueryHash() =>
    r'0be4e553c01c500a1440750e22e28e250d3b37d3';

/// Session lifetime: filters are browse state shared by the Explore list, map
/// and feed view models, and the next account starts from the defaults.

@ProviderFor(ExploreFilters)
final exploreFiltersProvider = ExploreFiltersProvider._();

/// Session lifetime: filters are browse state shared by the Explore list, map
/// and feed view models, and the next account starts from the defaults.
final class ExploreFiltersProvider
    extends $NotifierProvider<ExploreFilters, ExploreFilterSelection> {
  /// Session lifetime: filters are browse state shared by the Explore list, map
  /// and feed view models, and the next account starts from the defaults.
  ExploreFiltersProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'exploreFiltersProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$exploreFiltersHash();

  @$internal
  @override
  ExploreFilters create() => ExploreFilters();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ExploreFilterSelection value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ExploreFilterSelection>(value),
    );
  }
}

String _$exploreFiltersHash() => r'67382fa2afd68ea58db857b0756950d033516a82';

/// Session lifetime: filters are browse state shared by the Explore list, map
/// and feed view models, and the next account starts from the defaults.

abstract class _$ExploreFilters extends $Notifier<ExploreFilterSelection> {
  ExploreFilterSelection build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<ExploreFilterSelection, ExploreFilterSelection>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ExploreFilterSelection, ExploreFilterSelection>,
              ExploreFilterSelection,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}

/// Algolia swap point: replace this provider's body to use a remote search
/// index. The VM and screen are not affected.
///
/// **Pattern D variant:** Combines location-filtered clubs with client-side
/// search to produce a filtered list for the UI.

@ProviderFor(exploreSourceOrganizers)
final exploreSourceOrganizersProvider = ExploreSourceOrganizersProvider._();

/// Algolia swap point: replace this provider's body to use a remote search
/// index. The VM and screen are not affected.
///
/// **Pattern D variant:** Combines location-filtered clubs with client-side
/// search to produce a filtered list for the UI.

final class ExploreSourceOrganizersProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Organizer>>,
          AsyncValue<List<Organizer>>,
          AsyncValue<List<Organizer>>
        >
    with $Provider<AsyncValue<List<Organizer>>> {
  /// Algolia swap point: replace this provider's body to use a remote search
  /// index. The VM and screen are not affected.
  ///
  /// **Pattern D variant:** Combines location-filtered clubs with client-side
  /// search to produce a filtered list for the UI.
  ExploreSourceOrganizersProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'exploreSourceOrganizersProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$exploreSourceOrganizersHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<List<Organizer>>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<List<Organizer>> create(Ref ref) {
    return exploreSourceOrganizers(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<List<Organizer>> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<List<Organizer>>>(value),
    );
  }
}

String _$exploreSourceOrganizersHash() =>
    r'd30047b8829dcb69f7a4a8db2459c56c99b39dfc';

@ProviderFor(filteredExploreOrganizers)
final filteredExploreOrganizersProvider = FilteredExploreOrganizersProvider._();

final class FilteredExploreOrganizersProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Organizer>>,
          AsyncValue<List<Organizer>>,
          AsyncValue<List<Organizer>>
        >
    with $Provider<AsyncValue<List<Organizer>>> {
  FilteredExploreOrganizersProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'filteredExploreOrganizersProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$filteredExploreOrganizersHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<List<Organizer>>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<List<Organizer>> create(Ref ref) {
    return filteredExploreOrganizers(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<List<Organizer>> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<List<Organizer>>>(value),
    );
  }
}

String _$filteredExploreOrganizersHash() =>
    r'211d732c4ca60c6c2a649817de818f0b2c57ce30';

/// **Pattern D: View-model provider**
///
/// Combines the signed-in user, membership edges, and filtered club streams into
/// a
/// [ExploreViewModel] that partitions clubs into joined and discover
/// lists for the UI.

@ProviderFor(exploreOrganizersViewModel)
final exploreOrganizersViewModelProvider =
    ExploreOrganizersViewModelProvider._();

/// **Pattern D: View-model provider**
///
/// Combines the signed-in user, membership edges, and filtered club streams into
/// a
/// [ExploreViewModel] that partitions clubs into joined and discover
/// lists for the UI.

final class ExploreOrganizersViewModelProvider
    extends
        $FunctionalProvider<
          AsyncValue<ExploreViewModel>,
          AsyncValue<ExploreViewModel>,
          AsyncValue<ExploreViewModel>
        >
    with $Provider<AsyncValue<ExploreViewModel>> {
  /// **Pattern D: View-model provider**
  ///
  /// Combines the signed-in user, membership edges, and filtered club streams into
  /// a
  /// [ExploreViewModel] that partitions clubs into joined and discover
  /// lists for the UI.
  ExploreOrganizersViewModelProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'exploreOrganizersViewModelProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$exploreOrganizersViewModelHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<ExploreViewModel>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<ExploreViewModel> create(Ref ref) {
    return exploreOrganizersViewModel(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<ExploreViewModel> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<ExploreViewModel>>(value),
    );
  }
}

String _$exploreOrganizersViewModelHash() =>
    r'fe28df1691c475781086a584bc679b2d7a99444a';
