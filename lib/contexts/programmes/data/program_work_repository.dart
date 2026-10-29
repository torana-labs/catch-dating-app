import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_policy.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/travel_leg_revision.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_work_repository.g.dart';
part 'program_work_repository_door.dart';
part 'program_work_repository_reports.dart';
part 'program_work_repository_rooms.dart';

/// Operational program surface: work access, arrivals roster, transport
/// plan, readiness claims, dispatch, trip lifecycle and hotel inbound.
///
/// All reads are server-side scoped projections; the client never reads the
/// program collections directly.
class ProgramWorkRepository {
  const ProgramWorkRepository(
    this._functions,
    this._snapshots,
    this._currentAccountId,
  );

  final FirebaseFunctions _functions;
  final ProgramReadSnapshotStore _snapshots;
  final String? Function() _currentAccountId;

  Future<ProgramWorkAccess> getWorkAccess(
    String programId, {
    String? snapshotAccountId,
  }) => _call(
    name: 'getProgramWorkAccess',
    authorityScopedRead: true,
    payload: ProgramIdCallableRequest(programId: programId).toJson(),
    action: 'load program access',
    parse: ProgramWorkAccess.fromCallableData,
    snapshotScope: programSnapshotScope('work', programId),
    snapshotAccountId: snapshotAccountId,
  );

  /// Redeems a staff invite for the signed-in account. The callable requires
  /// the account's verified phone to match the invite's bound number.
  Future<String> claimStaffInvite(String inviteId) => _call(
    name: 'claimProgramStaffInvite',
    payload: ClaimProgramStaffInviteCallableRequest(
      inviteId: inviteId,
    ).toJson(),
    action: 'claim the staff invite',
    parse: (value) =>
        requiredString(requiredMap(value, 'invite claim'), 'programId'),
  );

  Future<ProgramArrivalsRoster> getArrivalsRoster({
    required String programId,
    String? pickupPointId,
    String? snapshotAccountId,
  }) => _call(
    name: 'getProgramArrivalsRoster',
    authorityScopedRead: true,
    payload: ProgramStationScopeCallableRequest(
      programId: programId,
      pickupPointId: pickupPointId,
    ).toJson(),
    action: 'load the arrivals roster',
    parse: ProgramArrivalsRoster.fromCallableData,
    snapshotScope: programSnapshotScope('arrivals', programId, pickupPointId),
    snapshotAccountId: snapshotAccountId,
  );

  Future<ProgramTransportPlan> getTransportPlan({
    required String programId,
    String? pickupPointId,
    String? snapshotAccountId,
  }) => _call(
    name: 'getProgramTransportPlan',
    authorityScopedRead: true,
    payload: ProgramStationScopeCallableRequest(
      programId: programId,
      pickupPointId: pickupPointId,
    ).toJson(),
    action: 'load the transport plan',
    parse: ProgramTransportPlan.fromCallableData,
    snapshotScope: programSnapshotScope('plan', programId, pickupPointId),
    snapshotAccountId: snapshotAccountId,
  );

  /// Claim a guest for greeting. `clientOperationId` makes offline retries
  /// return the original result instead of double-applying.
  Future<ProgramMutationResult> claimLeg({
    required String programId,
    required String legId,
    required String clientOperationId,
    required int expectedRevision,
    required DateTime observedAt,
    TravelLegObservationReference? afterObservation,
  }) => _readiness(
    programId: programId,
    legId: legId,
    action: 'claim',
    clientOperationId: clientOperationId,
    expectedRevision: expectedRevision,
    observedAt: observedAt,
    afterObservation: afterObservation,
    errorAction: 'claim the guest',
  );

  Future<ProgramMutationResult> unclaimLeg({
    required String programId,
    required String legId,
    required String clientOperationId,
    required int expectedRevision,
    required DateTime observedAt,
    TravelLegObservationReference? afterObservation,
  }) => _readiness(
    programId: programId,
    legId: legId,
    action: 'unclaim',
    clientOperationId: clientOperationId,
    expectedRevision: expectedRevision,
    observedAt: observedAt,
    afterObservation: afterObservation,
    errorAction: 'release the claim',
  );

