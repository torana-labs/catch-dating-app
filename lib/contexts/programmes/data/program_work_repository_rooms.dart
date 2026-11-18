part of 'program_work_repository.dart';

/// Hotel desk providers: the room board for one property (the inbound board
/// is `programHotelInboundStreamProvider`). Split into a part file so the
/// work repository stays under the handwritten-source size budget; providers
/// remain top-level so tests fake them through `overrideWith`, not repository
/// subclassing.
@riverpod
Future<ProgramHotelRooms> programHotelRooms(
  Ref ref,
  String programId,
  String hotelId,
) async {
  final accountId = _watchWorkAccount(ref);
  final result = await readWithProgramAuthority(
    ref,
    accountId,
    programId,
    () => ref
        .read(programWorkRepositoryProvider)
        .getHotelRooms(programId: programId, hotelId: hotelId),
  );
  retainProgramProjection(ref, result.accessExpiresAt);
  return result;
}
