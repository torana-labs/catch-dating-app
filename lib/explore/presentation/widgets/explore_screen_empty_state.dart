import 'package:catch_dating_app/explore/presentation/explore_screen_state.dart';
import 'package:catch_dating_app/explore/presentation/widgets/explore_clear_button.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class ExploreScreenEmptyState extends StatelessWidget {
  const ExploreScreenEmptyState({
    super.key,
    required this.state,
    this.onClearSearch,
    this.onClearFilters,
    this.onChangeCity,
  });

  final ExploreDiscoveryEmptyState state;
  final VoidCallback? onClearSearch;
  final VoidCallback? onClearFilters;
  final VoidCallback? onChangeCity;

  @override
  Widget build(BuildContext context) {
    final action = state.action == ExploreDiscoveryEmptyAction.none
        ? null
        : ExploreClearButton(
            clearSearch: state.clearSearch,
            clearFilters: state.clearFilters,
            onClearSearch: onClearSearch,
            onClearFilters: onClearFilters,
          );
    return switch (state.kind) {
      ExploreDiscoveryEmptyKind.noSourceOrganizers => Center(
        child: Padding(
          padding: CatchInsets.contentRelaxed,
          child: CatchEmptyState(
            icon: CatchIcons.people,
            title: context.l10n.exploreExploreScreenTitleNoOrganizersInCitylabel(
              cityLabel: state.cityLabel,
            ),
            message: context.l10n.exploreExploreScreenMessageTryAnotherCityFrom,
            actions: [
              CatchButton(
                label: context.l10n.exploreExploreScreenLabelChangeCity,
                leading: Icon(CatchIcons.location),
                onPressed: onChangeCity,
              ),
            ],
          ),
        ),
      ),
      ExploreDiscoveryEmptyKind.noFilteredSearchResults => Center(
        child: Padding(
          padding: CatchInsets.contentRelaxed,
          child: CatchEmptyState(
            icon: CatchIcons.people,
            title: context.l10n.exploreExploreScreenTitleNoOrganizersMatchThis,
            message: context.l10n.exploreExploreScreenMessageClearTheSearchOr,
            actions: [?action],
          ),
        ),
      ),
      ExploreDiscoveryEmptyKind.noSearchResults => Center(
        child: Padding(
          padding: CatchInsets.contentRelaxed,
          child: CatchEmptyState(
            icon: CatchIcons.people,
            title: context.l10n.exploreExploreScreenTitleNoOrganizersMatchThis,
            message: context
                .l10n
                .exploreExploreScreenMessageTryAnotherOrganizerNeighborhood,
            actions: [?action],
          ),
        ),
      ),
      ExploreDiscoveryEmptyKind.noFilterResults => Center(
        child: Padding(
          padding: CatchInsets.contentRelaxed,
          child: CatchEmptyState(
            icon: CatchIcons.people,
            title: context.l10n.exploreExploreScreenTitleNoOrganizersMatchThese,
            message: context.l10n.exploreExploreScreenMessageClearOneOrMore,
            actions: [?action],
          ),
        ),
      ),
    };
  }
}
