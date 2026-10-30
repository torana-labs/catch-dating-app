import 'package:catch_dating_app/contexts/events/parts/event_activity_visuals.dart';
import 'package:catch_dating_app/explore/presentation/explore_filter_logic.dart';
import 'package:catch_dating_app/explore/presentation/explore_filter_state.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Explore's pinned primary time-scope rail.
///
/// Secondary applied-filter chips are deliberately separate so they scroll
/// with the feed instead of extending the pinned viewport obstruction.
class ExploreFilterRail extends StatelessWidget
    implements CatchPrimaryRail, CatchScaledPreferredSize {
  const ExploreFilterRail({
    super.key,
    this.filters = const ExploreFilterSelection(),
    this.state,
    this.dateStripState,
    this.sheetState,
    this.onTimeFilterSelected,
    this.onDistanceFilterSelected,
    this.onToggleJoinedOnly,
    this.onToggleHighRatedOnly,
    this.onToggleActivityTag,
    this.onToggleArea,
    this.onClearFilters,
    this.onOpenFilters,
    this.backgroundColor,
    this.showJoinedOnly = true,
  });

  final Color? backgroundColor;
  final ExploreFilterSelection filters;
  final ExploreFilterRailState? state;
  final ExploreDateStripState? dateStripState;
  final ExploreFilterSheetState? sheetState;
  final ValueChanged<ExploreTimeFilter>? onTimeFilterSelected;
  final ValueChanged<ExploreDistanceFilter>? onDistanceFilterSelected;
  final VoidCallback? onToggleJoinedOnly;
  final VoidCallback? onToggleHighRatedOnly;
  final ValueChanged<String>? onToggleActivityTag;
  final ValueChanged<String>? onToggleArea;
  final VoidCallback? onClearFilters;
  final VoidCallback? onOpenFilters;
  final bool showJoinedOnly;

  @override
  Size get preferredSize => Size.fromHeight(CatchPageTabBar.minimumHeight);

  @override
  Size preferredSizeFor(BuildContext context, {double? width}) =>
      Size.fromHeight(CatchPageTabBar.heightFor(context));

  static List<CatchOption<ExploreTimeFilter>> _timeOptions(
    ExploreDateStripState state,
  ) => [
    for (final option in state.options)
      CatchOption(value: option.value, label: option.label),
  ];

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final railState =
        state ?? ExploreFilterRailState.from(filters, l10n: context.l10n);
    final effectiveDateStripState =
        dateStripState ??
        ExploreDateStripState.from(viewModel: null, l10n: context.l10n);
    return CatchPageTabBar<ExploreTimeFilter>(
      selected: filters.timeFilter,
      onChanged: onTimeFilterSelected,
      options: _timeOptions(effectiveDateStripState),
      scrollable: true,
      backgroundColor: backgroundColor ?? t.bg,
      trailing: CatchIconAction.counted(
        key: const ValueKey('explore-filter-button'),
        icon: CatchIcons.filters,
        count: railState.activeCount,
        variant: CatchIconActionVariant.plain,
        tooltip: railState.filterButtonSemanticLabel,
        onPressed: onOpenFilters ?? () => _showExploreFilterSheet(context),
      ),
    );
  }

  Future<void> _showExploreFilterSheet(BuildContext context) {
    return showCatchBottomSheet<void>(
      context: context,
      builder: (_) => ExploreFilterSheet(
        filters: filters,
        state: sheetState,
        onDistanceFilterSelected: onDistanceFilterSelected,
        onToggleJoinedOnly: onToggleJoinedOnly,
        onToggleHighRatedOnly: onToggleHighRatedOnly,
        onToggleActivityTag: onToggleActivityTag,
        onToggleArea: onToggleArea,
        onClearFilters: onClearFilters,
        showJoinedOnly: showJoinedOnly,
      ),
    );
  }
}

/// Removable Explore filters that scroll beneath the pinned time-scope rail.
class ExploreAppliedFilterRail extends StatelessWidget {
  const ExploreAppliedFilterRail({
    super.key,
    required this.filters,
    required this.showJoinedOnly,
    required this.onDistanceFilterSelected,
    required this.onToggleJoinedOnly,
    required this.onToggleHighRatedOnly,
    required this.onToggleActivityTag,
    required this.onToggleArea,
  });

