part of 'use_cases.dart';

ProgramOperationOutboxStore _previewJournal() {
  final storage = MemoryCommandJournalStorage();
  return createProgramOperationJournal(
    storage: () async => storage,
    currentAccountId: () => 'uid_greeter',
  );
}

class _PreviewMutator implements ProgramOperationsMutator {
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
  }) async => const ProgramMutationResult(
    entityId: 'leg',
    revision: 2,
    alreadyApplied: false,
  );

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
  }) async => const DispatchResult(
    tripId: 'trip_preview',
    revision: 1,
    alreadyApplied: false,
    passengerCount: 0,
  );

  @override
  Future<ProgramDoorJournalBatch> recordDoorAction({
    required String programId,
    required String functionId,
    required Map<String, Object?> operation,
  }) async => const ProgramDoorJournalBatch(
    entityId: 'fn',
    revision: 2,
    results: [],
    appendedCount: 1,
    duplicateCount: 0,
    rejectedCount: 0,
    alreadyApplied: false,
  );

  @override
  Future<ProgramMutationResult> createWalkIn({
    required String programId,
    required String functionId,
    required String displayName,
    required DateTime occurredAt,
    required String clientOperationId,
    int? partySize,
    String? note,
  }) async => const ProgramMutationResult(
    entityId: 'guest',
    revision: 1,
    alreadyApplied: false,
  );
}

List<Override> _programOverrides() {
  return [
    programProjectionClockProvider.overrideWithValue(() => _now),
    uidProvider.overrideWithValue(const AsyncData<String?>('uid_greeter')),
    programOperationsOutboxProvider.overrideWithValue(
      ProgramOperationsOutbox(_previewJournal(), _PreviewMutator()),
    ),
    isObviouslyOfflineProvider.overrideWithValue(false),
    programWorkEntryProvider(_programId, null).overrideWithValue(
      AsyncData((value: _access, snapshotAt: null, snapshotExpiresAt: null)),
    ),
    programArrivalsStreamProvider(
      _programId,
      _pickupPointId,
    ).overrideWithValue(AsyncData(_roster)),
    programTransportPlanProvider(
      _programId,
      _pickupPointId,
    ).overrideWithValue(AsyncData(_plan)),
    programHotelInboundStreamProvider(
      _programId,
      _hotelId,
    ).overrideWithValue(AsyncData(_inbound)),
    programTripsStreamProvider(_programId).overrideWithValue(AsyncData(_trips)),
    programStakeholderCountsProvider(
      _programId,
    ).overrideWithValue(AsyncData(_stakeholderCounts)),
    programVendorsStreamProvider(_programId).overrideWithValue(
      const AsyncData(<ProgramVendorOption>[
        ProgramVendorOption(
          vendorId: 'vendor_meru',
          name: 'Driftwood Cabs',
          active: true,
          boundToProgram: true,
        ),
      ]),
    ),
  ];
}
