import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/cross_paths/cross_paths.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_mixed_feed_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_screen_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/club_card.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_event_row.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_feed_empty_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

export 'package:catch_dating_app/explore/presentation/widgets/club_card.dart';
export 'package:catch_dating_app/explore/presentation/widgets/explore_event_row.dart';
export 'package:catch_dating_app/explore/presentation/widgets/explore_feed_empty_state.dart';

typedef CrossPathsProfileSelected =
    void Function(CrossPathsSuggestion suggestion, ExploreEventItem eventItem);
typedef CrossPathsImpression =
    void Function(
      CrossPathsSuggestion suggestion,
      ExploreEventItem eventItem,
      int position,
    );

final EdgeInsets _exploreEventsErrorPadding = CatchInsets.pageBody.copyWith(
  top: CatchSpacing.s3,
  bottom: CatchSpacing.s3,
);

/// Builds the Explore feed slivers: a mixed event/club discovery stream.
///
/// Returns a flat list of slivers — not a nested [SliverMainAxisGroup] —
/// so the parent sheet keeps one scroll owner while the feed can interleave
/// compact event rows and club recommendations.
List<Widget> buildExploreEventsSlivers(
  CatchAsyncState<ExploreFeedViewModel> feedState, {
  required AppLocalizations l10n,
  required ExploreFilterSelection filters,
  required String searchQuery,
  VoidCallback? onRetry,
  VoidCallback? onClearSearch,
  VoidCallback? onClearFilters,
  ValueChanged<ExploreTimeFilter>? onSetTimeFilter,
  ExploreEventSelected? onEventSelected,
  ValueChanged<ExploreExternalEventItem>? onExternalEventOpened,
  List<CrossPathsSuggestion> crossPathsSuggestions = const [],
  CrossPathsProfileSelected? onCrossPathsProfileSelected,
  CrossPathsImpression? onCrossPathsImpression,
  ValueChanged<Club>? onClubSelected,
  bool pinnedDayHeaders = true,
  bool promoteFeaturedItem = false,
  DateTime? now,
  List<Club> candidateClubs = const <Club>[],
  Set<String> joinedClubIds = const <String>{},
}) {
  return switch (feedState) {
    CatchAsyncState(
      phase: CatchAsyncPhase.initialLoading || CatchAsyncPhase.retrying,
    ) =>
      [const ExploreEventsSkeleton()],
    CatchAsyncState(
      phase: CatchAsyncPhase.staleDataWithError ||
          CatchAsyncPhase.terminalError,
      :final error,
    ) =>
      [
        SliverToBoxAdapter(
          // Bound the error sliver's scroll extent so a long `error.toString()`
          // (e.g. a wrapped ProviderException with full stack trace) does not
          // dominate the sheet's sliver layout and starve following siblings
          // of paint extent. The `OverflowBox` lets the child report its
          // natural intrinsic size while we clip down to a fixed paint area.
          child: ClipRect(
            child: SizedBox(
              height: CatchLayout.exploreErrorSliverHeight,
              child: OverflowBox(
                alignment: Alignment.topCenter,
                minHeight: 0,
                maxHeight: 1200,
                child: Padding(
                  padding: _exploreEventsErrorPadding,
                  child: CatchLocalizedErrorState(
                    error!,
                    context: AppErrorContext.event,
                    onRetry: onRetry,
                    mode: CatchErrorStateMode.compact,
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    CatchAsyncState(
      phase: CatchAsyncPhase.data || CatchAsyncPhase.refreshing,
      :final value,
    ) =>
      () {
        if (value == null) return [const ExploreEventsSkeleton()];
        final hasDiscoverableClubCandidates = rankExploreClubIntermixCandidates(
          candidateClubs,
          joinedClubIds: joinedClubIds,
        ).isNotEmpty;
        return value.isEmpty && !hasDiscoverableClubCandidates
            ? [
                ExploreFeedEmptyState(
                  state: ExploreEventsEmptyState.from(
                    filters: filters,
                    searchQuery: searchQuery,
                    l10n: l10n,
                  ),
                  onClearSearch: onClearSearch,
                  onClearFilters: onClearFilters,
                  onSetTimeFilter: onSetTimeFilter,
                ),
              ]
            : [
                ExploreFeedSliverBody(
                  viewModel: value,
                  l10n: l10n,
                  candidateClubs: candidateClubs,
                  joinedClubIds: joinedClubIds,
                  pinnedDayHeaders: pinnedDayHeaders,
                  promoteFeaturedItem: promoteFeaturedItem,
                  showThisWeekList:
                      filters.timeFilter == ExploreTimeFilter.thisWeek &&
                      searchQuery.trim().isEmpty,
                  now: now,
                  onEventSelected: onEventSelected,
                  onExternalEventOpened: onExternalEventOpened,
                  crossPathsSuggestions: crossPathsSuggestions,
                  onCrossPathsProfileSelected: onCrossPathsProfileSelected,
                  onCrossPathsImpression: onCrossPathsImpression,
                  onClubSelected: onClubSelected,
                ),
              ];
      }(),
  };
}

class ExploreFeedSliverBody extends StatelessWidget {
  const ExploreFeedSliverBody({
    super.key,
    required this.viewModel,
    required this.l10n,
    required this.candidateClubs,
    required this.joinedClubIds,
    required this.pinnedDayHeaders,
    required this.promoteFeaturedItem,
    required this.showThisWeekList,
    required this.now,
    required this.onEventSelected,
    required this.onExternalEventOpened,
    required this.crossPathsSuggestions,
    required this.onCrossPathsProfileSelected,
    required this.onCrossPathsImpression,
    required this.onClubSelected,
  });

  final ExploreFeedViewModel viewModel;
  final AppLocalizations l10n;
  final List<Club> candidateClubs;
  final Set<String> joinedClubIds;
  final bool pinnedDayHeaders;
  final bool promoteFeaturedItem;
  final bool showThisWeekList;
  final DateTime? now;
  final ExploreEventSelected? onEventSelected;
  final ValueChanged<ExploreExternalEventItem>? onExternalEventOpened;
  final List<CrossPathsSuggestion> crossPathsSuggestions;
  final CrossPathsProfileSelected? onCrossPathsProfileSelected;
  final CrossPathsImpression? onCrossPathsImpression;
  final ValueChanged<Club>? onClubSelected;

  @override
  Widget build(BuildContext context) {
    final sectionState = ExploreFeedSectionState.from(
      l10n: l10n,
      viewModel: viewModel,
      candidateClubs: candidateClubs,
      joinedClubIds: joinedClubIds,
      showThisWeekList: showThisWeekList,
      promoteFeaturedItem: promoteFeaturedItem,
      now: now,
      crossPathsSuggestions: crossPathsSuggestions,
    );
    if (sectionState.isEmpty) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }
    final resultCountPadding = CatchInsets.pageBody.copyWith(
      top: pinnedDayHeaders ? CatchSpacing.s4 : CatchSpacing.s3,
      bottom: CatchSpacing.s1,
    );
    final thisWeekPadding = CatchInsets.pageBody.copyWith(
      top: CatchSpacing.s3,
      bottom: sectionState.cards.isEmpty ? CatchSpacing.s4 : CatchSpacing.s2,
    );

    return SliverMainAxisGroup(
      slivers: [
        if (sectionState.totalCount > 0)
          SliverToBoxAdapter(
            child: Padding(
              padding: resultCountPadding,
              child: Builder(
                builder: (context) => CatchMetadataText(
                  sectionState.resultCountLabel,
                  color: CatchTokens.of(context).ink3,
                ),
              ),
            ),
          ),
        if (sectionState.thisWeekItems.isNotEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: thisWeekPadding,
              child: Builder(
                builder: (context) => ThisWeekRecommendationsSection(
                  items: sectionState.thisWeekItems,
                  onEventSelected: onEventSelected,
                ),
              ),
            ),
          ),
        for (final group in sectionState.cardGroups) ...[
          if (group.label != null && pinnedDayHeaders)
            SliverPersistentHeader(
              pinned: true,
              delegate: CatchDaySectionHeaderDelegate(
                label: group.label!,
                count: group.timedCardCount,
              ),
            ),
          if (group.label != null && !pinnedDayHeaders)
            SliverToBoxAdapter(
              child: CatchDaySectionHeader(
                label: group.label!,
                count: group.timedCardCount,
              ),
            ),
          SliverPadding(
            padding: CatchInsets.pageHorizontal.copyWith(
              top: group.label == null ? CatchSpacing.s4 : 0,
              bottom: CatchSpacing.s4,
            ),
            sliver: SliverList.separated(
              itemCount: group.cards.length,
              separatorBuilder: (_, index) => SizedBox(
                height:
                    group.cards[index] is ExploreMixedEventRowCard &&
                        group.cards[index + 1] is ExploreMixedEventRowCard
                    ? 0
                    : CatchSpacing.s4,
              ),
              itemBuilder: (context, index) {
                final cards = group.cards;
                final position = _exploreMixedFeedPosition(
                  sectionState.cardGroups,
                  group,
                  index,
                );
                return switch (cards[index]) {
                  ExploreMixedEventRowCard(:final item) => ExploreFeedEventRow(
                    item: item,
                    stripPosition: exploreMixedEventStripPosition(cards, index),
                    onEventSelected: onEventSelected,
                  ),
                  ExploreMixedExternalEventRowCard(:final item) =>
                    ExploreExternalEventRow(
                      item: item,
                      onExternalEventOpened: onExternalEventOpened,
                    ),
                  ExploreMixedClubSpotlightCard(:final club) => ClubCard(
                    club: club,
                    onClubSelected: onClubSelected,
                  ),
                  ExploreMixedClubRowCard(:final club) => ExploreFeedClubRow(
                    club: club,
                    onClubSelected: onClubSelected,
                  ),
                  ExploreMixedPersonCard(:final suggestion, :final eventItem) =>
                    CrossPathsExploreCard(
                      suggestion: suggestion,
                      event: eventItem.event,
                      onProfileSelected: onCrossPathsProfileSelected == null
                          ? null
                          : () => onCrossPathsProfileSelected!(
                              suggestion,
                              eventItem,
                            ),
                      onEventSelected: onEventSelected == null
                          ? null
                          : () => onEventSelected!(eventItem, 'cross_paths'),
                      onImpression: onCrossPathsImpression == null
                          ? null
                          : () => onCrossPathsImpression!(
                              suggestion,
                              eventItem,
                              position,
                            ),
                    ),
                };
              },
            ),
          ),
        ],
        const SliverToBoxAdapter(child: SizedBox(height: CatchSpacing.s6)),
      ],
    );
  }
}

int _exploreMixedFeedPosition(
  List<ExploreFeedCardGroup> groups,
  ExploreFeedCardGroup target,
  int index,
) {
  var position = index + 1;
  for (final group in groups) {
    if (identical(group, target)) return position;
    position += group.cards.length;
  }
  return position;
}
