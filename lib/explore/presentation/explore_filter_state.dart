import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class ExploreFilterRailState {
  const ExploreFilterRailState({
    required this.activeCount,
    required this.filterButtonSemanticLabel,
  });

  factory ExploreFilterRailState.from(
    ExploreFilterSelection filters, {
    required AppLocalizations l10n,
  }) {
    final activeCount = activeExploreFilterCount(filters);
    return ExploreFilterRailState(
      activeCount: activeCount,
      filterButtonSemanticLabel: activeCount == 0
          ? l10n.exploreExploreScreenStateVisiblecopyOpenExploreFilters
          : l10n.exploreExploreScreenStateVisiblecopyOpenExploreFiltersActivecount(
              activeCount: activeCount,
            ),
    );
  }

  final int activeCount;
  final String filterButtonSemanticLabel;
}

class ExploreDateStripState {
  const ExploreDateStripState({required this.options});

  factory ExploreDateStripState.from({
    required ExploreFeedViewModel? viewModel,
    required AppLocalizations l10n,
    DateTime? now,
  }) {
    final referenceNow = now ?? DateTime.now();
    return ExploreDateStripState(
      options: List.unmodifiable([
        for (final filter in displayedExploreDateFilters)
          ExploreDateStripOption(
            value: filter,
            label: _exploreDateStripLabel(
              filter,
              referenceNow,
              viewModel?.dateSupplyCount(filter),
              l10n,
              countIsLowerBound: viewModel?.isExhaustive == false,
            ),
          ),
      ]),
    );
  }

  final List<ExploreDateStripOption> options;
}

class ExploreDateStripOption {
  const ExploreDateStripOption({required this.value, required this.label});

  final ExploreTimeFilter value;
  final String label;
}

String _exploreDateStripLabel(
  ExploreTimeFilter filter,
  DateTime now,
  int? supplyCount,
  AppLocalizations l10n, {
  required bool countIsLowerBound,
}) {
  final baseLabel = switch (filter) {
    ExploreTimeFilter.tonight => l10n.exploreExploreFilterRailLabelTonight,
    ExploreTimeFilter.tomorrow => l10n.exploreExploreFilterRailLabelTomorrow,
    ExploreTimeFilter.dayTwo ||
    ExploreTimeFilter.dayThree ||
    ExploreTimeFilter.dayFour ||
    ExploreTimeFilter.dayFive ||
    ExploreTimeFilter.daySix => DateFormat('EEE d').format(
      DateUtils.dateOnly(
        now,
      ).add(Duration(days: _exploreDateStripDayOffset(filter))),
    ),
    ExploreTimeFilter.anytime => l10n.exploreExploreFilterRailLabelAny,
    ExploreTimeFilter.weekend => l10n.exploreExploreFilterRailLabelWeekend,
    ExploreTimeFilter.thisWeek => l10n.exploreExploreFilterRailLabelThisWeek,
  };
  if (supplyCount == null) return baseLabel;
  if (countIsLowerBound) {
    return l10n.exploreExploreFilterRailDateSupplyPlus(
      label: baseLabel,
      count: supplyCount,
    );
  }
  return l10n.exploreExploreFilterRailDateSupply(
    label: baseLabel,
    count: supplyCount,
  );
}

int _exploreDateStripDayOffset(ExploreTimeFilter filter) => switch (filter) {
  ExploreTimeFilter.dayTwo => 2,
  ExploreTimeFilter.dayThree => 3,
  ExploreTimeFilter.dayFour => 4,
  ExploreTimeFilter.dayFive => 5,
  ExploreTimeFilter.daySix => 6,
  _ => 0,
};

class ExploreFilterSheetState {
  const ExploreFilterSheetState({
    required this.activeCount,
    required this.distanceOptions,
    required this.areaOptions,
    required this.actionLabel,
    required this.actionLoading,
  });

