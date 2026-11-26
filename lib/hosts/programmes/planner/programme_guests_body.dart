import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_guest_groups_section.dart';
import 'package:catch_dating_app/hosts/programmes/planner/parts/programme_household_row.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_tab_bar.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The guest list on a phone in board order: how many households, Import a
/// list and Add a guest, Choose phone contacts when the planner may import
/// them, the filters, the reply key, the household by function grid, the
/// guests with no household and the guest groups with their hotels.
class HostProgrammeGuestsBody extends StatelessWidget {
  const HostProgrammeGuestsBody({
    super.key,
    required this.state,
    required this.filter,
    required this.onView,
    required this.onFilter,
    required this.onImport,
    required this.onOpenHousehold,
    required this.onRetry,
    this.onPhoneImport,
    this.phoneImportFailure,
    this.onRetryPhoneImport,
    this.groups = const <ProgramGuestGroupRow>[],
    this.onAddGuest,
    this.onEditGuest,
    this.onEditGroup,
  });

  final HostProgrammeState state;
  final HostProgrammeGuestFilter filter;
  final ValueChanged<HostProgrammeView> onView;
  final ValueChanged<HostProgrammeGuestFilter> onFilter;
  final VoidCallback onImport;
  final ValueChanged<HostProgrammeHousehold> onOpenHousehold;
  final VoidCallback onRetry;

  /// Opens the phone contacts import; null when this planner cannot import
  /// them (not a wedding, archived, or no fresh manager access).
  final VoidCallback? onPhoneImport;

  /// Why the access read behind Choose phone contacts failed, in words, for
  /// a failure worth retrying; null otherwise.
  final String? phoneImportFailure;

  /// Reads the access behind Choose phone contacts again.
  final VoidCallback? onRetryPhoneImport;

  /// Every guest group, empty ones included.
  final List<ProgramGuestGroupRow> groups;

  /// Opens Add a guest; null hides it.
  final VoidCallback? onAddGuest;

  /// Opens a guest's answers (for a guest with no household).
  final ValueChanged<ProgramGuestRow>? onEditGuest;

  /// Opens a group to change or delete it, or a new group for null.
  final ValueChanged<ProgramGuestGroupRow?>? onEditGroup;

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
    final households = state.households;
    final shown = state.filtered(filter);
    final unaffiliated = state.unaffiliated;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        HostProgrammeTabBar(selected: HostProgrammeView.guests, onView: onView),
        CatchStack(
          gap: CatchStackGap.g4,
          children: [
            CatchText(
              l10n.hostProgrammeGuestsTitle(count: households.length),
              variant: CatchTextVariant.pageTitle,
            ),
            CatchText(
              l10n.hostProgrammeGuestsSummary(
                guests: state.guests!.guests.length,
                replied: state.repliedHouseholds,
                waiting: state.waitingHouseholds,
              ),
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
        CatchButton(
          key: const ValueKey<String>('host-programme-guests-import'),
          label: l10n.hostProgrammeGuestsImport,
          variant: CatchButtonVariant.secondary,
          leading: CatchIcon(CatchIcons.upload),
          fullWidth: true,
          onPressed: onImport,
        ),
        if (onAddGuest case final addGuest?)
          CatchButton(
            key: const ValueKey<String>('host-programme-guests-add'),
            label: l10n.programsGuestsAddGuest,
            variant: CatchButtonVariant.secondary,
            leading: CatchIcon(CatchIcons.addPerson),
            fullWidth: true,
            onPressed: addGuest,
          ),
        if (onPhoneImport case final phoneImport?)
          CatchSection(
            title: l10n.phoneImportEntryTitle,
            children: [
              CatchText(
                l10n.phoneImportEntryHelp,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
              CatchButton(
                key: const ValueKey<String>('program-guests-phone-import'),
                label: l10n.phoneImportChooseContacts,
                variant: CatchButtonVariant.secondary,
                leading: CatchIcon(CatchIcons.addPerson),
                fullWidth: true,
                onPressed: phoneImport,
              ),
            ],
          )
        else if (phoneImportFailure case final failure?)
          CatchSection(
            title: l10n.phoneImportEntryTitle,
            children: [
              CatchText(
                failure,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
              CatchButton(
                key: const ValueKey<String>(
                  'program-guests-phone-import-retry',
                ),
                label: l10n.sharedActionTryAgain,
                variant: CatchButtonVariant.secondary,
                fullWidth: true,
                onPressed: onRetryPhoneImport,
              ),
            ],
          ),
        HostProgrammeGuestFilterTabBar(
          state: state,
          filter: filter,
          onFilter: onFilter,
        ),
        const ProgrammeReplyKeyRow(),
        CatchSection(
          title: l10n.hostProgrammeGuestsGridTitle,
          note: l10n.hostProgrammeGuestsGridNote,
          empty: households.isEmpty
              ? l10n.hostProgrammeGuestsEmpty
              : l10n.hostProgrammeGuestsFilterEmpty,
          children: [
            if (shown.isNotEmpty)
              ProgrammeGridHeader(
                names: [for (final f in state.functions) f.name],
              ),
            for (final household in shown)
              ProgrammeHouseholdRow(
                key: ValueKey<String>(
                  'host-programme-household-${household.id}',
                ),
                household: household,
                onTap: () => onOpenHousehold(household),
              ),
          ],
        ),
        if (unaffiliated.isNotEmpty)
          ProgrammeNoHouseholdSection(
            state: state,
            guests: unaffiliated,
            onEditGuest: onEditGuest,
          ),
        ProgrammeGuestGroupsSection(
          groups: groups,
          hotels: state.detail?.hotels ?? const <ProgramHotel>[],
          onEditGroup: onEditGroup,
        ),
      ],
    );
  }
}

/// All and No reply, each with its count.
class HostProgrammeGuestFilterTabBar extends StatelessWidget {
  const HostProgrammeGuestFilterTabBar({
    super.key,
    required this.state,
    required this.filter,
    required this.onFilter,
  });

  final HostProgrammeState state;
  final HostProgrammeGuestFilter filter;
  final ValueChanged<HostProgrammeGuestFilter> onFilter;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchStack(
      direction: CatchStackDirection.row,
      gap: CatchStackGap.g6,
      wrap: true,
      children: [
        for (final value in HostProgrammeGuestFilter.values)
          CatchChip.choice(
            key: ValueKey<String>('host-programme-filter-${value.name}'),
            label: switch (value) {
              HostProgrammeGuestFilter.all => l10n.hostProgrammeGuestsAll,
              HostProgrammeGuestFilter.noReply => l10n.hostProgrammeKeyNoReply,
            },
            count: state.filtered(value).length,
            selected: filter == value,
            mode: CatchChipMode.single,
            size: CatchChipSize.sm,
            onPressed: () => onFilter(value),
          ),
      ],
    );
  }
}
