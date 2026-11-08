import 'package:catch_dating_app/contexts/programmes/domain/host_work_assignment.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Where the work list is: reading the grants, showing them, or unable to.
enum StaffAssignmentsStatus { loading, content, error }

/// Every programme and event this account works at, grouped by organiser,
/// each with its jobs and when access ends. A programme admin also gets the
/// team beside it.
class StaffAssignmentsBody extends StatelessWidget {
  const StaffAssignmentsBody({
    super.key,
    required this.status,
    required this.assignments,
    required this.onOpen,
    required this.onTeam,
    required this.onRetry,
  });

  final StaffAssignmentsStatus status;
  final List<HostWorkAssignment> assignments;
  final ValueChanged<HostWorkAssignment> onOpen;
  final ValueChanged<HostWorkAssignment> onTeam;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (status) {
      case StaffAssignmentsStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case StaffAssignmentsStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostStaffJobsErrorTitle,
            message: l10n.hostStaffJobsErrorBody,
            retryLabel: l10n.hostStaffTryAgain,
            onRetry: onRetry,
          ),
        );
      case StaffAssignmentsStatus.content:
        break;
    }
    if (assignments.isEmpty) {
      return CatchPageBody.screen(
        child: CatchEmptyState(
          icon: CatchIcons.locked,
          title: l10n.hostStaffWorkEmptyTitle,
          message: l10n.hostStaffWorkEmptyBody,
        ),
      );
    }
    final groups = <String, List<HostWorkAssignment>>{};
    for (final assignment in assignments) {
      groups.putIfAbsent(assignment.organizerName, () => []).add(assignment);
    }
    return CatchPageBody.screen(
      children: [
        for (final group in groups.entries)
          CatchSection(
            title: group.key,
            children: [
              for (final assignment in group.value)
                CatchIndexRow(
                  key: ValueKey<String>('staff-work-${assignment.scopeId}'),
                  icon: assignment.isProgram
                      ? CatchIcons.celebrate
                      : CatchIcons.ticket,
                  title: assignment.title,
                  subtitle: [
                    ?assignment.subtitle,
                    _duties(l10n, assignment),
                  ].where((part) => part.isNotEmpty).join(' · '),
                  meta: switch (assignment.grantExpiresAt) {
                    final endsAt? => l10n.hostStaffWorkEnds(
                      date: AppTimeFormatters.longDate(endsAt.toLocal()),
                    ),
                    null => null,
                  },
                  chevron: !staffAssignmentHasTeam(assignment),
                  action: staffAssignmentHasTeam(assignment)
                      ? CatchIndexRowAction(
                          label: l10n.hostStaffWorkTeam,
                          onPressed: () => onTeam(assignment),
                        )
                      : null,
                  onTap: () => onOpen(assignment),
                ),
            ],
          ),
      ],
    );
  }
}

/// A programme admin who also holds other jobs opens the team from the row.
bool staffAssignmentHasTeam(HostWorkAssignment assignment) =>
    assignment.isProgram &&
    assignment.duties.any((duty) => duty.duty == HostWorkDuty.programAdmin) &&
    assignment.duties.any((duty) => duty.duty != HostWorkDuty.programAdmin);

String _duties(AppLocalizations l10n, HostWorkAssignment assignment) =>
    assignment.duties
        .map(
          (duty) => switch (duty.duty) {
            HostWorkDuty.programAdmin ||
            HostWorkDuty.programCoordinator => l10n.hostStaffDutyCoordinator,
            HostWorkDuty.guestRelations => l10n.hostStaffDutyGuests,
            HostWorkDuty.communications => l10n.hostStaffDutyMessages,
            HostWorkDuty.functionCheckIn => l10n.hostStaffDutyDoor,
            HostWorkDuty.functionLead => l10n.hostStaffDutyLead,
            HostWorkDuty.airportGreeter => l10n.hostStaffDutyGreeter,
            HostWorkDuty.hotelDesk => l10n.hostStaffDutyHotel,
            HostWorkDuty.transportDispatcher => l10n.hostStaffDutyDispatch,
            HostWorkDuty.reconciliationViewer => l10n.hostStaffDutyReconcile,
            HostWorkDuty.stakeholderViewer => l10n.hostStaffDutyCounts,
            HostWorkDuty.eventLead => l10n.hostStaffDutyEventLead,
          },
        )
        .toSet()
        .join(' · ');