  Future<ProgramMutationResult> markLegReady({
    required String programId,
    required String legId,
    required String clientOperationId,
    required int expectedRevision,
    required DateTime observedAt,
    TravelLegObservationReference? afterObservation,
    DateTime? manualCurbAt,
    String? manualCurbNote,
  }) => _readiness(
    programId: programId,
    legId: legId,
    action: 'markReady',
    clientOperationId: clientOperationId,
    expectedRevision: expectedRevision,
    observedAt: observedAt,
    afterObservation: afterObservation,
    manualCurbAt: manualCurbAt,
    manualCurbNote: manualCurbNote,
    errorAction: 'mark the guest ready',
  );

  Future<ProgramMutationResult> markLegDisrupted({
    required String programId,
    required String legId,
    required String clientOperationId,
    required int expectedRevision,
    required DateTime observedAt,
    TravelLegObservationReference? afterObservation,
    DateTime? manualCurbAt,
    String? manualCurbNote,
  }) => _readiness(
    programId: programId,
    legId: legId,
    action: 'markDisrupted',
    clientOperationId: clientOperationId,
    expectedRevision: expectedRevision,
    observedAt: observedAt,
    afterObservation: afterObservation,
    manualCurbAt: manualCurbAt,
    manualCurbNote: manualCurbNote,
    errorAction: 'flag the disruption',
  );

  Future<DispatchResult> dispatchTrip({
    required String programId,
    required String pickupPointId,
    required String vehicleClassId,
    required String plateDisplay,
    required List<String> legIds,
    required String clientOperationId,
    String? destinationHotelId,
    String? destinationLabel,
    String? vendorId,
    required List<DispatchLegRevision> expectedLegRevisions,
    DateTime? departedAt,
    String? notes,
  }) => _call(
    name: 'dispatchProgramTrip',
    payload: DispatchProgramTripCallableRequest(
      programId: programId,
      pickupPointId: pickupPointId,
      destinationHotelId: destinationHotelId,
      destinationLabel: destinationLabel,
      vehicleClassId: vehicleClassId,
      plateDisplay: plateDisplay,
      vendorId: vendorId,
      legIds: legIds,
      expectedLegRevisions: expectedLegRevisions
          .map((fence) => fence.toJson())
          .toList(growable: false),
      departedAtMillis: departedAt?.millisecondsSinceEpoch,
      notes: notes,
      clientOperationId: clientOperationId,
    ).toJson(),
    action: 'dispatch the vehicle',
    parse: DispatchResult.fromCallableData,
  );

  Future<ProgramMutationResult> markTripArrived({
    required String programId,
    required String tripId,
    required int expectedRevision,
    required String clientOperationId,
  }) => _tripAction(
    name: 'markProgramTripArrived',
    programId: programId,
    tripId: tripId,
    expectedRevision: expectedRevision,
    clientOperationId: clientOperationId,
    errorAction: 'mark the trip arrived',
  );

  Future<ProgramMutationResult> voidTrip({
    required String programId,
    required String tripId,
    required int expectedRevision,
    required String reason,
    required String clientOperationId,
  }) => _tripAction(
    name: 'voidProgramTrip',
    programId: programId,
    tripId: tripId,
    expectedRevision: expectedRevision,
    reason: reason,
    clientOperationId: clientOperationId,
    errorAction: 'void the trip',
  );

  Future<ProgramHotelInbound> getHotelInbound({
    required String programId,
    required String hotelId,
    String? tripCursor,
    String? expectedCursor,
  }) => _call(
    name: 'getProgramHotelInbound',
    authorityScopedRead: true,
    payload: GetProgramHotelInboundCallableRequest(
      programId: programId,
      hotelId: hotelId,
      tripCursor: tripCursor,
      expectedCursor: expectedCursor,
    ).toJson(),
    action: 'load the hotel inbound view',
    parse: ProgramHotelInbound.fromCallableData,
  );

