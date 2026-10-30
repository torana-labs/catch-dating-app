import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_search_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/explore/presentation/explore_filter_logic.dart';
import 'package:catch_dating_app/kernel/city_catalog.dart';
import 'package:catch_dating_app/kernel/city_data.dart';
import 'package:catch_dating_app/kernel/sentinels.dart';
import 'package:catch_dating_app/platform/device/device_location.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'explore_view_model.freezed.dart';
part 'explore_view_model.g.dart';

enum ExploreTimeFilter {
  anytime,
  tonight,
  tomorrow,
  dayTwo,
  dayThree,
  dayFour,
  dayFive,
  daySix,

  // Compatibility values retained until the owner-gated W6/catalog pass can
  // remove the legacy weekly stories and public symbols together.
  weekend,
  thisWeek,
}

const displayedExploreDateFilters = <ExploreTimeFilter>[
  ExploreTimeFilter.tonight,
  ExploreTimeFilter.tomorrow,
  ExploreTimeFilter.dayTwo,
  ExploreTimeFilter.dayThree,
  ExploreTimeFilter.dayFour,
  ExploreTimeFilter.dayFive,
  ExploreTimeFilter.daySix,
  ExploreTimeFilter.anytime,
];

bool isExploreDateStripFilter(ExploreTimeFilter filter) =>
    displayedExploreDateFilters.contains(filter);

enum ExploreDistanceFilter { any, oneKm, threeKm, fiveKm, tenKm }

double? exploreDistanceFilterKm(ExploreDistanceFilter filter) {
  return switch (filter) {
    ExploreDistanceFilter.any => null,
    ExploreDistanceFilter.oneKm => 1,
    ExploreDistanceFilter.threeKm => 3,
    ExploreDistanceFilter.fiveKm => 5,
    ExploreDistanceFilter.tenKm => 10,
  };
}

class ExploreTimeWindow {
  const ExploreTimeWindow({required this.start, required this.end});

  final DateTime start;
  final DateTime end;

  bool contains(DateTime value) {
    return !value.isBefore(start) && value.isBefore(end);
  }
}

ExploreTimeWindow? exploreTimeWindowFor(
  ExploreTimeFilter filter,
  DateTime now,
) {
  switch (filter) {
    case ExploreTimeFilter.anytime:
      return null;
    case ExploreTimeFilter.tonight:
      final today = _startOfDay(now);
      final baseDay = now.hour < 3
          ? today.subtract(const Duration(days: 1))
          : today;
      return ExploreTimeWindow(
        start: baseDay.add(const Duration(hours: 18)),
        end: baseDay.add(const Duration(days: 1, hours: 3)),
      );
    case ExploreTimeFilter.tomorrow:
      return _exploreDayWindow(now, 1);
    case ExploreTimeFilter.dayTwo:
      return _exploreDayWindow(now, 2);
    case ExploreTimeFilter.dayThree:
      return _exploreDayWindow(now, 3);
    case ExploreTimeFilter.dayFour:
      return _exploreDayWindow(now, 4);
    case ExploreTimeFilter.dayFive:
      return _exploreDayWindow(now, 5);
    case ExploreTimeFilter.daySix:
      return _exploreDayWindow(now, 6);
    case ExploreTimeFilter.weekend:
      final today = _startOfDay(now);
      final daysFromFriday = now.weekday - DateTime.friday;
      final start = now.weekday >= DateTime.friday
          ? today.subtract(Duration(days: daysFromFriday))
          : today.add(Duration(days: DateTime.friday - now.weekday));
      return ExploreTimeWindow(
        start: start,
        end: start.add(const Duration(days: 3)),
      );
    case ExploreTimeFilter.thisWeek:
      return ExploreTimeWindow(
        start: now,
        end: now.add(const Duration(days: 7)),
      );
  }
}

ExploreTimeWindow _exploreDayWindow(DateTime now, int dayOffset) {
  final start = _startOfDay(now).add(Duration(days: dayOffset, hours: 3));
  return ExploreTimeWindow(
    start: start,
    end: start.add(const Duration(days: 1)),
  );
}

