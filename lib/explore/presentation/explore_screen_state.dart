import 'package:catch_dating_app/explore/presentation/explore_chrome_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum ExploreDiscoveryEmptyKind {
  noSourceOrganizers,
  noSearchResults,
  noFilterResults,
  noFilteredSearchResults,
}

enum ExploreDiscoveryEmptyAction {
  none,
  clearSearch,
  clearFilters,
  clearSearchAndFilters,
}

enum ExploreScreenBodyKind {
  loading,
  error,
  content,
  contentWithoutOrganizers,
  empty,
}

enum ExploreScreenRetryTarget { explore, eventFeed }

class ExploreDiscoveryScreenState {
  const ExploreDiscoveryScreenState({
    required this.mapLauncherState,
    required this.emptyState,
    required this.bodyState,
  });

  factory ExploreDiscoveryScreenState.from({
    required AppLocalizations l10n,
    required String cityLabel,
    required String query,
    required ExploreFilterSelection filters,
    required bool hasSourceOrganizers,
    required int? mappableEventCount,
    required bool viewModelLoading,
    Object? viewModelError,
    required ExploreViewModel? viewModel,
    required bool eventFeedLoading,
    Object? eventFeedError,
    required bool eventFeedHasContent,
  }) {
    final emptyState = ExploreDiscoveryEmptyState.from(
      cityLabel: cityLabel,
      hasSourceOrganizers: hasSourceOrganizers,
      hasSearch: query.trim().isNotEmpty,
      filters: filters,
    );
    return ExploreDiscoveryScreenState(
      mapLauncherState: ExploreMapLauncherState.from(
        mappableEventCount: mappableEventCount,
        l10n: l10n,
      ),
      emptyState: emptyState,
      bodyState: ExploreScreenBodyState.from(
        viewModelLoading: viewModelLoading,
        viewModelError: viewModelError,
        viewModel: viewModel,
        eventFeedLoading: eventFeedLoading,
        eventFeedError: eventFeedError,
        eventFeedHasContent: eventFeedHasContent,
        emptyState: emptyState,
      ),
    );
  }

  final ExploreMapLauncherState mapLauncherState;
  final ExploreDiscoveryEmptyState emptyState;
  final ExploreScreenBodyState bodyState;
}

class ExploreScreenBodyState {
  const ExploreScreenBodyState._({
    required this.kind,
    this.viewModel,
    this.emptyState,
    this.error,
    this.retryTarget,
  });

  factory ExploreScreenBodyState.from({
    required bool viewModelLoading,
    Object? viewModelError,
    required ExploreViewModel? viewModel,
    required bool eventFeedLoading,
    Object? eventFeedError,
    required bool eventFeedHasContent,
    required ExploreDiscoveryEmptyState emptyState,
  }) {
    if (viewModelError != null) {
      if (eventFeedHasContent) {
        return ExploreScreenBodyState._(
          kind: ExploreScreenBodyKind.contentWithoutOrganizers,
          error: viewModelError,
          retryTarget: ExploreScreenRetryTarget.explore,
        );
      }
      return ExploreScreenBodyState._(
        kind: ExploreScreenBodyKind.error,
        error: viewModelError,
        retryTarget: ExploreScreenRetryTarget.explore,
      );
    }
    if (viewModelLoading) {
      return const ExploreScreenBodyState._(
        kind: ExploreScreenBodyKind.loading,
      );
    }

    final resolvedViewModel = viewModel;
    if (resolvedViewModel == null) {
      return const ExploreScreenBodyState._(
        kind: ExploreScreenBodyKind.loading,
      );
    }
    if (!resolvedViewModel.isEmpty || eventFeedHasContent) {
      return ExploreScreenBodyState._(
        kind: ExploreScreenBodyKind.content,
        viewModel: resolvedViewModel,
      );
    }
    if (eventFeedError != null) {
      return ExploreScreenBodyState._(
        kind: ExploreScreenBodyKind.error,
        error: eventFeedError,
        retryTarget: ExploreScreenRetryTarget.eventFeed,
      );
    }
    if (eventFeedLoading) {
      return const ExploreScreenBodyState._(
        kind: ExploreScreenBodyKind.loading,
      );
    }
    return ExploreScreenBodyState._(
      kind: ExploreScreenBodyKind.empty,
      emptyState: emptyState,
    );
  }

  final ExploreScreenBodyKind kind;
  final ExploreViewModel? viewModel;
  final ExploreDiscoveryEmptyState? emptyState;
  final Object? error;
  final ExploreScreenRetryTarget? retryTarget;
}

class ExploreDiscoveryEmptyState {
  const ExploreDiscoveryEmptyState({
    required this.kind,
    required this.cityLabel,
    required this.action,
  });