  /// The hotel desk's room board: block capacity, live stays, and routed
  /// guests still needing a room — all scoped to `hotelId`.
  Future<ProgramHotelRooms> getHotelRooms({
    required String programId,
    required String hotelId,
  }) => _call(
    name: 'getProgramHotelRooms',
    authorityScopedRead: true,
    payload: GetProgramHotelRoomsCallableRequest(
      programId: programId,
      hotelId: hotelId,
    ).toJson(),
    action: 'load the room board',
    parse: ProgramHotelRooms.fromCallableData,
  );

  /// Assign or update one guest's stay — room block, room label, lifecycle
  /// status and desk marks. Omit `stayId` to create; `expectedRevision`
  /// fences updates against a stale board.
  Future<ProgramMutationResult> upsertStay({
    required String programId,
    required String guestId,
    required String hotelId,
    String? stayId,
    int? expectedRevision,
    String? roomBlockId,
    String? roomLabel,
    ProgramStayStatus? status,
    DateTime? startsAt,
    DateTime? endsAt,
    String? notes,
    bool? markRoomReady,
    bool? markHotelArrived,
  }) => _call(
    name: 'upsertProgramStay',
    payload: UpsertProgramStayCallableRequest(
      programId: programId,
      guestId: guestId,
      hotelId: hotelId,
      stayId: stayId,
      expectedRevision: expectedRevision,
      roomBlockId: roomBlockId,
      roomLabel: roomLabel,
      status: status?.name,
      startsAtMillis: startsAt?.millisecondsSinceEpoch,
      endsAtMillis: endsAt?.millisecondsSinceEpoch,
      notes: notes,
      markRoomReady: markRoomReady,
      markHotelArrived: markHotelArrived,
    ).toJson(),
    action: 'update the stay',
    parse: ProgramMutationResult.fromCallableData,
  );

