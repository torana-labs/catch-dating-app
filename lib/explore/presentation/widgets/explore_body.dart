import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/clubs/clubs.dart'
    show ClubAvatarRail, buildClubDirectorySlivers;
import 'package:catch_dating_app/contexts/discovery/domain/explore_event_recommendation.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/cross_paths/cross_paths.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_event_type_browse_grid.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_events_section.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_recommendations_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Returns the slivers that make up the Explore feed body — mixed event/club
/// discovery feed, optional legacy club rails, and browse prompts — as a flat
/// list so they can be spread directly into a parent `CustomScrollView.slivers`.
/// When sticky day headers are enabled, only the event stream is wrapped in a
/// bounded [SliverMainAxisGroup]; compatibility callers disable pinning and
/// continue to receive flat inline-header slivers, avoiding nested groups.
List<Widget> buildExploreBodySlivers({
  required BuildContext context,
  required CatchAsyncState<ExploreFeedViewModel> feedState,
  CatchAsyncState<List<ExploreEventRecommendation>>? recommendationsState,
  required ExploreFilterSelection filters,
  required String searchQuery,
  VoidCallback? onRetryFeed,
  VoidCallback? onRetryClubs,
  VoidCallback? onClearSearch,
  VoidCallback? onClearFilters,
  VoidCallback? onLoadMore,
  ValueChanged<ExploreTimeFilter>? onSetTimeFilter,
  ValueChanged<ActivityKind>? onActivitySelected,
  ExploreEventSelected? onEventSelected,
  ValueChanged<ExploreExternalEventItem>? onExternalEventOpened,
  List<CrossPathsSuggestion> crossPathsSuggestions = const [],
  CrossPathsProfileSelected? onCrossPathsProfileSelected,
  CrossPathsImpression? onCrossPathsImpression,
  ValueChanged<Club>? onClubSelected,
  ExploreViewModel? clubsViewModel,
  Object? clubSectionError,
  bool includeJoinedClubsRail = true,
  bool includeClubDirectory = true,
  bool pinnedExploreDayHeaders = true,
  bool promoteFeaturedItem = false,
  DateTime? now,
}) {
  final viewModel = clubsViewModel;
  final feedValue = switch (feedState) {
    CatchAsyncState(
      phase: CatchAsyncPhase.data || CatchAsyncPhase.refreshing,
      :final value,
    ) =>
      value,
    _ => null,
  };
  final eventSlivers = buildExploreEventsSlivers(
    feedState,
    l10n: context.l10n,
    filters: filters,
    searchQuery: searchQuery,
    onRetry: onRetryFeed,
    onClearSearch: onClearSearch,
    onClearFilters: onClearFilters,
    onSetTimeFilter: onSetTimeFilter,
    onEventSelected: onEventSelected,
    onExternalEventOpened: onExternalEventOpened,
    crossPathsSuggestions: crossPathsSuggestions,
    onCrossPathsProfileSelected: onCrossPathsProfileSelected,
    onCrossPathsImpression: onCrossPathsImpression,
    onClubSelected: onClubSelected,
    candidateClubs: viewModel?.allClubs ?? const [],
    joinedClubIds: viewModel?.joinedClubIds ?? const {},
    pinnedDayHeaders: pinnedExploreDayHeaders,
    promoteFeaturedItem: promoteFeaturedItem,
    now: now,
  );
  return [
    if (includeJoinedClubsRail &&
        viewModel != null &&
        viewModel.joinedClubs.isNotEmpty)
      SliverToBoxAdapter(
        child: ClubAvatarRail(clubs: viewModel.joinedClubs, fullBleed: true),
      ),
    if (pinnedExploreDayHeaders)
      SliverMainAxisGroup(slivers: eventSlivers)
    else
      ...eventSlivers,
    if (feedValue?.hasMore ?? false)
      SliverToBoxAdapter(
        child: Padding(
          padding: CatchInsets.pageHorizontal.copyWith(
            top: CatchSpacing.s2,
            bottom: CatchSpacing.s4,
          ),
          child: CatchButton(
            label: context.l10n.exploreExploreScreenActionLoadMorePlans,
            onPressed: feedValue!.isLoadingMore ? null : onLoadMore,
            status: (feedValue.isLoadingMore)
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            variant: CatchButtonVariant.secondary,
            fullWidth: true,
          ),
        ),
      ),
    if (recommendationsState != null)
      switch (recommendationsState) {
        CatchAsyncState(
          phase: CatchAsyncPhase.initialLoading || CatchAsyncPhase.retrying,
        ) =>
          const SliverToBoxAdapter(
            child: Padding(
              padding: CatchInsets.pageBody,
              child: ExploreRecommendationsSection.loading(),
            ),
          ),
        CatchAsyncState(
          phase: CatchAsyncPhase.staleDataWithError ||
              CatchAsyncPhase.terminalError,
          :final error,
        ) =>
          SliverToBoxAdapter(
            child: Padding(
              padding: CatchInsets.pageBody,
              child: CatchLocalizedErrorState(
                error!,
                context: AppErrorContext.explore,
                onRetry: onRetryFeed,
                mode: CatchErrorStateMode.compact,
              ),
            ),
          ),
        CatchAsyncState(
          phase: CatchAsyncPhase.data || CatchAsyncPhase.refreshing,
          :final value,
        ) =>
          value == null || value.isEmpty
              ? const SliverToBoxAdapter(child: SizedBox.shrink())
              : SliverToBoxAdapter(
                  child: Padding(
                    padding: CatchInsets.pageBody,
                    child: ExploreRecommendationsSection(
                      recommendations: value,
                    ),
                  ),
                ),
      },
    if (clubSectionError != null)
      SliverToBoxAdapter(
        child: Padding(
          padding: CatchInsets.pageBody,
          child: CatchLocalizedErrorState(
            clubSectionError,
            context: AppErrorContext.explore,
            onRetry: onRetryClubs,
            mode: CatchErrorStateMode.compact,
          ),
        ),
      ),
    if (includeClubDirectory &&
        viewModel != null &&
        viewModel.allClubs.isNotEmpty)
      ...buildClubDirectorySlivers(
        context: context,
        clubs: viewModel.allClubs,
        joinedClubIds: viewModel.joinedClubIds,
      ),
    if (feedValue != null)
      SliverToBoxAdapter(
        child: ExploreEventTypeBrowseGrid(
          items: feedValue.items,
          activeActivityTag: filters.activityTag,
          onCategoryTap: onActivitySelected,
        ),
      ),
  ];
}
