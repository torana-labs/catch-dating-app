import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_dispatch_car.dart';
import 'package:flutter/foundation.dart';

/// One suggested car with its parties named from the roster and whether
/// this phone already sent it.
@immutable
class StaffDispatchCarState {
  const StaffDispatchCarState({
    required this.group,
    required this.parties,
    required this.sent,
    this.seats,
  });

  final TransportGroupSuggestion group;
  final List<StaffDispatchParty> parties;

  /// A dispatch for these parties waits in this phone's outbox.
  final bool sent;
  final int? seats;
}

/// Where dispatch is: reading the plan, showing it, or unable to read it.
enum StaffDispatchStatus { loading, content, error }

/// The dispatcher's desk as plain values: the cars the plan suggests and
/// the parties it could not place.
@immutable
class StaffDispatchState {
  const StaffDispatchState({
    required this.status,
    this.cars = const <StaffDispatchCarState>[],
    this.unplaced = const <TransportUnassignedReason>[],
    this.savedAt,
  });

  const StaffDispatchState.loading()
    : this(status: StaffDispatchStatus.loading);

  const StaffDispatchState.error() : this(status: StaffDispatchStatus.error);

  /// Names each suggestion's parties from [roster] (when it has loaded) and
  /// marks the cars [outbox] already holds a dispatch for.
  factory StaffDispatchState.fromPlan(
    ProgramTransportPlan plan, {
    required ProgramOperationOutboxSummary outbox,
    required List<ProgramVehicleClass> vehicleClasses,
    ProgramArrivalsRoster? roster,
    DateTime? savedAt,
  }) {
    final rows = {
      for (final row in roster?.rows ?? const <ArrivalsRosterRow>[])
        row.legId: row,
    };
    final queuedLegs = {
      for (final entry in outbox.entries)
        if (entry.kind == ProgramOperationKind.dispatch)
          ...(entry.payload['legIds']! as List).cast<String>(),
    };
    final seats = {
      for (final vehicle in vehicleClasses)
        vehicle.id: vehicle.passengerCapacity,
    };
    return StaffDispatchState(
      status: StaffDispatchStatus.content,
      cars: [
        for (final group in plan.groups)
          StaffDispatchCarState(
            group: group,
            seats: seats[group.vehicleClassId],
            sent: group.legIds.any(queuedLegs.contains),
            parties: [
              for (final legId in group.legIds)
                if (rows[legId] case final row?)
                  StaffDispatchParty(
                    title: row.partyTitle,
                    passengers: row.passengers,
                    ready: row.readiness == TravelLegReadiness.ready,
                  ),
            ],
          ),
      ],
      unplaced: [for (final item in plan.unassigned) item.reason],
      savedAt: savedAt,
    );
  }

  final StaffDispatchStatus status;
  final List<StaffDispatchCarState> cars;

  /// Why each party the plan could not place was left out.
  final List<TransportUnassignedReason> unplaced;

  /// When this phone saved the plan it shows, while offline.
  final DateTime? savedAt;
}