  final ExploreFilterSelection filters;
  final bool showJoinedOnly;
  final ValueChanged<ExploreDistanceFilter>? onDistanceFilterSelected;
  final VoidCallback? onToggleJoinedOnly;
  final VoidCallback? onToggleHighRatedOnly;
  final ValueChanged<String>? onToggleActivityTag;
  final ValueChanged<String>? onToggleArea;

  @override
  Widget build(BuildContext context) {
    final chips = <Widget>[];
    if (filters.distanceFilter != ExploreDistanceFilter.any) {
      final option = exploreDistanceFilterOptions(
        context.l10n,
      ).firstWhere((candidate) => candidate.value == filters.distanceFilter);
      chips.add(
        CatchChip.removable(
          key: const ValueKey('explore-applied-distance'),
          label: context.l10n.exploreExploreFilterRailAppliedDistance(
            distance: option.label,
          ),
          onRemove: () =>
              onDistanceFilterSelected?.call(ExploreDistanceFilter.any),
          enabled: onDistanceFilterSelected != null,
        ),
      );
    }
    if (showJoinedOnly && filters.joinedOnly) {
      chips.add(
        CatchChip.removable(
          key: const ValueKey('explore-applied-joined'),
          label: context.l10n.exploreExploreFilterRailLabelJoinedOrganizers,
          onRemove: () => onToggleJoinedOnly?.call(),
          enabled: onToggleJoinedOnly != null,
        ),
      );
    }
    if (filters.highRatedOnly) {
      chips.add(
        CatchChip.removable(
          key: const ValueKey('explore-applied-rating'),
          label: context.l10n.exploreExploreFilterRailLabelRated45,
          onRemove: () => onToggleHighRatedOnly?.call(),
          enabled: onToggleHighRatedOnly != null,
        ),
      );
    }
    final activityTag = filters.activityTag;
    if (activityTag != null) {
      chips.add(
        CatchChip.removable(
          key: const ValueKey('explore-applied-activity'),
          label: _exploreActivityFilterLabel(activityTag),
          onRemove: () => onToggleActivityTag?.call(activityTag),
          enabled: onToggleActivityTag != null,
        ),
      );
    }
    final area = filters.area;
    if (area != null) {
      chips.add(
        CatchChip.removable(
          key: const ValueKey('explore-applied-area'),
          label: area,
          onRemove: () => onToggleArea?.call(area),
          enabled: onToggleArea != null,
        ),
      );
    }
    if (chips.isEmpty) return const SizedBox.shrink();
    return SingleChildScrollView(
      key: const ValueKey('explore-applied-filter-row'),
      scrollDirection: Axis.horizontal,
      padding: CatchInsets.exploreAppliedFilters,
      child: Row(spacing: CatchSpacing.s2, children: chips),
    );
  }
}

String _exploreActivityFilterLabel(String selected) {
  for (final kind in primaryBrowseActivityKinds) {
    if (_activityFilterActive(selected, kind)) return kind.label;
  }
  return selected;
}

class ExploreFilterSheet extends StatelessWidget {
  const ExploreFilterSheet({
    super.key,
    this.filters = const ExploreFilterSelection(),
    this.state,
    this.onDistanceFilterSelected,
    this.onToggleJoinedOnly,
    this.onToggleHighRatedOnly,
    this.onToggleActivityTag,
    this.onToggleArea,
    this.onClearFilters,
    this.showJoinedOnly = true,
  });

  final ExploreFilterSelection filters;
  final ExploreFilterSheetState? state;
  final ValueChanged<ExploreDistanceFilter>? onDistanceFilterSelected;
  final VoidCallback? onToggleJoinedOnly;
  final VoidCallback? onToggleHighRatedOnly;
  final ValueChanged<String>? onToggleActivityTag;
  final ValueChanged<String>? onToggleArea;
  final VoidCallback? onClearFilters;
  final bool showJoinedOnly;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final sheetState =
        state ??
        ExploreFilterSheetState.from(
          filters: filters,
          sourceOrganizers: const [],
          l10n: context.l10n,
        );