  factory ExploreFilterSheetState.from({
    required ExploreFilterSelection filters,
    required Iterable<Club> sourceClubs,
    required AppLocalizations l10n,
    ExploreFeedViewModel? viewModel,
    bool feedLoading = false,
  }) {
    return ExploreFilterSheetState(
      activeCount: activeExploreFilterCount(filters),
      distanceOptions: exploreDistanceFilterOptions(l10n),
      areaOptions: _areaOptions(sourceClubs, filters.area),
      actionLabel: _exploreFilterSheetActionLabel(
        viewModel,
        feedLoading: feedLoading,
        l10n: l10n,
      ),
      actionLoading: feedLoading && viewModel == null,
    );
  }

  ExploreFilterSheetState withLiveResults({
    required ExploreFilterSelection filters,
    required ExploreFeedViewModel? viewModel,
    required bool feedLoading,
    required AppLocalizations l10n,
  }) {
    return ExploreFilterSheetState(
      activeCount: activeExploreFilterCount(filters),
      distanceOptions: distanceOptions,
      areaOptions: areaOptions,
      actionLabel: _exploreFilterSheetActionLabel(
        viewModel,
        feedLoading: feedLoading,
        l10n: l10n,
      ),
      actionLoading: feedLoading && viewModel == null,
    );
  }

  final int activeCount;
  final List<ExploreDistanceFilterOption> distanceOptions;
  final List<String> areaOptions;
  final String actionLabel;
  final bool actionLoading;
}

String _exploreFilterSheetActionLabel(
  ExploreFeedViewModel? viewModel, {
  required bool feedLoading,
  required AppLocalizations l10n,
}) {
  if (viewModel == null && feedLoading) {
    return l10n.exploreExploreFilterRailLabelUpdatingPlans;
  }
  final count = viewModel?.count ?? 0;
  return viewModel?.isExhaustive == false
      ? l10n.exploreExploreFilterRailLabelShowPlansPlus(count: count)
      : l10n.exploreExploreFilterRailLabelShowPlans(count: count);
}

class ExploreDistanceFilterOption {
  const ExploreDistanceFilterOption({required this.value, required this.label});

  final ExploreDistanceFilter value;
  final String label;
}

List<ExploreDistanceFilterOption> exploreDistanceFilterOptions(
  AppLocalizations l10n,
) => <ExploreDistanceFilterOption>[
  ExploreDistanceFilterOption(
    value: ExploreDistanceFilter.any,
    label: l10n.exploreExploreScreenStateLabelAny,
  ),
  ExploreDistanceFilterOption(
    value: ExploreDistanceFilter.oneKm,
    label: l10n.exploreExploreScreenStateLabel1Km,
  ),
  ExploreDistanceFilterOption(
    value: ExploreDistanceFilter.threeKm,
    label: l10n.exploreExploreScreenStateLabel3Km,
  ),
  ExploreDistanceFilterOption(
    value: ExploreDistanceFilter.fiveKm,
    label: l10n.exploreExploreScreenStateLabel5Km,
  ),
  ExploreDistanceFilterOption(
    value: ExploreDistanceFilter.tenKm,
    label: l10n.exploreExploreScreenStateLabel10Km,
  ),
];

int activeExploreFilterCount(ExploreFilterSelection filters) {
  var count = 0;
  if (filters.timeFilter != defaultExploreTimeFilter) count += 1;
  if (filters.distanceFilter != ExploreDistanceFilter.any) count += 1;
  if (filters.highRatedOnly) count += 1;
  if (filters.joinedOnly) count += 1;
  if (filters.activityTag != null) count += 1;
  if (filters.area != null) count += 1;
  return count;
}

List<String> _areaOptions(Iterable<Club> clubs, String? selectedArea) {
  final areas = <String>{};
  for (final club in clubs) {
    final area = club.area.trim();
    if (area.isNotEmpty) areas.add(area);
  }
  final selected = selectedArea?.trim();
  if (selected != null && selected.isNotEmpty) areas.add(selected);
  return areas.toList()
    ..sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
}
