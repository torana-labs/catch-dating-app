import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_arrival_row.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_arrivals_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The greeter's curb in board order: how many are out, the three counts,
/// the parties that need someone as notices with their moves, the parties
/// at the curb and the flights still landing.
class StaffArrivalsBody extends StatelessWidget {
  const StaffArrivalsBody({
    super.key,
    required this.state,
    required this.onMove,
    required this.onOpen,
    required this.onRetry,
    this.notices,
  });

  final StaffArrivalsState state;
  final void Function(ArrivalsRosterRow row, StaffArrivalMove move) onMove;
  final ValueChanged<ArrivalsRosterRow> onOpen;
  final VoidCallback onRetry;

  /// The offline, unsent-work and failure notices, when any show.
  final Widget? notices;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case StaffArrivalsStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case StaffArrivalsStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostStaffArrivalsErrorTitle,
            message: l10n.hostStaffJobsErrorBody,
            retryLabel: l10n.hostStaffTryAgain,
            onRetry: onRetry,
          ),
        );
      case StaffArrivalsStatus.content:
        break;
    }
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(
          l10n.hostStaffArrivalsHeadline(count: state.curbPeople),
          variant: CatchTextVariant.pageTitle,
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostStaffArrivalsStatLanding,
              value: '${state.landingPeople}',
            ),
            CatchMetricTile.stat(
              label: l10n.hostStaffArrivalsStatSent,
              value: '${state.sent}',
            ),
            CatchMetricTile.stat(
              label: l10n.hostStaffArrivalsStatNeedsYou,
              value: '${state.needsYou.length}',
              noteTone: CatchMetricTileTone.warning,
            ),
          ],
        ),
        ?notices,
        if (state.needsYou.isNotEmpty)
          CatchSection(
            title: l10n.hostStaffArrivalsNeedsYou,
            dividers: CatchSectionPlacement.none,
            children: [
              for (final arrival in state.needsYou)
                _StaffArrivalNotice(
                  arrival: arrival,
                  onMove: (move) => onMove(arrival.row, move),
                ),
            ],
          ),
        CatchSection(
          title: l10n.hostStaffArrivalsAtCurb,
          empty: l10n.hostStaffArrivalsAtCurbEmpty,
          children: [
            for (final arrival in state.atCurb)
              StaffArrivalRow(
                key: ValueKey<String>('staff-arrival-${arrival.row.legId}'),
                row: arrival.row,
                queued: arrival.queued,
                blocked: arrival.blocked,
                onMove: (move) => onMove(arrival.row, move),
                onOpen: () => onOpen(arrival.row),
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostStaffArrivalsLanding,
          empty: l10n.hostStaffArrivalsLandingEmpty,
          children: [
            for (final arrival in state.landing)
              StaffArrivalRow(
                key: ValueKey<String>('staff-arrival-${arrival.row.legId}'),
                row: arrival.row,
                queued: arrival.queued,
                blocked: arrival.blocked,
                landing: true,
                onMove: (move) => onMove(arrival.row, move),
                onOpen: () => onOpen(arrival.row),
              ),
          ],
        ),
      ],
    );
  }
}

/// A party that needs someone: who and how many, what happened to their
/// flight, and their first two moves as buttons.
class _StaffArrivalNotice extends StatelessWidget {
  const _StaffArrivalNotice({required this.arrival, required this.onMove});

  final StaffArrival arrival;
  final ValueChanged<StaffArrivalMove> onMove;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final row = arrival.row;
    final (status, _) = staffArrivalFlightStatus(l10n, row);
    final moves = staffArrivalMoves(row).take(2).toList(growable: false);
    return CatchNotice.inline(
      key: ValueKey<String>('staff-arrival-notice-${row.legId}'),
      tone: CatchNoticeTone.warning,
      icon: CatchIcons.safetyAlert,
      title: l10n.hostStaffArrivalsNoticeTitle(
        party: row.partyTitle,
        count: row.passengers,
      ),
      body: [
        ?staffArrivalFlight(l10n, row),
        status,
        l10n.hostStaffArrivalsFor(destination: row.destinationLabel),
      ].join(' · '),
      footer: moves.isEmpty
          ? null
          : CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                for (final (index, move) in moves.indexed)
                  CatchButton(
                    label: staffArrivalMoveLabel(l10n, move),
                    size: CatchButtonSize.md,
                    variant: index == 0
                        ? CatchButtonVariant.primary
                        : CatchButtonVariant.quiet,
                    onPressed: arrival.blocked ? null : () => onMove(move),
                  ),
              ],
            ),
    );
  }
}
