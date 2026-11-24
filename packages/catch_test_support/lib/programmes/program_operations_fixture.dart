import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/travel_leg_revision.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeProgramMutator implements ProgramOperationsMutator {
  final List<String> calls = [];
  Object? error;
  bool failOnce = false;
  DateTime? lastDeparture;
  DateTime? lastObservation;
  final List<TravelLegObservationReference?> observationPredecessors = [];
  List<DispatchLegRevision> lastFences = [];

  Object? _maybeError() {
    if (failOnce) {
      final failure = error;
      error = null;
      return failure;
    }
    return error;
  }

  @override
  Future<ProgramMutationResult> setReadiness({
    required String programId,
    required String legId,
    required String action,
    required String clientOperationId,
    required int expectedRevision,
    required DateTime observedAt,
    TravelLegObservationReference? afterObservation,
    int? manualCurbAtMillis,
    String? manualCurbNote,
  }) async {
    calls.add('obs:$legId:$action:$clientOperationId');
    lastObservation = observedAt;
    observationPredecessors.add(afterObservation);
    if (_maybeError() case final failure?) throw failure;
    return const ProgramMutationResult(
      entityId: 'leg',
      revision: 2,
      alreadyApplied: false,
    );
  }

  @override
  Future<DispatchResult> dispatchTrip({
    required String programId,
    required String pickupPointId,
    required String vehicleClassId,
    required String plateDisplay,
    required List<String> legIds,
    required DateTime departedAt,
    required String clientOperationId,
    String? destinationHotelId,
    String? destinationLabel,
    String? vendorId,
    required List<DispatchLegRevision> expectedLegRevisions,
  }) async {
    calls.add('dispatch:$plateDisplay:$clientOperationId');
    lastDeparture = departedAt;
    lastFences = expectedLegRevisions;
    if (_maybeError() case final failure?) throw failure;
    return const DispatchResult(
      tripId: 'trip_1',
      revision: 1,
      alreadyApplied: false,
      passengerCount: 3,
    );
  }

  @override
  Future<ProgramDoorJournalBatch> recordDoorAction({
    required String programId,
    required String functionId,
    required Map<String, Object?> operation,
  }) async {
    calls.add('door:${operation['guestId']}:${operation['action']}');
    if (_maybeError() case final failure?) throw failure;
    return const ProgramDoorJournalBatch(
      entityId: 'fn',
      revision: 2,
      results: [],
      appendedCount: 1,
      duplicateCount: 0,
      rejectedCount: 0,
      alreadyApplied: false,
    );
  }

  @override
  Future<ProgramMutationResult> createWalkIn({
    required String programId,
    required String functionId,
    required String displayName,
    required DateTime occurredAt,
    required String clientOperationId,
    int? partySize,
    String? note,
  }) async {
    calls.add('walkin:$displayName:$clientOperationId');
    if (_maybeError() case final failure?) throw failure;
    return const ProgramMutationResult(
      entityId: 'guest',
      revision: 1,
      alreadyApplied: false,
    );
  }
}

ArrivalsRosterRow arrivalRow({
  String legId = 'leg-1',
  TravelLegReadiness readiness = TravelLegReadiness.expected,
}) => ArrivalsRosterRow(
  legId: legId,
  guestId: 'guest-$legId',
  partyId: null,
  guestDisplayName: 'Demo Guest',
  partyLabel: null,
  partyGuestIds: const [],
  passengers: 1,
  luggageUnits: 1,
  flightNumber: 'AI-847',
  originIata: 'BOM',
  arrivalTerminal: '3',
  flightStatus: TravelLegFlightStatus.landed,
  curbAt: null,
  curbSource: null,
  unavailableReason: null,
  readiness: readiness,
  claimedByDisplay: null,
  claimedByMe: false,
  destinationHotelId: 'hotel-1',
  destinationLabel: 'Demo Hotel',
  requiredCapabilities: const {},
  dedicatedVehicle: false,
  revision: 7,
);

ProgramReadSnapshotStore emptyProgramSnapshots() {
  SharedPreferences.setMockInitialValues({});
  return SharedPreferencesProgramReadSnapshotStore();
}