/// One shared query window backs every visible date-strip selection.
///
/// Changing days then reuses the same cached discovery page and only changes
/// the in-memory day predicate. The 03:00 boundary keeps late-night events in
/// "Tonight" without double-counting them in the following date.
ExploreTimeWindow exploreDateStripQueryWindow(DateTime now) {
  return ExploreTimeWindow(start: now, end: _exploreDayWindow(now, 6).end);
}

/// Highest-intent cold-load scope. The date strip exposes the following six
/// days and Anytime beside it, so users can widen without opening a sheet.
const ExploreTimeFilter defaultExploreTimeFilter = ExploreTimeFilter.tonight;

class ExploreFilterSelection {
  const ExploreFilterSelection({
    ExploreTimeFilter? timeFilter,
    bool thisWeekOnly = false,
    this.distanceFilter = ExploreDistanceFilter.any,
    this.highRatedOnly = false,
    this.joinedOnly = false,
    this.activityTag,
    this.area,
  }) : timeFilter =
           timeFilter ??
           (thisWeekOnly
               ? ExploreTimeFilter.thisWeek
               : defaultExploreTimeFilter);

  final ExploreTimeFilter timeFilter;
  final ExploreDistanceFilter distanceFilter;
  final bool highRatedOnly;
  final bool joinedOnly;
  final String? activityTag;
  final String? area;

  bool get thisWeekOnly => timeFilter == ExploreTimeFilter.thisWeek;

  /// True when the user has narrowed scope vs the cold-load default. Used to
  /// decide whether to show the "Clear" affordance — the default time filter
  /// is intentionally pre-selected on first load so the chip row reads as
  /// active, but that doesn't count as a user-applied filter.
  bool get hasActiveFilters =>
      timeFilter != defaultExploreTimeFilter ||
      distanceFilter != ExploreDistanceFilter.any ||
      highRatedOnly ||
      joinedOnly ||
      activityTag != null ||
      area != null;

  /// Active filters that actually narrow the **club** list. Distance is
  /// excluded on purpose: clubs carry no coordinates, so distance only narrows
  /// the events feed. Including it here would make a distance-only selection
  /// silently start applying the time window to the club list (and rebuild it)
  /// while doing nothing for distance.
  bool get hasActiveOrganizerFilters =>
      timeFilter != defaultExploreTimeFilter ||
      highRatedOnly ||
      joinedOnly ||
      activityTag != null ||
      area != null;

  ExploreFilterSelection copyWith({
    Object? timeFilter = unsetSentinel,
    Object? distanceFilter = unsetSentinel,
    bool? thisWeekOnly,
    bool? highRatedOnly,
    bool? joinedOnly,
    Object? activityTag = unsetSentinel,
    Object? area = unsetSentinel,
  }) {
    final nextTimeFilter = identical(timeFilter, unsetSentinel)
        ? _copyWithTimeFilter(this.timeFilter, thisWeekOnly)
        : timeFilter as ExploreTimeFilter;

    return ExploreFilterSelection(
      timeFilter: nextTimeFilter,
      distanceFilter: identical(distanceFilter, unsetSentinel)
          ? this.distanceFilter
          : distanceFilter as ExploreDistanceFilter,
      highRatedOnly: highRatedOnly ?? this.highRatedOnly,
      joinedOnly: joinedOnly ?? this.joinedOnly,
      activityTag: identical(activityTag, unsetSentinel)
          ? this.activityTag
          : activityTag as String?,
      area: identical(area, unsetSentinel) ? this.area : area as String?,
    );
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is ExploreFilterSelection &&
            other.timeFilter == timeFilter &&
            other.distanceFilter == distanceFilter &&
            other.highRatedOnly == highRatedOnly &&
            other.joinedOnly == joinedOnly &&
            other.activityTag == activityTag &&
            other.area == area;
  }

