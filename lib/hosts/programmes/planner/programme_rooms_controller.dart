import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_rooms_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'programme_rooms_controller.g.dart';

/// Rooms at [hotelId] (or the programme's first hotel): the programme and
/// the hotel's room board, both callables.
@riverpod
HostProgrammeRoomsState hostProgrammeRoomsController(
  Ref ref,
  String programId,
  String? hotelId,
) {
  final programme = ref.watch(hostProgrammeControllerProvider(programId));
  final hotels = programme.detail?.hotels ?? const [];
  final hotel =
      hotels.where((hotel) => hotel.hotelId == hotelId).firstOrNull ??
      hotels.firstOrNull;
  if (hotel == null) {
    return HostProgrammeRoomsState(programme: programme, hotelId: null);
  }
  final rooms = ref.watch(programHotelRoomsProvider(programId, hotel.hotelId));
  return HostProgrammeRoomsState(
    programme: programme,
    hotelId: hotel.hotelId,
    rooms: rooms.value,
    error: rooms.error,
  );
}

/// Reads the room board again.
void refreshHostProgrammeRooms(
  WidgetRef ref,
  String programId,
  String? hotelId,
) {
  if (hotelId == null) {
    refreshHostProgramme(ref, programId);
    return;
  }
  ref.invalidate(programHotelRoomsProvider(programId, hotelId));
}
