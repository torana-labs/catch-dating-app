import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:catch_dating_app/contexts/programmes/domain/travel_leg_revision.dart';

class ProgramArrivalProjection {
  const ProgramArrivalProjection(this.row, this.afterObservation, this.blocked);
  final ArrivalsRosterRow row;
  final TravelLegObservationReference? afterObservation;
  final bool blocked;
}

/// Pending observations are explicitly local. They never change the revision
/// captured from the server, and conflicts/dispatches block further actions.
ProgramArrivalProjection projectProgramArrival(
  ArrivalsRosterRow source,
  ProgramOperationOutboxSummary outbox,
) {
  var readiness = source.readiness;
  var curbAt = source.curbAt;
  var curbSource = source.curbSource;
  var unavailable = source.unavailableReason;
  var claimedByMe = source.claimedByMe;
  var claimedByDisplay = source.claimedByDisplay;
  TravelLegObservationReference? predecessor;
  var blocked =
      readiness == TravelLegReadiness.dispatched ||
      readiness == TravelLegReadiness.arrived;
  for (final entry in outbox.entries) {
    if (!entry.affectsLeg(source.legId)) continue;
    if (entry.status == ProgramOperationOutboxStatus.needsReview) {
      blocked = true;
      continue;
    }
    if (blocked) continue;
    if (entry.kind == ProgramOperationKind.dispatch) {
      readiness = TravelLegReadiness.dispatched;
      blocked = true;
      continue;
    }
    final action = entry.payload['action']! as String;
    predecessor = TravelLegObservationReference(
      clientOperationId: entry.clientOperationId,
      action: action,
    );
    switch (action) {
      case 'claim':
        claimedByMe = true;
        claimedByDisplay = '';
      case 'unclaim':
        claimedByMe = false;
        claimedByDisplay = null;
      case 'markReady':
        if (readiness != TravelLegReadiness.ready) curbAt = entry.createdAt;
        readiness = TravelLegReadiness.ready;
        curbSource = CurbSource.ready;
        unavailable = null;
      case 'markDisrupted':
        readiness = TravelLegReadiness.disrupted;
        curbAt = null;
        curbSource = null;
    }
  }
  return ProgramArrivalProjection(
    ArrivalsRosterRow(
      legId: source.legId,
      guestId: source.guestId,
      partyId: source.partyId,
      guestDisplayName: source.guestDisplayName,
      partyLabel: source.partyLabel,
      partyGuestIds: source.partyGuestIds,
      passengers: source.passengers,
      luggageUnits: source.luggageUnits,
      flightNumber: source.flightNumber,
      originIata: source.originIata,
      arrivalTerminal: source.arrivalTerminal,
      flightStatus: source.flightStatus,
      curbAt: curbAt,
      curbSource: curbSource,
      unavailableReason: unavailable,
      readiness: readiness,
      claimedByDisplay: claimedByDisplay,
      claimedByMe: claimedByMe,
      destinationHotelId: source.destinationHotelId,
      destinationLabel: source.destinationLabel,
      requiredCapabilities: source.requiredCapabilities,
      dedicatedVehicle: source.dedicatedVehicle,
      revision: source.revision,
    ),
    predecessor,
    blocked,
  );
}
