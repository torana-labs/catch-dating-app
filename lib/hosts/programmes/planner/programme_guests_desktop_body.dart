import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_household_row.dart';
import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_reply_badge.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guests_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_tab_bar.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The guest list on an expanded window: the views and filters over the
/// household table (household, guests, one badge column per function,
/// side and groups), the reply key and how many are shown.
class HostProgrammeGuestsDesktopBody extends StatelessWidget {
  const HostProgrammeGuestsDesktopBody({
    super.key,
    required this.state,
    required this.filter,
    required this.onView,
    required this.onFilter,
    required this.onOpenHousehold,
    required this.onRetry,
  });

  final HostProgrammeState state;
  final HostProgrammeGuestFilter filter;
  final ValueChanged<HostProgrammeView> onView;
  final ValueChanged<HostProgrammeGuestFilter> onFilter;
  final ValueChanged<HostProgrammeHousehold> onOpenHousehold;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (state.status != HostProgrammeStatus.ready || state.guests == null) {
      return HostProgrammeStateBody(
        status: state.status == HostProgrammeStatus.ready && state.error != null
            ? HostProgrammeStatus.error
            : state.status == HostProgrammeStatus.ready
            ? HostProgrammeStatus.loading
            : state.status,
        onRetry: onRetry,
      );
    }
    final functions = state.functions;
    final households = state.households;
    final shown = state.filtered(filter);
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          justify: CatchStackJustify.between,
          align: CatchStackAlign.center,
          wrap: true,
          children: [
            HostProgrammeTabBar(
              selected: HostProgrammeView.guests,
              onView: onView,
              fill: false,
            ),
            HostProgrammeGuestFilterTabBar(
              state: state,
              filter: filter,
              onFilter: onFilter,
            ),
          ],
        ),
        CatchSurface(
          block: CatchSurfaceBlock.floating,
          child: CatchTable(
            label: l10n.hostProgrammeGuestsGridTitle,
            columns: [
              CatchTableColumn(
                label: l10n.hostProgrammeGuestsColumnHousehold,
                variant: CatchTableColumnVariant.title,
                flex: 3,
              ),
              CatchTableColumn(
                label: l10n.hostProgrammeStatGuests,
                variant: CatchTableColumnVariant.number,
              ),
              for (final function in functions)
                CatchTableColumn(
                  label: function.name,
                  variant: CatchTableColumnVariant.badge,
                ),
              CatchTableColumn(
                label: l10n.hostProgrammeGuestsColumnGroups,
                flex: 3,
              ),
            ],
            children: [
              for (final household in shown)
                CatchTableRow.cells(
                  key: ValueKey<String>('host-programme-row-${household.id}'),
                  onTap: () => onOpenHousehold(household),
                  cells: [
                    CatchTableCell.title(household.label),
                    CatchTableCell.number(household.members.length),
                    for (final cell in household.cells)
                      CatchTableCell.badge(programmeCellBadge(l10n, cell)),
                    CatchTableCell.text(
                      household.groups.join(' · '),
                      tone: CatchTableCellTone.secondary,
                    ),
                  ],
                ),
            ],
          ),
        ),
        const ProgrammeReplyKeyRow(),
        CatchText(
          l10n.hostProgrammeGuestsShowing(
            shown: shown.length,
            total: households.length,
          ),
          variant: CatchTextVariant.bodyMeta,
          tone: CatchTextTone.secondary,
        ),
      ],
    );
  }
}
