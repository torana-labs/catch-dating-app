import 'package:catch_dating_app/contexts/programmes/domain/program_departures_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Where the departures are: reading, showing, or unable to read.
enum StaffDeparturesStatus { loading, content, error }

/// The hotel's departures desk (RbProgDepartures): how many leave soon,
/// the counts, the next car and who is leaving next with where they are.
class StaffDeparturesBody extends StatelessWidget {
  const StaffDeparturesBody({
    super.key,
    required this.status,
    required this.now,
    required this.onRetry,
    this.roster,
  });

  final StaffDeparturesStatus status;
  final ProgramDeparturesRoster? roster;
  final DateTime now;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (status) {
      case StaffDeparturesStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case StaffDeparturesStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostStaffDeparturesErrorTitle,
            message: l10n.hostStaffJobsErrorBody,
            retryLabel: l10n.hostStaffTryAgain,
            onRetry: onRetry,
          ),
        );
      case StaffDeparturesStatus.content:
        break;
    }
    final loaded = roster!;
    final leaving = loaded.leaving;
    final next = leaving
        .where((row) => row.state != ProgramDepartureState.carNotNeeded)
        .firstOrNull;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(
          l10n.hostStaffDeparturesTitleCount(count: loaded.leavingSoon),
          variant: CatchTextVariant.pageTitle,
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostStaffDeparturesCheckedOut,
              value: '${loaded.checkedOut}',
            ),
            CatchMetricTile.stat(
              label: l10n.hostStaffDeparturesSoon,
              value: '${loaded.leavingSoon}',
            ),
            CatchMetricTile.stat(
              label: l10n.hostStaffDeparturesLate,
              value: '${loaded.lateCheckouts}',
            ),
          ],
        ),
        if (next != null && next.leaveBy != null)
          CatchNotice.inline(
            icon: CatchIcons.route,
            title: l10n.hostStaffDeparturesNextCar(
              time: AppTimeFormatters.time(next.leaveBy!),
            ),
            body: next.partyLabel ?? next.guestDisplayName,
          ),
        CatchSection(
          title: l10n.hostStaffDeparturesLeavingNext,
          empty: l10n.hostStaffDeparturesEmpty,
          children: [
            for (final row in leaving)
              StaffDepartureRow(
                key: ValueKey<String>('staff-departure-${row.legId}'),
                row: row,
                now: now,
              ),
          ],
        ),
      ],
    );
  }
}

/// One departing guest: when their car leaves, who, their flight and room,
/// and where they are.
class StaffDepartureRow extends StatelessWidget {
  const StaffDepartureRow({super.key, required this.row, required this.now});

  final ProgramDepartureRow row;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final late =
        row.state == ProgramDepartureState.inRoom &&
        row.leaveBy != null &&
        row.leaveBy!.isBefore(now);
    return CatchIndexRow(
      title: row.partyLabel ?? row.guestDisplayName,
      onTap: null,
      time: row.leaveBy == null ? null : AppTimeFormatters.time(row.leaveBy!),
      subtitle: [
        ?row.flightNumber,
        if (row.roomLabel case final room?)
          l10n.hostStaffDeparturesRoom(room: room),
        l10n.hostStaffDeparturesPeople(count: row.passengers),
      ].join(' · '),
      status: switch (row.state) {
        ProgramDepartureState.checkedOut => l10n.hostStaffDeparturesStateOut,
        ProgramDepartureState.carNotNeeded =>
          l10n.hostStaffDeparturesStateNoCar,
        ProgramDepartureState.left => l10n.hostStaffDeparturesStateLeft,
        ProgramDepartureState.inRoom => l10n.hostStaffDeparturesStateRoom,
      },
      statusTone: late
          ? CatchIndexRowTone.warning
          : row.state == ProgramDepartureState.checkedOut
          ? CatchIndexRowTone.success
          : CatchIndexRowTone.neutral,
    );
  }
}