  /// Coordinator-only room-block inventory write; the server refuses to
  /// shrink a block below its live occupancy.
  Future<ProgramMutationResult> upsertRoomBlock({
    required String programId,
    required String hotelId,
    required String label,
    required int totalRooms,
    required List<String> heldForGroupIds,
    String? roomBlockId,
    int? expectedRevision,
    String? roomType,
    DateTime? startsAt,
    DateTime? endsAt,
    String? notes,
  }) => _call(
    name: 'upsertProgramRoomBlock',
    payload: UpsertProgramRoomBlockCallableRequest(
      programId: programId,
      hotelId: hotelId,
      roomBlockId: roomBlockId,
      expectedRevision: expectedRevision,
      label: label,
      roomType: roomType,
      totalRooms: totalRooms,
      heldForGroupIds: heldForGroupIds,
      startsAtMillis: startsAt?.millisecondsSinceEpoch,
      endsAtMillis: endsAt?.millisecondsSinceEpoch,
      notes: notes,
    ).toJson(),
    action: 'update the room block',
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<ProgramTripList> listTrips(String programId, {String? cursor}) =>
      _call(
        name: 'listProgramTrips',
        authorityScopedRead: true,
        payload: ListProgramTripsCallableRequest(
          programId: programId,
          cursor: cursor,
        ).toJson(),
        action: 'load the trip ledger',
        parse: ProgramTripList.fromCallableData,
      );

  /// Function-lead attention feed — the callable returns only the alerts
  /// stamped for duties the caller holds.
  Future<ProgramStaffAttention> listStaffAttention(String programId) => _call(
    name: 'listProgramStaffAttention',
    authorityScopedRead: true,
    payload: ProgramIdCallableRequest(programId: programId).toJson(),
    action: 'load staff attention',
    parse: ProgramStaffAttention.fromCallableData,
  );

  /// The reconciliationViewer's program-wide attendance report — per-function
  /// RSVP-vs-door counts plus the exception guest-id lists.
  Future<ProgramAttendanceReport> getAttendanceReport(String programId) =>
      _call(
        name: 'getProgramAttendanceReport',
        authorityScopedRead: true,
        payload: ProgramIdCallableRequest(programId: programId).toJson(),
        action: 'load the attendance report',
        parse: ProgramAttendanceReport.fromCallableData,
      );

  /// Counts-only overview for stakeholderViewer staff: ids + headcounts,
  /// no guest names or contacts cross the wire.
  Future<ProgramStakeholderCounts> getStakeholderCounts(String programId) =>
      _call(
        name: 'getProgramStakeholderCounts',
        authorityScopedRead: true,
        payload: ProgramIdCallableRequest(programId: programId).toJson(),
        action: 'load the program counts',
        parse: ProgramStakeholderCounts.fromCallableData,
      );

  /// Vendor picker data for the dispatch sheet — the callable filters to
  /// vendors bound to this program and returns operational fields only.
  Future<List<ProgramVendorOption>> listVendors({
    required String organizerId,
    required String programId,
  }) => _call(
    name: 'listTransportVendors',
    authorityScopedRead: true,
    payload: ListTransportVendorsCallableRequest(
      organizerId: organizerId,
      programId: programId,
    ).toJson(),
    action: 'load transport vendors',
    parse: (value) {
      final map = requiredMap(value, 'transport vendors');
      return mapList(map['vendors'], 'vendors')
          .map(
            (vendor) => ProgramVendorOption(
              vendorId: requiredString(vendor, 'vendorId'),
              name: requiredString(vendor, 'name'),
              active: vendor['active'] == true,
              boundToProgram: vendor['boundToProgram'] == true,
            ),
          )
          .toList(growable: false);
    },
  );

  Future<ProgramMutationResult> _readiness({
    required String programId,
    required String legId,
    required String action,
    required String clientOperationId,
    required String errorAction,
    required int expectedRevision,
    required DateTime observedAt,
    TravelLegObservationReference? afterObservation,
    DateTime? manualCurbAt,
    String? manualCurbNote,
  }) => _call(
    name: 'setProgramTravelReadiness',
    payload: SetProgramTravelReadinessCallableRequest(
      programId: programId,
      legId: legId,
      action: action,
      expectedRevision: expectedRevision,
      observedAtMillis: observedAt.millisecondsSinceEpoch,
      afterObservation: afterObservation?.toJson(),
      manualCurbAtMillis: manualCurbAt?.millisecondsSinceEpoch,
      manualCurbNote: manualCurbNote,
      clientOperationId: clientOperationId,
    ).toJson(),
    action: errorAction,
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<ProgramMutationResult> _tripAction({
    required String name,
    required String programId,
    required String tripId,
    required int expectedRevision,
    required String clientOperationId,
    required String errorAction,
    String? reason,
  }) => _call(
    name: name,
    payload: ProgramTripActionCallableRequest(
      programId: programId,
      tripId: tripId,
      reason: reason,
      expectedRevision: expectedRevision,
      clientOperationId: clientOperationId,
    ).toJson(),
    action: errorAction,
    parse: ProgramMutationResult.fromCallableData,
  );

  Future<T> _call<T>({
    required String name,
    required Map<String, Object?> payload,
    required String action,
    required T Function(Object?) parse,
    String? snapshotScope,
    String? snapshotAccountId,
    bool authorityScopedRead = false,
  }) async {
    final accountId = _currentAccountId();
    if (accountId == null ||
        accountId.isEmpty ||
        (snapshotAccountId != null && snapshotAccountId != accountId)) {
      throw SignInRequiredException(action);
    }
    final programId = payload['programId'] as String?;
    final generation = programId == null
        ? null
        : _snapshots.generation(accountId, programId);
    try {
      return await withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable(name)
              .call<Object?>(payload);
          if (_currentAccountId() != accountId) {
            throw SignInRequiredException(action);
          }
          final parsed = parse(result.data);
          var acceptedGeneration = generation;
          if (snapshotScope != null && snapshotAccountId != null) {
            // Cache failure must not turn a successful server read into a retry.
            acceptedGeneration = await _snapshots
                .save(
                  accountId,
                  snapshotScope,
                  result.data,
                  expectedGeneration: generation,
                )
                .onError<Object>((_, _) => generation);
          }
          if (_currentAccountId() != accountId) {
            throw SignInRequiredException(action);
          }
          if (authorityScopedRead &&
              programId != null &&
              (acceptedGeneration == null ||
                  acceptedGeneration !=
                      _snapshots.generation(accountId, programId))) {
            // A concurrent denial or narrower bootstrap superseded this read.
            // This is not a new denial: preserve the newer authority and cache.
            throw BackendOperationException(
              code: 'program-access-changed',
              message: 'Program access changed. Refresh to load current work.',
              retryable: true,
              context: BackendErrorContext(
                service: BackendService.functions,
                action: action,
                resource: name,
              ),
            );
          }
          return parsed;
        },
        context: BackendErrorContext(
          service: BackendService.functions,
          action: action,
          resource: name,
        ),
      );
    } on AppException catch (error) {
      if (programId != null &&
          (error is PermissionException ||
              error is SignInRequiredException ||
              error is DocumentNotFoundException)) {
        // Hide all projections immediately. A scoped denial can mean either
        // one expired assignment or full revocation; only a fresh canonical
        // bootstrap can distinguish them. Old private snapshots stay deleted.
        final clearing = _snapshots.clearProgram(accountId, programId);
        final deniedGeneration = _snapshots.generation(accountId, programId);
        await clearing;
        if (name != 'getProgramWorkAccess' &&
            error is! SignInRequiredException &&
            _currentAccountId() == accountId &&
            _snapshots.generation(accountId, programId) == deniedGeneration) {
          try {
            await getWorkAccess(programId, snapshotAccountId: accountId);
          } on AppException {
            // Preserve the original denial. Failed/revoked rechecks cannot
            // restore cached projections or recursively bootstrap themselves.
          }
        }
      }
      rethrow;
    }
  }
}