    return CatchSheet(
      title: context.l10n.exploreExploreFilterRailTitleExploreFilters,
      subtitle: context.l10n.exploreExploreFilterRailSubtitleNarrowTheMapAnd,
      footer: Row(
        children: [
          if (sheetState.activeCount > 0) ...[
            Expanded(
              child: CatchButton(
                label: context.l10n.exploreExploreFilterRailLabelClear,
                variant: CatchButtonVariant.secondary,
                onPressed: onClearFilters,
              ),
            ),
            gapW8,
          ],
          Expanded(
            child: CatchButton(
              label: sheetState.actionLabel,
              status: (sheetState.actionLoading)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
        ],
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight:
              MediaQuery.sizeOf(context).height *
              CatchLayout.sheetMaxHeightFraction,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CatchKickerText(
                label:
                    context.l10n.exploreExploreFilterRailTextDistanceEventsOnly,
                color: t.ink2,
                maxLines: null,
              ),
              gapH12,
              Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  for (final option in sheetState.distanceOptions)
                    CatchChip.selectable(
                      contract: CatchContractConstraints
                          .mobileFormStateExploreDistanceFilter,
                      contractValue: option.value.name,
                      label: option.label,
                      selected: filters.distanceFilter == option.value,
                      enabled: onDistanceFilterSelected != null,
                      onChanged: (_) =>
                          onDistanceFilterSelected?.call(option.value),
                    ),
                ],
              ),
              gapH20,
              CatchKickerText(
                label: context.l10n.exploreExploreFilterRailTextOrganizers,
                color: t.ink2,
                maxLines: null,
              ),
              gapH12,
              Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  if (showJoinedOnly)
                    CatchChip.selectable(
                      key: const ValueKey('explore-filter-joined'),
                      contract: CatchContractConstraints
                          .mobileFormStateExploreJoinedOnly,
                      label:
                          context.l10n.exploreExploreFilterRailLabelJoinedOrganizers,
                      selected: filters.joinedOnly,
                      enabled: onToggleJoinedOnly != null,
                      onChanged: (_) => onToggleJoinedOnly?.call(),
                    ),
                  CatchChip.selectable(
                    contract: CatchContractConstraints
                        .mobileFormStateExploreHighRatedOnly,
                    label: context.l10n.exploreExploreFilterRailLabelRated45,
                    selected: filters.highRatedOnly,
                    enabled: onToggleHighRatedOnly != null,
                    onChanged: (_) => onToggleHighRatedOnly?.call(),
                  ),
                ],
              ),
              gapH20,
              CatchKickerText(
                label: context.l10n.exploreExploreFilterRailTextActivity,
                color: t.ink2,
                maxLines: null,
              ),
              gapH12,
              Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  for (final kind in primaryBrowseActivityKinds)
                    CatchChip.selectable(
                      contract: CatchContractConstraints
                          .mobileFormStateExploreActivityTag,
                      contractValue: kind.name,
                      label: kind.label,
                      selected: _activityFilterActive(
                        filters.activityTag,
                        kind,
                      ),
                      enabled: onToggleActivityTag != null,
                      onChanged: (_) => onToggleActivityTag?.call(kind.name),
                    ),
                ],
              ),
              if (sheetState.areaOptions.isNotEmpty) ...[
                gapH20,
                CatchKickerText(
                  label: context.l10n.exploreExploreFilterRailTextArea,
                  color: t.ink2,
                  maxLines: null,
                ),
                gapH12,
                Wrap(
                  spacing: CatchSpacing.s2,
                  runSpacing: CatchSpacing.s2,
                  children: [
                    for (final area in sheetState.areaOptions)
                      CatchChip.selectable(
                        contract:
                            CatchContractConstraints.mobileFormStateExploreArea,
                        contractValue: area,
                        label: area,
                        selected: exploreFilterValuesMatch(filters.area, area),
                        enabled: onToggleArea != null,
                        onChanged: (_) => onToggleArea?.call(area),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

bool _activityFilterActive(String? selected, ActivityKind kind) {
  return exploreFilterValuesMatch(selected, kind.name) ||
      exploreFilterValuesMatch(selected, kind.label);
}