  factory ExploreDiscoveryEmptyState.from({
    required String cityLabel,
    required bool hasSourceOrganizers,
    required bool hasSearch,
    required ExploreFilterSelection filters,
  }) {
    final hasFilters = filters.hasActiveFilters;
    if (!hasSourceOrganizers) {
      return ExploreDiscoveryEmptyState(
        kind: ExploreDiscoveryEmptyKind.noSourceOrganizers,
        cityLabel: cityLabel,
        action: ExploreDiscoveryEmptyAction.none,
      );
    }
    if (hasSearch && hasFilters) {
      return ExploreDiscoveryEmptyState(
        kind: ExploreDiscoveryEmptyKind.noFilteredSearchResults,
        cityLabel: cityLabel,
        action: ExploreDiscoveryEmptyAction.clearSearchAndFilters,
      );
    }
    if (hasSearch) {
      return ExploreDiscoveryEmptyState(
        kind: ExploreDiscoveryEmptyKind.noSearchResults,
        cityLabel: cityLabel,
        action: ExploreDiscoveryEmptyAction.clearSearch,
      );
    }
    if (hasFilters) {
      return ExploreDiscoveryEmptyState(
        kind: ExploreDiscoveryEmptyKind.noFilterResults,
        cityLabel: cityLabel,
        action: ExploreDiscoveryEmptyAction.clearFilters,
      );
    }
    return ExploreDiscoveryEmptyState(
      kind: ExploreDiscoveryEmptyKind.noSourceOrganizers,
      cityLabel: cityLabel,
      action: ExploreDiscoveryEmptyAction.none,
    );
  }

  final ExploreDiscoveryEmptyKind kind;
  final String cityLabel;
  final ExploreDiscoveryEmptyAction action;

  bool get clearSearch =>
      action == ExploreDiscoveryEmptyAction.clearSearch ||
      action == ExploreDiscoveryEmptyAction.clearSearchAndFilters;

  bool get clearFilters =>
      action == ExploreDiscoveryEmptyAction.clearFilters ||
      action == ExploreDiscoveryEmptyAction.clearSearchAndFilters;
}

class ExploreEventsEmptyState {
  const ExploreEventsEmptyState({
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.actionIcon,
    this.nextFilter,
    this.clearSearch = false,
    this.clearFilters = false,
  });

  factory ExploreEventsEmptyState.from({
    required ExploreFilterSelection filters,
    required String searchQuery,
    required AppLocalizations l10n,
  }) {
    if (searchQuery.trim().isNotEmpty) {
      return ExploreEventsEmptyState(
        title: l10n.exploreExploreScreenStateTitleNoEventsMatchThis,
        message: l10n.exploreExploreScreenStateMessageClearTheSearchAnd,
        actionLabel:
            l10n.exploreExploreScreenStateActionlabelClearSearchAndFilters,
        actionIcon: CatchIcons.clear,
        clearSearch: true,
        clearFilters: true,
      );
    }

    return switch (filters.timeFilter) {
      ExploreTimeFilter.tonight => ExploreEventsEmptyState(
        title: l10n.exploreExploreScreenStateTitleNothingTonight,
        message: l10n.exploreExploreScreenStateMessageTheNextGoodFit,
        actionLabel: l10n.exploreExploreScreenStateActionlabelSeeAnytime,
        actionIcon: CatchIcons.clear,
        nextFilter: ExploreTimeFilter.anytime,
      ),
      ExploreTimeFilter.tomorrow => ExploreEventsEmptyState(
        title: l10n.exploreExploreScreenStateTitleNothingTomorrow,
        message: l10n.exploreExploreScreenStateMessageOpenUpTheWeekend,
        actionLabel: l10n.exploreExploreScreenStateActionlabelSeeAnytime,
        actionIcon: CatchIcons.clear,
        nextFilter: ExploreTimeFilter.anytime,
      ),
      ExploreTimeFilter.dayTwo ||
      ExploreTimeFilter.dayThree ||
      ExploreTimeFilter.dayFour ||
      ExploreTimeFilter.dayFive ||
      ExploreTimeFilter.daySix => ExploreEventsEmptyState(
        title: l10n.exploreExploreScreenStateTitleNoUpcomingEventsMatch,
        message: l10n.exploreExploreScreenStateMessageTryADifferentArea,
        actionLabel: l10n.exploreExploreScreenStateActionlabelSeeAnytime,
        actionIcon: CatchIcons.clear,
        nextFilter: ExploreTimeFilter.anytime,
      ),
      ExploreTimeFilter.weekend => ExploreEventsEmptyState(
        title: l10n.exploreExploreScreenStateTitleNothingThisWeekend,
        message: l10n.exploreExploreScreenStateMessageThisWeekHasThe,
        actionLabel: l10n.exploreExploreScreenStateActionlabelSeeThisWeek,
        actionIcon: CatchIcons.thisWeek,
        nextFilter: ExploreTimeFilter.thisWeek,
      ),
      ExploreTimeFilter.thisWeek => ExploreEventsEmptyState(
        title: l10n.exploreExploreScreenStateTitleNothingThisWeek,
        message: l10n.exploreExploreScreenStateMessageRemoveTheTimeWindow,
        actionLabel: l10n.exploreExploreScreenStateActionlabelSeeAnytime,
        actionIcon: CatchIcons.clear,
        nextFilter: ExploreTimeFilter.anytime,
      ),
      ExploreTimeFilter.anytime => ExploreEventsEmptyState(
        title: l10n.exploreExploreScreenStateTitleNoUpcomingEventsMatch,
        message: l10n.exploreExploreScreenStateMessageTryADifferentArea,
        actionLabel: l10n.exploreExploreScreenStateActionlabelClearFilters,
        actionIcon: CatchIcons.clear,
        clearFilters: true,
      ),
    };
  }

  final String title;
  final String message;
  final String actionLabel;
  final IconData actionIcon;
  final ExploreTimeFilter? nextFilter;
  final bool clearSearch;
  final bool clearFilters;
}