// keepalive: the keep-alive operations outbox watches this repository, so it
// must outlive any individual screen subscription.
@Riverpod(keepAlive: true)
ProgramWorkRepository programWorkRepository(Ref ref) {
  final auth = ref.watch(firebaseAuthProvider);
  return ProgramWorkRepository(
    ref.watch(firebaseFunctionsProvider),
    ref.watch(programReadSnapshotStoreProvider),
    () => auth.currentUser?.uid,
  );
}

String _watchWorkAccount(Ref ref) {
  final accountId = ref.watch(uidProvider).asData?.value;
  if (accountId == null || accountId.isEmpty) {
    throw const SignInRequiredException('view program work');
  }
  return accountId;
}

Future<ProgramReadView<T>> _readView<T>(
  Ref ref,
  String accountId,
  String programId,
  String scope,
  Future<T> Function() live,
  T Function(Object?) parse, {
  bool Function(ProgramWorkAccess)? allowsAccess,
  void Function()? onAuthorityChanged,
}) => readWithProgramAuthority(
  ref,
  accountId,
  programId,
  () => readProgramWithSnapshot(
    accountId: accountId,
    programId: programId,
    scope: scope,
    store: ref.read(programReadSnapshotStoreProvider),
    isCurrentRead: () => ref.mounted,
    isCurrentAccount: () =>
        ref.mounted && ref.read(uidProvider).asData?.value == accountId,
    live: live,
    liveOwnsAccessInvalidation: true,
    parse: parse,
    allowsAccess: allowsAccess,
    now: ref.read(programProjectionClockProvider),
  ),
  onAuthorityChanged: onAuthorityChanged,
);

/// An invitation must be claimed online; an existing program may reopen from
/// a bounded snapshot of its previously verified access.
@riverpod
Future<ProgramReadView<ProgramWorkAccess>> programWorkEntry(
  Ref ref,
  String programId,
  String? inviteId,
) async {
  final accountId = _watchWorkAccount(ref);
  final repository = ref.read(programWorkRepositoryProvider);
  final resolvedProgramId = inviteId == null || inviteId.isEmpty
      ? programId
      : await repository.claimStaffInvite(inviteId);
  if (!ref.mounted) throw const SignInRequiredException('view program work');
  final result = await _readView(
    ref,
    accountId,
    resolvedProgramId,
    programSnapshotScope('work', resolvedProgramId),
    () => repository.getWorkAccess(
      resolvedProgramId,
      snapshotAccountId: accountId,
    ),
    ProgramWorkAccess.fromCallableData,
  );
  retainProgramProjection(
    ref,
    programProjectionDeadline(
      result.value.nextAccessChangeAt(
        ref.read(programProjectionClockProvider)(),
      ),
      result.snapshotExpiresAt,
    ),
  );
  return result;
}

