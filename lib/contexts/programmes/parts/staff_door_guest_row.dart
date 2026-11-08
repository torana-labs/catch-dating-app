import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One household or guest at a function's door: who they are, how many are
/// expected and, as the button, the door's next move for them (Check in N,
/// or Undo once they are in). A selected row carries its [footer] below the
/// text, such as the stepper for how many arrived.
class StaffDoorGuestRow extends StatelessWidget {
  const StaffDoorGuestRow({
    super.key,
    required this.guest,
    required this.onTap,
    required this.onAction,
    this.queued,
    this.doorOpen = true,
    this.footer,
  });

  final ProgramDoorGuest guest;

  /// The latest door change this phone holds for the guest, if any.
  final ProgramOperationOutboxStatus? queued;

  /// The function takes check-ins; a closed door shows no buttons.
  final bool doorOpen;
  final VoidCallback onTap;
  final VoidCallback onAction;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final party = guest.partySize ?? 1;
    final checkedIn =
        guest.attendanceStatus == ProgramFunctionAttendanceStatus.checkedIn;
    return CatchIndexRow(
      title: guest.displayName,
      subtitle: [
        ?guest.householdLabel,
        if (checkedIn)
          l10n.hostStaffDoorPartyIn(count: party)
        else
          l10n.hostStaffDoorPartyExpected(count: party),
        if (guest.attendanceStatus == ProgramFunctionAttendanceStatus.noShow)
          l10n.hostStaffDoorNoShow,
        ?guest.responseNote,
      ].join(' · '),
      titleMaxLines: 2,
      selected: footer != null,
      footer: footer,
      badge: switch (queued) {
        ProgramOperationOutboxStatus.needsReview => CatchIndexRowBadge(
          label: l10n.hostStaffRefused,
          tone: CatchBadgeTone.danger,
          icon: CatchIcons.offline,
        ),
        ProgramOperationOutboxStatus.pending => CatchIndexRowBadge(
          label: l10n.hostStaffNotSent,
          tone: CatchBadgeTone.warning,
          icon: CatchIcons.offline,
        ),
        null when !guest.invited => CatchIndexRowBadge(
          label: l10n.hostStaffDoorWalkIn,
        ),
        null => null,
      },
      onTap: onTap,
      action: !doorOpen || footer != null
          ? null
          : CatchIndexRowAction(
              label: checkedIn
                  ? l10n.hostStaffDoorUndo
                  : party > 1
                  ? l10n.hostStaffDoorCheckInCount(count: party)
                  : l10n.hostStaffDoorCheckIn,
              variant: checkedIn
                  ? CatchIndexRowActionVariant.secondary
                  : CatchIndexRowActionVariant.primary,
              onPressed: queued == ProgramOperationOutboxStatus.needsReview
                  ? null
                  : onAction,
            ),
    );
  }
}
