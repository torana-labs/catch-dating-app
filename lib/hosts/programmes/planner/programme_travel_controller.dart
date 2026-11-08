import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_travel_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'programme_travel_controller.g.dart';

/// Travel across every pickup point: the programme, the arrivals roster,
/// the transport plan and the trips, all callables.
@riverpod
HostProgrammeTravelState hostProgrammeTravelController(
  Ref ref,
  String programId,
) {
  final programme = ref.watch(hostProgrammeControllerProvider(programId));
  final roster = ref.watch(programArrivalsRosterProvider(programId, null));
  final plan = ref.watch(programTransportPlanProvider(programId, null));
  final trips = ref.watch(programTripListProvider(programId));
  return HostProgrammeTravelState(
    programme: programme,
    roster: roster.value,
    plan: plan.value,
    trips: trips.value,
    error: roster.error,
  );
}

/// Reads travel again.
void refreshHostProgrammeTravel(WidgetRef ref, String programId) {
  refreshHostProgramme(ref, programId);
  ref.invalidate(programArrivalsRosterProvider(programId, null));
  ref.invalidate(programTransportPlanProvider(programId, null));
  ref.invalidate(programTripListProvider(programId));
}
