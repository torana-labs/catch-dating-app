part of 'program_work_repository.dart';

/// Welcome hampers from the hotel desk: mark a room's hamper placed. The
/// porters' own list and photos are the hamperPorter web link (P4.10),
/// minted with `ProgramPlannerRepository.issueWebLink`.
extension ProgramHampersRepositoryApi on ProgramWorkRepository {
  /// Marks the hamper in [stayId]'s room placed (or not yet). [requestId]
  /// makes a retried tap return the stored result.
  Future<({String roomKey, bool placed, int revision})> upsertHamper({
    required String programId,
    required String stayId,
    required bool placed,
    required String requestId,
    String? photoAssetId,
  }) => _call(
    name: 'upsertProgramHamper',
    payload: UpsertProgramHamperCallableRequest(
      programId: programId,
      stayId: stayId,
      status: placed ? 'placed' : 'pending',
      photoAssetId: photoAssetId,
      requestId: requestId,
    ).toJson(),
    action: 'update the hamper',
    parse: (data) {
      final map = requiredMap(data, 'hamper');
      return (
        roomKey: requiredString(map, 'roomKey'),
        placed: requiredString(map, 'status') == 'placed',
        revision: requiredInt(map, 'revision'),
      );
    },
  );
}