  @override
  int get hashCode => Object.hash(
    timeFilter,
    distanceFilter,
    highRatedOnly,
    joinedOnly,
    activityTag,
    area,
  );
}

ExploreTimeFilter _copyWithTimeFilter(
  ExploreTimeFilter current,
  bool? thisWeekOnly,
) {
  if (thisWeekOnly == null) return current;
  return thisWeekOnly ? ExploreTimeFilter.thisWeek : ExploreTimeFilter.anytime;
}

@freezed
abstract class ExploreViewModel with _$ExploreViewModel {
  const ExploreViewModel._();

  const factory ExploreViewModel({
    required List<Organizer> joinedOrganizers,
    required List<Organizer> allOrganizers,
    @Default({}) Set<String> joinedOrganizerIds,
    @Default({}) Set<String> followedOrganizerIds,
  }) = _ExploreViewModel;

  bool get isEmpty => allOrganizers.isEmpty;

  factory ExploreViewModel.partition({
    required List<Organizer> organizers,
    required Set<String> joinedOrganizerIds,
    Set<String>? followedOrganizerIds,
  }) {
    final effectiveFollowedOrganizerIds =
        followedOrganizerIds ?? joinedOrganizerIds;
    final joinedOrganizers = <Organizer>[];
    final activeOrganizerIds = <String>{};

    for (final organizer in organizers) {
      if (joinedOrganizerIds.contains(organizer.id)) {
        joinedOrganizers.add(organizer);
        activeOrganizerIds.add(organizer.id);
      }
    }

    return ExploreViewModel(
      joinedOrganizers: List.unmodifiable(joinedOrganizers),
      allOrganizers: List.unmodifiable(organizers),
      joinedOrganizerIds: activeOrganizerIds,
      followedOrganizerIds: Set.unmodifiable(effectiveFollowedOrganizerIds),
    );
  }
}

/// **KeepAlive notifier with internal flag**
///
/// Holds the currently selected city for club browsing. Uses an
/// internal `_userSelected` flag so GPS auto-detection never overrides a
/// manual user pick. [keepAlive] is true so the city survives tab switches.
// keepalive: selected city is user browse-session state shared by Explore list,
// map, and city controllers across tab switches.
@Riverpod(keepAlive: true)
class SelectedExploreCity extends _$SelectedExploreCity {
  bool _userSelected = false;

  @override
  CityData build() => defaultCityDataForMarket();

  void setCity(CityData city) {
    _userSelected = true;
    ref
        .read(selectedExploreCityWasUserSelectedProvider.notifier)
        .markSelected();
    if (state != city) {
      state = city;
      ref.read(exploreSearchQueryProvider.notifier).clear();
      ref.read(exploreFiltersProvider.notifier).clearLocalScope();
    }
  }

  void autoSelectCity(CityData city) {
    if (_userSelected) return;
    if (state != city) {
      state = city;
      ref.read(exploreSearchQueryProvider.notifier).clear();
      ref.read(exploreFiltersProvider.notifier).clearLocalScope();
    }
  }

  void autoSelectCityByName(String? cityName) {
    final city = cityOptionByName(cityName)?.toCityData();
    if (city == null) return;
    autoSelectCity(city);
  }
}

// keepalive: user-selected flag protects manual city choice from later
// auto-detection while browsing.
@Riverpod(keepAlive: true)
class SelectedExploreCityWasUserSelected
    extends _$SelectedExploreCityWasUserSelected {
  @override
  bool build() => false;

  void markSelected() => state = true;
}

/// **KeepAlive notifier — simple string state**
///
/// Holds the current search query text. [keepAlive] ensures the query
/// survives tab switches so the user's search isn't lost while browsing.
// keepalive: query text is browse-session state and should survive Explore
// route/chrome rebuilds.
@Riverpod(keepAlive: true)
class ExploreSearchQuery extends _$ExploreSearchQuery {
  @override
  String build() => '';

  void setQuery(String query) {
    final normalizedQuery = query.trimLeft();
    if (state != normalizedQuery) {
      state = normalizedQuery;
    }
  }

