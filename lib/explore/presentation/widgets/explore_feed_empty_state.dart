import 'package:catch_dating_app/explore/presentation/explore_screen_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

const EdgeInsets exploreEventsLoadingPadding = EdgeInsets.fromLTRB(
  CatchSpacing.s5,
  CatchSpacing.s3,
  CatchSpacing.s5,
  CatchSpacing.s3,
);

class ExploreEventsSkeleton extends StatelessWidget {
  const ExploreEventsSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: exploreEventsLoadingPadding,
        child: CatchSurface(
          clipBehavior: Clip.antiAlias,
          borderRole: CatchBorderRole.separator,
          emphasis: CatchSurfaceEmphasis.subtle,
          child: CatchSkeleton.card(
            height: CatchLayout.exploreEventsSkeletonHeight,
          ),
        ),
      ),
    );
  }
}

class ExploreFeedEmptyState extends StatelessWidget {
  const ExploreFeedEmptyState({
    super.key,
    required this.state,
    this.onClearSearch,
    this.onClearFilters,
    this.onSetTimeFilter,
  });

  final ExploreEventsEmptyState state;
  final VoidCallback? onClearSearch;
  final VoidCallback? onClearFilters;
  final ValueChanged<ExploreTimeFilter>? onSetTimeFilter;

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: CatchInsets.pageHeaderBody,
        child: CatchEmptyState(
          icon: CatchIcons.eventConfirmed,
          title: state.title,
          message: state.message,
          actions: [
            CatchButton(
              label: state.actionLabel,
              leading: Icon(state.actionIcon),
              variant: CatchButtonVariant.secondary,
              onPressed: _handleAction,
            ),
          ],
          variant: CatchEmptyStateVariant.inline,
        ),
      ),
    );
  }

  void _handleAction() {
    if (state.clearSearch) onClearSearch?.call();
    final nextFilter = state.nextFilter;
    if (nextFilter != null) {
      onSetTimeFilter?.call(nextFilter);
      return;
    }
    if (state.clearFilters) onClearFilters?.call();
  }
}
