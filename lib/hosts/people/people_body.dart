import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/hosts/people/people_state.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_list.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_tab_bar.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// The People view on a phone, in board order: the People, Messages and
/// Forms views, the Show rail of filters and saved groups, the kicker for
/// the list and the people it holds.
class HostPeopleBody extends StatelessWidget {
  const HostPeopleBody({
    super.key,
    required this.state,
    required this.onView,
    required this.onFilter,
    required this.onOpenGroup,
    required this.onOpenPerson,
    required this.onLoadMore,
    required this.onRetry,
  });

  final HostPeopleState state;
  final ValueChanged<HostPeopleView> onView;
  final ValueChanged<HostPeopleFilter> onFilter;
  final ValueChanged<HostPeopleGroup> onOpenGroup;
  final ValueChanged<HostAudienceContact> onOpenPerson;
  final VoidCallback onLoadMore;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final numbers = NumberFormat.decimalPattern(
      Localizations.localeOf(context).toLanguageTag(),
    );
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        HostPeopleTabBar(selected: HostPeopleView.people, onView: onView),
        CatchRail(
          label: l10n.hostPeopleShowLabel,
          wrap: CatchRailMode.never,
          children: [
            for (final option in state.filters)
              CatchChip.choice(
                key: ValueKey<String>(
                  'host-people-filter-${option.filter.name}',
                ),
                label: hostPeopleFilterLabel(l10n, option.filter),
                count: option.count,
                selected: option.filter == state.filter,
                mode: CatchChipMode.single,
                onPressed: () => onFilter(option.filter),
              ),
            for (final group in state.groups)
              CatchChip.link(
                key: ValueKey<String>('host-people-group-${group.audienceId}'),
                label: group.name,
                count: group.count,
                leading: CatchIcon(CatchIcons.people, size: CatchIconSize.xs),
                onPressed: () => onOpenGroup(group),
              ),
          ],
        ),
        HostPeopleList(
          state: state,
          kicker: hostPeopleKicker(l10n, numbers, state),
          onOpenPerson: onOpenPerson,
          onLoadMore: onLoadMore,
          onRetry: onRetry,
        ),
      ],
    );
  }
}

/// The filter chip's label.
String hostPeopleFilterLabel(AppLocalizations l10n, HostPeopleFilter filter) =>
    switch (filter) {
      HostPeopleFilter.everyone => l10n.hostPeopleFilterEveryone,
      HostPeopleFilter.regulars => l10n.hostPeopleFilterRegulars,
      HostPeopleFilter.newFaces => l10n.hostPeopleFilterNew,
      HostPeopleFilter.drifting => l10n.hostPeopleFilterDrifting,
    };

/// "Everyone · 1,284, most recent first", or the search being run.
String hostPeopleKicker(
  AppLocalizations l10n,
  NumberFormat numbers,
  HostPeopleState state,
) {
  final label = hostPeopleFilterLabel(l10n, state.filter);
  final count = state.matchCount;
  if (state.search.trim().isNotEmpty) {
    return l10n.hostPeopleKickerSearch(query: state.search.trim());
  }
  if (count == null) return l10n.hostPeopleKickerPlain(filter: label);
  return l10n.hostPeopleKicker(
    filter: label,
    count: state.atLeast
        ? l10n.hostPeopleCountAtLeast(count: numbers.format(count))
        : numbers.format(count),
  );
}