  void clear() => state = '';
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
@riverpod
Future<String> debouncedExploreSearchQuery(Ref ref) async {
  final query = ref.watch(exploreSearchQueryProvider).trim();
  if (query.length < 2) return query;

  final completer = Completer<void>();
  // ~300ms typing-pause window before the query reaches the network.
  final timer = Timer(CatchMotion.pageStep, completer.complete);
  ref.onDispose(timer.cancel);
  await completer.future;
  return query;
}

// keepalive: filters are browse-session state shared by Explore list, map, and
// feed view models.
@Riverpod(keepAlive: true)
class ExploreFilters extends _$ExploreFilters {
  @override
  ExploreFilterSelection build() => const ExploreFilterSelection();

  void setTimeFilter(ExploreTimeFilter filter) {
    state = state.copyWith(timeFilter: filter);
  }

  void toggleTimeFilter(ExploreTimeFilter filter) {
    final isCurrentlyActive = state.timeFilter == filter;
    final next = isCurrentlyActive && filter != defaultExploreTimeFilter
        ? defaultExploreTimeFilter
        : filter;
    setTimeFilter(next);
  }

  void toggleThisWeekOnly() {
    toggleTimeFilter(ExploreTimeFilter.thisWeek);
  }

  void setDistanceFilter(ExploreDistanceFilter filter) {
    state = state.copyWith(distanceFilter: filter);
  }

  /// Applies a user-selected radius only after an exact device location exists.
  ///
  /// Passive Explore reads never prompt for permission. Every production UI
  /// entry point for a non-ANY radius routes through this method so a missing
  /// location cannot silently turn the feed into an empty result set.
  Future<DeviceLocationFailure?> applyDistanceFilter(
    ExploreDistanceFilter filter,
  ) async {
    if (filter == ExploreDistanceFilter.any) {
      setDistanceFilter(filter);
      return null;
    }

    final locationController = ref.read(deviceLocationProvider.notifier);
    var location = ref.read(deviceLocationProvider).asData?.value;
    DeviceLocationRequestResult? requestResult;
    if (location == null) {
      requestResult = await locationController.request();
      location = requestResult.location;
    }
    if (location == null) {
      return requestResult?.failure ?? DeviceLocationFailure.unavailable;
    }

    setDistanceFilter(filter);
    return null;
  }

  void toggleDistanceFilter(ExploreDistanceFilter filter) {
    final next = state.distanceFilter == filter
        ? ExploreDistanceFilter.any
        : filter;
    setDistanceFilter(next);
  }

  void toggleHighRatedOnly() {
    state = state.copyWith(highRatedOnly: !state.highRatedOnly);
  }

  void toggleJoinedOnly() {
    state = state.copyWith(joinedOnly: !state.joinedOnly);
  }

  void toggleActivityTag(String tag) {
    final next = _normalizeFilterValue(tag);
    if (next == null) return;
    state = state.copyWith(
      activityTag: exploreFilterValuesMatch(state.activityTag, next)
          ? null
          : next,
    );
  }

  void toggleArea(String area) {
    final next = _normalizeFilterValue(area);
    if (next == null) return;
    state = state.copyWith(
      area: exploreFilterValuesMatch(state.area, next) ? null : next,
    );
  }

  void clearLocalScope() {
    if (state.activityTag == null &&
        state.area == null &&
        state.distanceFilter == ExploreDistanceFilter.any) {
      return;
    }
    state = state.copyWith(
      activityTag: null,
      area: null,
      distanceFilter: ExploreDistanceFilter.any,
    );
  }

