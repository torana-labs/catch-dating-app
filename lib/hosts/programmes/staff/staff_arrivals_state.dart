import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operation_projection.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:flutter/foundation.dart';

/// One party as the greeter sees it, with this phone's unsent change folded
/// in.
@immutable
class StaffArrival {
  const StaffArrival({required this.row, required this.blocked, this.queued});

  final ArrivalsRosterRow row;

  /// A refused change or a dispatch holds the party; no new move.
  final bool blocked;

  /// The latest change this phone holds for the party.
  final ProgramOperationOutboxStatus? queued;
}

/// Where the arrivals roster is: reading, showing, or unable to read.
enum StaffArrivalsStatus { loading, content, error }

/// The greeter's roster as plain values: parties that need someone, those
/// at the curb by curb time, those still landing, and the counts above.
@immutable
class StaffArrivalsState {
  const StaffArrivalsState({
    required this.status,
    this.needsYou = const <StaffArrival>[],
    this.atCurb = const <StaffArrival>[],
    this.landing = const <StaffArrival>[],
    this.sent = 0,
    this.generatedAt,
    this.savedAt,
  });

  const StaffArrivalsState.loading()
    : this(status: StaffArrivalsStatus.loading);

  const StaffArrivalsState.error() : this(status: StaffArrivalsStatus.error);

  /// Sorts [roster] with [outbox] folded in: every saved change shows as
  /// the party's state until the server answers.
  factory StaffArrivalsState.fromRoster(
    ProgramArrivalsRoster roster, {
    required ProgramOperationOutboxSummary outbox,
    DateTime? savedAt,
  }) {
    final arrivals = <StaffArrival>[];
    for (final source in roster.rows) {
      final projection = projectProgramArrival(source, outbox);
      arrivals.add(
        StaffArrival(
          row: projection.row,
          blocked: projection.blocked,
          queued: outbox.forLeg(source.legId)?.status,
        ),
      );
    }
    int byCurb(StaffArrival a, StaffArrival b) {
      final epoch = DateTime.fromMillisecondsSinceEpoch(0);
      return (a.row.curbAt ?? epoch).compareTo(b.row.curbAt ?? epoch);
    }

    final needsYou = [
      for (final arrival in arrivals)
        if (arrival.row.needsAttention) arrival,
    ];
    return StaffArrivalsState(
      status: StaffArrivalsStatus.content,
      needsYou: needsYou,
      atCurb: [
        for (final arrival in arrivals)
          if (!arrival.row.needsAttention &&
              arrival.row.readiness == TravelLegReadiness.ready)
            arrival,
      ]..sort(byCurb),
      landing: [
        for (final arrival in arrivals)
          if (!arrival.row.needsAttention &&
              arrival.row.readiness == TravelLegReadiness.expected)
            arrival,
      ]..sort(byCurb),
      sent: arrivals
          .where(
            (arrival) =>
                arrival.row.readiness == TravelLegReadiness.dispatched ||
                arrival.row.readiness == TravelLegReadiness.arrived,
          )
          .fold(0, (sum, arrival) => sum + arrival.row.passengers),
      generatedAt: roster.generatedAt,
      savedAt: savedAt,
    );
  }

  final StaffArrivalsStatus status;
  final List<StaffArrival> needsYou;
  final List<StaffArrival> atCurb;
  final List<StaffArrival> landing;

  /// People already sent on to their hotels.
  final int sent;

  /// When the server built the roster.
  final DateTime? generatedAt;

  /// When this phone saved the roster it shows, while offline.
  final DateTime? savedAt;

  /// People out at the curb.
  int get curbPeople =>
      atCurb.fold(0, (sum, arrival) => sum + arrival.row.passengers);

  /// People still to land.
  int get landingPeople =>
      landing.fold(0, (sum, arrival) => sum + arrival.row.passengers);
}