@riverpod
Future<ProgramArrivalsRoster> programArrivalsRoster(
  Ref ref,
  String programId,
  String? pickupPointId,
) {
  final accountId = _watchWorkAccount(ref);
  return ref
      .read(programWorkRepositoryProvider)
      .getArrivalsRoster(
        programId: programId,
        pickupPointId: pickupPointId,
        snapshotAccountId: accountId,
      );
}

@riverpod
Future<ProgramReadView<ProgramArrivalsRoster>> programArrivalsRosterView(
  Ref ref,
  String programId,
  String? pickupPointId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await _readView(
    ref,
    accountId,
    programId,
    programSnapshotScope('arrivals', programId, pickupPointId),
    () => ref.watch(
      programArrivalsRosterProvider(programId, pickupPointId).future,
    ),
    ProgramArrivalsRoster.fromCallableData,
    onAuthorityChanged: () => ref.invalidate(
      programArrivalsRosterProvider(programId, pickupPointId),
      asReload: true,
    ),
    allowsAccess: (access) => canReadProgramStation(
      access,
      pickupPointId,
      dispatch: false,
      now: ref.read(programProjectionClockProvider)(),
      forSnapshot: true,
    ),
  );
  retainProgramProjection(
    ref,
    programProjectionDeadline(
      result.value.accessExpiresAt,
      result.snapshotExpiresAt,
    ),
    onExpiry: () => ref.invalidate(
      programArrivalsRosterProvider(programId, pickupPointId),
      asReload: true,
    ),
  );
  return result;
}

@riverpod
Future<ProgramTransportPlan> programTransportPlan(
  Ref ref,
  String programId,
  String? pickupPointId,
) {
  final accountId = _watchWorkAccount(ref);
  return ref
      .read(programWorkRepositoryProvider)
      .getTransportPlan(
        programId: programId,
        pickupPointId: pickupPointId,
        snapshotAccountId: accountId,
      );
}

@riverpod
Future<ProgramReadView<ProgramTransportPlan>> programTransportPlanView(
  Ref ref,
  String programId,
  String? pickupPointId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await _readView(
    ref,
    accountId,
    programId,
    programSnapshotScope('plan', programId, pickupPointId),
    () => ref.watch(
      programTransportPlanProvider(programId, pickupPointId).future,
    ),
    ProgramTransportPlan.fromCallableData,
    onAuthorityChanged: () => ref.invalidate(
      programTransportPlanProvider(programId, pickupPointId),
      asReload: true,
    ),
    allowsAccess: (access) => canReadProgramStation(
      access,
      pickupPointId,
      dispatch: true,
      now: ref.read(programProjectionClockProvider)(),
      forSnapshot: true,
    ),
  );
  retainProgramProjection(
    ref,
    programProjectionDeadline(
      result.value.accessExpiresAt,
      result.snapshotExpiresAt,
    ),
    onExpiry: () => ref.invalidate(
      programTransportPlanProvider(programId, pickupPointId),
      asReload: true,
    ),
  );
  return result;
}

@riverpod
Future<ProgramTripList> programTripList(
  Ref ref,
  String programId, {
  String? cursor,
}) async {
  final accountId = _watchWorkAccount(ref);
  final result = await readWithProgramAuthority(
    ref,
    accountId,
    programId,
    () => ref
        .read(programWorkRepositoryProvider)
        .listTrips(programId, cursor: cursor),
  );
  retainProgramProjection(ref, result.accessExpiresAt);
  return result;
}
