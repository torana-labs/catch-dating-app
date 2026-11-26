import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'programme_controller.g.dart';

/// The programme the planner screens read: `getOrganizerProgram` for the
/// settings, schedule, pickup points and hotels, and `listProgramGuests`
/// for the guests, households, groups and answers. Both are callables; the
/// schedule shows while the guest list is still loading.
@riverpod
HostProgrammeState hostProgrammeController(Ref ref, String programId) {
  final detail = ref.watch(organizerProgramDetailProvider(programId));
  final guests = ref.watch(programGuestListProvider(programId));
  final value = detail.value;
  if (value == null) {
    if (detail.error case final error?) {
      return HostProgrammeState(
        status: HostProgrammeStatus.error,
        error: error,
      );
    }
    return const HostProgrammeState.loading();
  }
  return HostProgrammeState(
    status: HostProgrammeStatus.ready,
    detail: value,
    guests: guests.value,
    error: guests.error,
  );
}

/// The reads a programme refresh invalidates: the programme and its guest
/// list. Both refresh helpers below go through this one list.
List<ProviderOrFamily> hostProgrammeReads(String programId) => [
  organizerProgramDetailProvider(programId),
  programGuestListProvider(programId),
];

/// Reads the programme and its guest list again.
void refreshHostProgramme(WidgetRef ref, String programId) =>
    hostProgrammeReads(programId).forEach(ref.invalidate);

/// [refreshHostProgramme] through a [ProviderContainer] captured before an
/// `await`, so a write that finishes after its screen is gone still
/// refreshes the programme.
void refreshHostProgrammeIn(ProviderContainer container, String programId) =>
    hostProgrammeReads(programId).forEach(container.invalidate);
