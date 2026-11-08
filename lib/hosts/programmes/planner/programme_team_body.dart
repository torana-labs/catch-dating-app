import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_reports_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_view.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_views.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The groups the team board shows, each a set of duties.
enum HostProgrammeTeamGroup { running, guests, airport, hotels, doors, family }

HostProgrammeTeamGroup programmeTeamGroup(ProgramStaffDuty duty) =>
    switch (duty) {
      ProgramStaffDuty.programAdmin ||
      ProgramStaffDuty.programCoordinator => HostProgrammeTeamGroup.running,
      ProgramStaffDuty.guestRelations ||
      ProgramStaffDuty.communications => HostProgrammeTeamGroup.guests,
      ProgramStaffDuty.airportGreeter ||
      ProgramStaffDuty.transportDispatcher => HostProgrammeTeamGroup.airport,
      ProgramStaffDuty.hotelDesk => HostProgrammeTeamGroup.hotels,
      ProgramStaffDuty.functionCheckIn ||
      ProgramStaffDuty.functionLead => HostProgrammeTeamGroup.doors,
      ProgramStaffDuty.reconciliationViewer ||
      ProgramStaffDuty.stakeholderViewer => HostProgrammeTeamGroup.family,
    };

String programmeDutyLabel(AppLocalizations l10n, ProgramStaffDuty duty) =>
    switch (duty) {
      ProgramStaffDuty.programAdmin => l10n.hostProgrammeDutyAdmin,
      ProgramStaffDuty.programCoordinator => l10n.hostProgrammeDutyCoordinator,
      ProgramStaffDuty.guestRelations => l10n.hostProgrammeDutyGuestRelations,
      ProgramStaffDuty.communications => l10n.hostProgrammeDutyCommunications,
      ProgramStaffDuty.functionCheckIn => l10n.hostProgrammeDutyDoor,
      ProgramStaffDuty.functionLead => l10n.hostProgrammeDutyLead,
      ProgramStaffDuty.airportGreeter => l10n.hostProgrammeDutyGreeter,
      ProgramStaffDuty.hotelDesk => l10n.hostProgrammeDutyHotelDesk,
      ProgramStaffDuty.transportDispatcher => l10n.hostProgrammeDutyDispatcher,
      ProgramStaffDuty.reconciliationViewer =>
        l10n.hostProgrammeDutyReconciliation,
      ProgramStaffDuty.stakeholderViewer => l10n.hostProgrammeDutyFamily,
    };

/// The team in board order: the views, three numbers, the access notice
/// and a section per group of people with their state.
class HostProgrammeTeamBody extends StatelessWidget {
  const HostProgrammeTeamBody({
    super.key,
    required this.state,
    required this.onView,
    required this.onRemove,
    required this.onRetry,
  });

  final HostProgrammeReport<ProgramStaffList> state;
  final ValueChanged<HostProgrammeView> onView;

  /// Null when nobody can be removed (an archived programme).
  final ValueChanged<ProgramStaffMember>? onRemove;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final staff = state.value;
    if (state.status != HostProgrammeStatus.ready || staff == null) {
      return HostProgrammeStateView(status: state.status, onRetry: onRetry);
    }
    final members = staff.members;
    final active = members
        .where((m) => m.status == ProgramStaffStatus.active)
        .length;
    final waiting = members
        .where((m) => m.status == ProgramStaffStatus.approvalRequired)
        .length;
    final byGroup = <HostProgrammeTeamGroup, List<ProgramStaffMember>>{};
    for (final member in members) {
      final first = member.duties.firstOrNull;
      final group = first == null
          ? HostProgrammeTeamGroup.running
          : programmeTeamGroup(first.duty);
      byGroup.putIfAbsent(group, () => []).add(member);
    }
    return CatchPageBody.screen(
      children: [
        HostProgrammeViews(selected: HostProgrammeView.team, onView: onView),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostProgrammeTeamPeople,
              value: '${members.length}',
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammeTeamJoined,
              value: '$active',
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammeTeamWaiting,
              value: '$waiting',
              mode: CatchMetricTileMode.plain,
            ),
          ],
        ),
        CatchNotice.inline(
          tone: CatchNoticeTone.neutral,
          icon: CatchIcons.protected,
          body: l10n.hostProgrammeTeamNotice,
        ),
        if (members.isEmpty)
          CatchEmptyState(
            icon: CatchIcons.people,
            title: l10n.hostProgrammeTeamEmpty,
          ),
        for (final group in HostProgrammeTeamGroup.values)
          if (byGroup[group] case final people?)
            CatchSection(
              key: ValueKey<String>('host-programme-team-${group.name}'),
              title: switch (group) {
                HostProgrammeTeamGroup.running => l10n.hostProgrammeTeamRunning,
                HostProgrammeTeamGroup.guests => l10n.hostProgrammeTeamGuests,
                HostProgrammeTeamGroup.airport => l10n.hostProgrammeTeamAirport,
                HostProgrammeTeamGroup.hotels => l10n.hostProgrammeTeamHotels,
                HostProgrammeTeamGroup.doors => l10n.hostProgrammeTeamDoors,
                HostProgrammeTeamGroup.family => l10n.hostProgrammeTeamFamily,
              },
              children: [
                for (final member in people)
                  CatchIndexRow(
                    key: ValueKey<String>('host-programme-staff-${member.uid}'),
                    leading: CatchAvatar.system(
                      size: CatchAvatarSize.md,
                      name: member.displayName,
                    ),
                    title: member.displayName,
                    subtitle: [
                      for (final duty in member.duties)
                        programmeDutyLabel(l10n, duty.duty),
                    ].join(' · '),
                    badge: switch (member.status) {
                      ProgramStaffStatus.active => CatchIndexRowBadge(
                        label: l10n.hostProgrammeTeamJoinedBadge,
                        tone: CatchBadgeTone.success,
                      ),
                      ProgramStaffStatus.approvalRequired => CatchIndexRowBadge(
                        label: l10n.hostProgrammeTeamInvitedBadge,
                        tone: CatchBadgeTone.warning,
                      ),
                      ProgramStaffStatus.expired => CatchIndexRowBadge(
                        label: l10n.hostProgrammeTeamExpiredBadge,
                      ),
                      ProgramStaffStatus.revoked => CatchIndexRowBadge(
                        label: l10n.hostProgrammeTeamRemovedBadge,
                      ),
                    },
                    action:
                        onRemove == null ||
                            member.status == ProgramStaffStatus.revoked
                        ? null
                        : CatchIndexRowAction(
                            label: l10n.hostProgrammeTeamRemove,
                            onPressed: () => onRemove!(member),
                          ),
                    onTap: null,
                  ),
              ],
            ),
      ],
    );
  }
}
