import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_stay_actions_controller.g.dart';

/// Stay-lifecycle mutations for the hotel room board: assignment, block,
/// room label, status, and the desk's room-ready / guest-arrived marks.
/// Widgets go through this controller rather than reaching into
/// repository providers directly.
@riverpod
class ProgramStayActions extends _$ProgramStayActions {
  @override
  void build() {}

  Future<ProgramMutationResult> saveStay({
    required String programId,
    required String guestId,
    required String hotelId,
    String? stayId,
    int? expectedRevision,
    String? roomBlockId,
    String? roomLabel,
    ProgramStayStatus? status,
  }) => ref
      .read(programWorkRepositoryProvider)
      .upsertStay(
        programId: programId,
        guestId: guestId,
        hotelId: hotelId,
        stayId: stayId,
        expectedRevision: expectedRevision,
        roomBlockId: roomBlockId,
        roomLabel: roomLabel,
        status: status,
      );

  Future<ProgramMutationResult> markStay({
    required String programId,
    required String guestId,
    required String hotelId,
    required String stayId,
    required int expectedRevision,
    bool markRoomReady = false,
    bool markHotelArrived = false,
  }) => ref
      .read(programWorkRepositoryProvider)
      .upsertStay(
        programId: programId,
        guestId: guestId,
        hotelId: hotelId,
        stayId: stayId,
        expectedRevision: expectedRevision,
        markRoomReady: markRoomReady ? true : null,
        markHotelArrived: markHotelArrived ? true : null,
      );
}
