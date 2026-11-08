import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_door_guest_row.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_door_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// A function's door in board order: how many are in, the meter and the
/// line under it, the search, Expected, In and Walk-ins with their counts,
/// a closed-door notice, and the guests. The selected guest opens with a
/// stepper for how many arrived and Check in N.
class StaffDoorBody extends StatelessWidget {
  const StaffDoorBody({
    super.key,
    required this.state,
    required this.party,
    required this.onFilter,
    required this.onSearch,
    required this.onSelect,
    required this.onParty,
    required this.onCheckIn,
    required this.onUndo,
    required this.onNoShow,
    required this.onRetry,
    this.notices,
  });

  final StaffDoorState state;

  /// How many arrived, as the selected row's stepper shows it.
  final int party;
  final ValueChanged<StaffDoorFilter> onFilter;
  final ValueChanged<String> onSearch;
  final ValueChanged<ProgramDoorGuest> onSelect;
  final ValueChanged<int> onParty;

  /// Checks a guest in with how many arrived.
  final void Function(ProgramDoorGuest guest, int party) onCheckIn;
  final ValueChanged<ProgramDoorGuest> onUndo;
  final ValueChanged<ProgramDoorGuest> onNoShow;
  final VoidCallback onRetry;
  final Widget? notices;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final view = state.view;
    switch (state.status) {
      case StaffDoorStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case StaffDoorStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostStaffDoorErrorTitle,
            message: l10n.hostStaffJobsErrorBody,
            retryLabel: l10n.hostStaffTryAgain,
            onRetry: onRetry,
          ),
        );
      case StaffDoorStatus.content:
        break;
    }
    final counts = view!.counts;
    final function = view.function;
    final toCome = counts.expectedHeads - counts.checkedInHeads;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchText(
              l10n.hostStaffFunctionCounts(
                checkedIn: counts.checkedInHeads,
                expected: counts.expectedHeads,
              ),
              variant: CatchTextVariant.displayTitle,
              numeric: true,
            ),
            CatchMeter(
              value: counts.checkedInHeads,
              max: counts.expectedHeads == 0 ? 1 : counts.expectedHeads,
              label: l10n.hostStaffDoorMeter,
            ),
            CatchText(
              [
                l10n.hostStaffDoorToCome(count: toCome < 0 ? 0 : toCome),
                l10n.hostStaffDoorWalkIns(count: counts.walkInCount),
                if (function.invitationMode ==
                    ProgramFunctionInvitationMode.selectedGuests)
                  l10n.hostStaffDoorOnlyInvitees(function: function.name),
              ].join(' · '),
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
        CatchSearchField(
          key: const ValueKey<String>('staff-door-search'),
          copy: catchSearchFieldCopy(l10n),
          value: state.query,
          placeholder: l10n.hostStaffDoorSearch,
          semanticLabel: l10n.hostStaffDoorSearchLabel,
          contractExemption:
              'Client-side filter over the loaded door rows; never persisted.',
          onChanged: onSearch,
        ),
        CatchPageTabBar<StaffDoorFilter>.segmented(
          selected: state.filter,
          onChanged: onFilter,
          label: l10n.hostStaffDoorShow,
          options: [
            for (final filter in StaffDoorFilter.values)
              CatchOption(
                value: filter,
                label: switch (filter) {
                  StaffDoorFilter.expected => l10n.hostStaffDoorExpected,
                  StaffDoorFilter.checkedIn => l10n.hostStaffDoorIn,
                  StaffDoorFilter.walkIns => l10n.hostStaffDoorWalkInsTab,
                },
                count: state.countOf(filter),
              ),
          ],
        ),
        ?notices,
        if (!state.doorOpen)
          CatchNotice.inline(
            tone: CatchNoticeTone.warning,
            icon: CatchIcons.locked,
            body: function.status == ProgramFunctionStatus.cancelled
                ? l10n.hostStaffDoorCancelled
                : l10n.hostStaffDoorClosed,
          ),
        CatchSection(
          empty: state.query.isEmpty
              ? l10n.hostStaffDoorEmpty
              : l10n.hostStaffDoorNoMatch,
          children: [
            for (final guest in state.shown)
              StaffDoorGuestRow(
                key: ValueKey<String>('staff-door-guest-${guest.guestId}'),
                guest: guest,
                queued: state.queuedFor(guest),
                doorOpen: state.doorOpen,
                onTap: () => onSelect(guest),
                onAction: () => guest.isCheckedIn
                    ? onUndo(guest)
                    : onCheckIn(guest, guest.partySize ?? 1),
                footer: state.doorOpen && state.selectedGuestId == guest.guestId
                    ? _StaffDoorSelected(
                        guest: guest,
                        party: party,
                        onParty: onParty,
                        onCheckIn: () => onCheckIn(guest, party),
                        onUndo: () => onUndo(guest),
                        onNoShow: () => onNoShow(guest),
                      )
                    : null,
              ),
            if (state.filter == StaffDoorFilter.walkIns)
              for (final walkIn in state.pendingWalkIns)
                CatchIndexRow(
                  key: ValueKey<String>(
                    'staff-door-walk-in-${walkIn.operationId}',
                  ),
                  title: walkIn.name,
                  badge: CatchIndexRowBadge(
                    label:
                        walkIn.status ==
                            ProgramOperationOutboxStatus.needsReview
                        ? l10n.hostStaffRefused
                        : l10n.hostStaffNotSent,
                    tone:
                        walkIn.status ==
                            ProgramOperationOutboxStatus.needsReview
                        ? CatchBadgeTone.danger
                        : CatchBadgeTone.warning,
                    icon: CatchIcons.offline,
                  ),
                  onTap: null,
                ),
          ],
        ),
      ],
    );
  }
}

