import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:flutter/foundation.dart';

/// Rooms at one hotel: the programme (for its hotels) and the hotel's room
/// board from `getProgramHotelRooms` (room blocks, stays and the guests
/// still waiting for a room).
@immutable
class HostProgrammeRoomsState {
  const HostProgrammeRoomsState({
    required this.programme,
    required this.hotelId,
    this.rooms,
    this.error,
  });

  final HostProgrammeState programme;

  /// The hotel on show; null when the programme has no hotel.
  final String? hotelId;
  final ProgramHotelRooms? rooms;
  final Object? error;

  HostProgrammeStatus get status {
    if (programme.status != HostProgrammeStatus.ready) return programme.status;
    if (hotelId == null) return HostProgrammeStatus.ready;
    if (rooms == null && error != null) return HostProgrammeStatus.error;
    if (rooms == null) return HostProgrammeStatus.loading;
    return HostProgrammeStatus.ready;
  }

  List<ProgramHotel> get hotels => programme.detail?.hotels ?? const [];

  List<ProgramRoomBlock> get blocks => rooms?.roomBlocks ?? const [];

  int get held => blocks.fold(0, (sum, block) => sum + block.totalRooms);

  int get placed => blocks.fold(0, (sum, block) => sum + block.assignedCount);

  List<ProgramUnplacedGuest> get waiting => rooms?.unplacedGuests ?? const [];

  /// Waiting guests the board has a block to suggest for.
  List<ProgramUnplacedGuest> get suggested =>
      waiting.where((guest) => guest.suggestedRoomBlockId != null).toList();

  /// The live stays in [block], in room order.
  List<ProgramStay> staysIn(ProgramRoomBlock block) =>
      (rooms?.stays ?? const <ProgramStay>[])
          .where(
            (stay) =>
                stay.roomBlockId == block.roomBlockId &&
                stay.status != ProgramStayStatus.cancelled,
          )
          .toList()
        ..sort(
          (a, b) => (a.roomLabel ?? a.guestDisplayName).compareTo(
            b.roomLabel ?? b.guestDisplayName,
          ),
        );

  ProgramRoomBlock? block(String? roomBlockId) =>
      blocks.where((block) => block.roomBlockId == roomBlockId).firstOrNull;
}
