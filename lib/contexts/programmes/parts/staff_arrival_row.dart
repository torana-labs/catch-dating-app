import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_function_row.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// What a greeter can record for a party: take it, let it go, say it is out
/// at the curb, or flag a problem. Each goes through the operations outbox
/// as a readiness observation.
enum StaffArrivalMove { claim, release, ready, disrupted }

/// The observation name the readiness command takes for [move].
String staffArrivalWireAction(StaffArrivalMove move) => switch (move) {
  StaffArrivalMove.claim => 'claim',
  StaffArrivalMove.release => 'unclaim',
  StaffArrivalMove.ready => 'markReady',
  StaffArrivalMove.disrupted => 'markDisrupted',
};

/// The moves a party allows right now, most useful first.
List<StaffArrivalMove> staffArrivalMoves(ArrivalsRosterRow row) => [
  if (row.readiness == TravelLegReadiness.expected ||
      row.readiness == TravelLegReadiness.disrupted)
    StaffArrivalMove.ready,
  if (row.claimedByDisplay == null) StaffArrivalMove.claim,
  if (row.claimedByMe) StaffArrivalMove.release,
  if (row.readiness != TravelLegReadiness.disrupted &&
      row.readiness != TravelLegReadiness.arrived)
    StaffArrivalMove.disrupted,
];

/// The label a greeter reads for [move].
String staffArrivalMoveLabel(AppLocalizations l10n, StaffArrivalMove move) =>
    switch (move) {
      StaffArrivalMove.claim => l10n.hostStaffArrivalsClaim,
      StaffArrivalMove.release => l10n.hostStaffArrivalsRelease,
      StaffArrivalMove.ready => l10n.hostStaffArrivalsReady,
      StaffArrivalMove.disrupted => l10n.hostStaffArrivalsDisrupted,
    };

/// The party, how many and where they go, who has them and how they reach
/// the curb: "4 people · for Taj Fateh Prakash · yours".
String staffArrivalSummary(AppLocalizations l10n, ArrivalsRosterRow row) => [
  l10n.hostStaffArrivalsPeople(count: row.passengers),
  l10n.hostStaffArrivalsFor(destination: row.destinationLabel),
  if (row.luggageUnits > 0) l10n.hostStaffArrivalsBags(count: row.luggageUnits),
  if (row.claimedByMe)
    l10n.hostStaffArrivalsYours
  else if (row.claimedByDisplay case final name? when name.isNotEmpty)
    l10n.hostStaffArrivalsWith(name: name),
].join(' · ');

/// The flight and terminal a party comes in on: "6E 2134 from DEL · T1".
String? staffArrivalFlight(AppLocalizations l10n, ArrivalsRosterRow row) {
  final flight = row.flightNumber;
  if (flight == null) return null;
  return [
    if (row.originIata case final origin?)
      l10n.hostStaffArrivalsFlightFrom(flight: flight, origin: origin)
    else
      flight,
    if (row.arrivalTerminal case final terminal?)
      l10n.hostStaffArrivalsTerminal(terminal: terminal),
  ].join(' · ');
}

/// The flight's state as a row status and its tone.
(String, CatchIndexRowTone) staffArrivalFlightStatus(
  AppLocalizations l10n,
  ArrivalsRosterRow row,
) => switch (row.unavailableReason) {
  TimingUnavailableReason.diverted => (
    l10n.hostStaffArrivalsDiverted,
    CatchIndexRowTone.danger,
  ),
  TimingUnavailableReason.cancelled => (
    l10n.hostStaffArrivalsCancelled,
    CatchIndexRowTone.danger,
  ),
  _ => switch (row.flightStatus) {
    TravelLegFlightStatus.landed => (
      l10n.hostStaffArrivalsLanded,
      CatchIndexRowTone.success,
    ),
    TravelLegFlightStatus.delayed => (
      l10n.hostStaffArrivalsLate,
      CatchIndexRowTone.warning,
    ),
    TravelLegFlightStatus.diverted => (
      l10n.hostStaffArrivalsDiverted,
      CatchIndexRowTone.danger,
    ),
    TravelLegFlightStatus.cancelled => (
      l10n.hostStaffArrivalsCancelled,
      CatchIndexRowTone.danger,
    ),
    TravelLegFlightStatus.enroute || TravelLegFlightStatus.scheduled => (
      l10n.hostStaffArrivalsOnTime,
      CatchIndexRowTone.neutral,
    ),
    TravelLegFlightStatus.unknown => (
      l10n.hostStaffArrivalsNoEstimate,
      CatchIndexRowTone.neutral,
    ),
  },
};

/// One party on the greeter's roster: at the curb with its claim, or still
/// landing with its curb time and flight. The row's button is the party's
/// first move; tapping the row opens every move.
class StaffArrivalRow extends StatelessWidget {
  const StaffArrivalRow({
    super.key,
    required this.row,
    required this.onMove,
    required this.onOpen,
    this.queued,
    this.blocked = false,
    this.landing = false,
  });

  final ArrivalsRosterRow row;

  /// The latest change this phone holds for the party, if any.
  final ProgramOperationOutboxStatus? queued;

  /// The party takes no new move until its saved change is sent or looked at.
  final bool blocked;

  /// Still landing: the row leads with the curb time and the flight.
  final bool landing;
  final ValueChanged<StaffArrivalMove> onMove;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final moves = staffArrivalMoves(row);
    final first = moves.firstOrNull;
    final (status, tone) = staffArrivalFlightStatus(l10n, row);
    final flight = staffArrivalFlight(l10n, row);
    return CatchIndexRow(
      title: row.partyTitle,
      subtitle: landing
          ? [
              ?flight,
              l10n.hostStaffArrivalsPeople(count: row.passengers),
            ].join(' · ')
          : staffArrivalSummary(l10n, row),
      time: landing && row.curbAt != null ? staffClock(row.curbAt!) : null,
      status: landing ? status : null,
      statusTone: tone,
      badge: switch (queued) {
        null => null,
        ProgramOperationOutboxStatus.needsReview => CatchIndexRowBadge(
          label: l10n.hostStaffRefused,
          tone: CatchBadgeTone.danger,
          icon: CatchIcons.offline,
        ),
        _ => CatchIndexRowBadge(
          label: l10n.hostStaffNotSent,
          tone: CatchBadgeTone.warning,
          icon: CatchIcons.offline,
        ),
      },
      titleMaxLines: 2,
      density: landing ? CatchIndexRowSize.compact : null,
      onTap: onOpen,
      action: first == null
          ? null
          : CatchIndexRowAction(
              label: staffArrivalMoveLabel(l10n, first),
              variant: row.claimedByMe || first == StaffArrivalMove.ready
                  ? CatchIndexRowActionVariant.primary
                  : CatchIndexRowActionVariant.secondary,
              onPressed: blocked ? null : () => onMove(first),
            ),
    );
  }
}