/// The selected guest: how many arrived with Check in N, or Undo once they
/// are in, and Did not come for a guest still expected.
class _StaffDoorSelected extends StatelessWidget {
  const _StaffDoorSelected({
    required this.guest,
    required this.party,
    required this.onParty,
    required this.onCheckIn,
    required this.onUndo,
    required this.onNoShow,
  });

  final ProgramDoorGuest guest;
  final int party;
  final ValueChanged<int> onParty;
  final VoidCallback onCheckIn;
  final VoidCallback onUndo;
  final VoidCallback onNoShow;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (guest.isCheckedIn) {
      return CatchButton(
        key: const ValueKey<String>('staff-door-undo'),
        label: l10n.hostStaffDoorUndo,
        variant: CatchButtonVariant.secondary,
        size: CatchButtonSize.md,
        fullWidth: true,
        onPressed: onUndo,
      );
    }
    final expected = guest.partySize ?? 1;
    return CatchStack(
      gap: CatchStackGap.g8,
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          align: CatchStackAlign.center,
          children: [
            CatchStepper(
              key: const ValueKey<String>('staff-door-party'),
              value: party,
              min: 1,
              max: expected < party ? party + 1 : expected + 1,
              onChanged: (value) => onParty(value.toInt()),
              decreaseSemanticLabel: l10n.hostStaffDoorFewer,
              increaseSemanticLabel: l10n.hostStaffDoorMore,
            ),
            Expanded(
              child: CatchButton(
                key: const ValueKey<String>('staff-door-check-in'),
                label: l10n.hostStaffDoorCheckInCount(count: party),
                size: CatchButtonSize.md,
                fullWidth: true,
                onPressed: onCheckIn,
              ),
            ),
          ],
        ),
        if (guest.attendanceStatus == ProgramFunctionAttendanceStatus.expected)
          CatchButton(
            label: l10n.hostStaffDoorMarkNoShow,
            variant: CatchButtonVariant.quiet,
            size: CatchButtonSize.md,
            onPressed: onNoShow,
          ),
      ],
    );
  }
}