  void clear() {
    state = const ExploreFilterSelection();
  }
}

/// Algolia swap point: replace this provider's body to use a remote search
/// index. The VM and screen are not affected.
///
/// **Pattern D variant:** Combines location-filtered clubs with client-side
/// search to produce a filtered list for the UI.
@riverpod
AsyncValue<List<Organizer>> exploreSourceOrganizers(Ref ref) {
  final city = ref.watch(selectedExploreCityProvider);
  final locationOrganizersAsync = ref.watch(
    watchOrganizersByLocationProvider(city.effectiveMarketId),
  );
  final locationOrganizersState = catchAsyncStateFromAsyncValue(
    locationOrganizersAsync,
  );

  if (locationOrganizersState.isLoading) {
    return const AsyncLoading();
  }
  if (locationOrganizersState.hasError) {
    return AsyncError(
      locationOrganizersState.error!,
      locationOrganizersState.stackTrace ?? StackTrace.current,
    );
  }
  final locationOrganizers =
      locationOrganizersState.value ?? const <Organizer>[];
  return AsyncData(List.unmodifiable(locationOrganizers));
}

@riverpod
AsyncValue<List<Organizer>> filteredExploreOrganizers(Ref ref) {
  final city = ref.watch(selectedExploreCityProvider);
  final query = ref.watch(exploreSearchQueryProvider);
  final organizersAsync = ref.watch(exploreSourceOrganizersProvider);
  final organizersState = catchAsyncStateFromAsyncValue(organizersAsync);
  final normalizedQuery = query.trim().toLowerCase();

  if (organizersState.isLoading) return const AsyncLoading();
  if (organizersState.hasError) {
    return AsyncError(
      organizersState.error!,
      organizersState.stackTrace ?? StackTrace.current,
    );
  }

  final sourceOrganizers = organizersState.value ?? const <Organizer>[];
  if (normalizedQuery.isEmpty) {
    return AsyncData(sourceOrganizers);
  }

  final localFallback = sourceOrganizers
      .where(
        (organizer) =>
            matchesExploreOrganizerSearchQuery(organizer, normalizedQuery),
      )
      .toList(growable: false);
  // Server search keys off the debounced query so typing doesn't fire a
  // Cloud Function call per keystroke. Until it settles, `localFallback`
  // (computed from the live query above) keeps results responsive.
  final debouncedQueryState = catchAsyncStateFromAsyncValue(
    ref.watch(debouncedExploreSearchQueryProvider),
  );
  final debouncedQuery = debouncedQueryState.value ?? '';
  if (debouncedQuery.length < 2) {
    return AsyncData(localFallback);
  }
  final searchAsync = ref.watch(
    exploreServerSearchProvider(
      query: debouncedQuery,
      cityName: city.effectiveMarketId,
    ),
  );
  final searchState = catchAsyncStateFromAsyncValue(searchAsync);

  if (searchState.isLoading) {
    return AsyncData(localFallback);
  }
  if (searchState.hasError) {
    return AsyncData(localFallback);
  }

  final searchResult = searchState.value;
  if (searchResult == null) {
    return AsyncData(localFallback);
  }

  final searchedOrganizersAsync = ref.watch(
    watchOrganizersByIdsProvider(
      OrganizersByIdQuery(searchResult.organizerIds),
    ),
  );
  final searchedOrganizersState = catchAsyncStateFromAsyncValue(
    searchedOrganizersAsync,
  );
  if (searchedOrganizersState.isLoading) {
    return const AsyncLoading();
  }
  if (searchedOrganizersState.hasError) {
    return AsyncData(localFallback);
  }

  final rankedMatches = _rankOrganizersById(
    ids: searchResult.organizerIds,
    organizers: searchedOrganizersState.value ?? const <Organizer>[],
  );
  return AsyncData(rankedMatches);
}

List<Organizer> _rankOrganizersById({
  required List<String> ids,
  required List<Organizer> organizers,
}) {
  final byId = {for (final organizer in organizers) organizer.id: organizer};
  return [
    for (final id in ids)
      if (byId[id] != null) byId[id]!,
  ];
}

/// **Pattern D: View-model provider**
///
/// Combines the signed-in user, membership edges, and filtered club streams into
/// a
/// [ExploreViewModel] that partitions clubs into joined and discover
/// lists for the UI.
@riverpod
AsyncValue<ExploreViewModel> exploreOrganizersViewModel(Ref ref) {
  final filteredAsync = ref.watch(filteredExploreOrganizersProvider);
  final filteredState = catchAsyncStateFromAsyncValue(filteredAsync);
  final browseFilters = ref.watch(exploreFiltersProvider);

  if (filteredState.isLoading) {
    return const AsyncLoading();
  }
  if (filteredState.hasError) {
    return AsyncError(
      filteredState.error!,
      filteredState.stackTrace ?? StackTrace.current,
    );
  }

  final sourceOrganizers = filteredState.value ?? const <Organizer>[];
  if (sourceOrganizers.isEmpty) {
    return const AsyncData(
      ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
    );
  }

  final uidAsync = ref.watch(uidProvider);
  final uidState = catchAsyncStateFromAsyncValue(uidAsync);
  if (uidState.isLoading) {
    return const AsyncLoading();
  }
  if (uidState.hasError) {
    return AsyncError(
      uidState.error!,
      uidState.stackTrace ?? StackTrace.current,
    );
  }

  final uid = uidState.value;
  final followedOrganizerIdsAsync = ref.watch(
    currentUserFollowedOrganizerIdsProvider,
  );
  final followedOrganizerIdsState = catchAsyncStateFromAsyncValue(
    followedOrganizerIdsAsync,
  );

  if (uid != null && followedOrganizerIdsState.isLoading) {
    return const AsyncLoading();
  }
  if (uid != null && followedOrganizerIdsState.hasError) {
    return AsyncError(
      followedOrganizerIdsState.error!,
      followedOrganizerIdsState.stackTrace ?? StackTrace.current,
    );
  }

  final followedOrganizerIds = followedOrganizerIdsState.value ?? <String>{};
  final joinedOrganizerIds = followedOrganizerIds;
  final organizers = applyExploreFilters(
    organizers: sourceOrganizers,
    filters: browseFilters,
    joinedOrganizerIds: joinedOrganizerIds,
  );

  return AsyncData(
    ExploreViewModel.partition(
      organizers: organizers,
      joinedOrganizerIds: joinedOrganizerIds,
      followedOrganizerIds: followedOrganizerIds,
    ),
  );
}

bool matchesExploreOrganizerSearchQuery(
  Organizer organizer,
  String normalizedQuery,
) {
  return organizer.name.toLowerCase().contains(normalizedQuery) ||
      organizer.area.toLowerCase().contains(normalizedQuery) ||
      organizer.displayHostName.toLowerCase().contains(normalizedQuery) ||
      organizer.tags.any((tag) => tag.toLowerCase().contains(normalizedQuery));
}

List<Organizer> applyExploreFilters({
  required List<Organizer> organizers,
  required ExploreFilterSelection filters,
  required Set<String> joinedOrganizerIds,
  DateTime? now,
}) {
  if (!filters.hasActiveOrganizerFilters) return organizers;

  final referenceNow = now ?? DateTime.now();
  return organizers
      .where((organizer) {
        if (!_organizerMatchesTimeFilter(
          organizer,
          filters.timeFilter,
          referenceNow,
        )) {
          return false;
        }
        return organizerMatchesScopeFilters(
          organizer: organizer,
          filters: filters,
          joinedOrganizerIds: joinedOrganizerIds,
        );
      })
      .toList(growable: false);
}

bool _organizerMatchesTimeFilter(
  Organizer organizer,
  ExploreTimeFilter filter,
  DateTime now,
) {
  if (filter == ExploreTimeFilter.anytime) return true;
  final nextEventAt = organizer.nextEventAt;
  if (nextEventAt == null || nextEventAt.isBefore(now)) return false;
  return exploreTimeWindowFor(filter, now)?.contains(nextEventAt) ?? true;
}

DateTime _startOfDay(DateTime value) {
  return DateTime(value.year, value.month, value.day);
}

String? _normalizeFilterValue(String? value) {
  final normalized = value?.trim();
  if (normalized == null || normalized.isEmpty) return null;
  return normalized;
}
