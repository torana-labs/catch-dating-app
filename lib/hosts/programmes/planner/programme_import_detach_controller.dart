import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_travel_party_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'programme_import_detach_controller.g.dart';

/// Whether the viewer may detach a journey from its travel party: the
/// coordinator duty or the programme owner, as `detachProgramTravelLeg`
/// requires. The guest list check itself needs only guest relations, so a
/// planner can see a party-blocked row without being able to clear it.
@riverpod
bool hostProgrammeImportCanDetach(Ref ref, String programId) {
  final access = ref.watch(programAccessStateProvider(programId)).value;
  final view = access?.view;
  return access != null &&
      view != null &&
      view.hasFullReach(access.evaluatedAt);
}

/// Detaching a journey the guest list check found blocked by its travel
/// party: one `detachProgramTravelLeg` command, fenced by the revision the
/// check returned. It invalidates no read: the arrivals and trips listeners
/// deliver the change, and the import screen checks the list again.
@riverpod
class HostProgrammeImportDetachCommands
    extends _$HostProgrammeImportDetachCommands {
  static final detachMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> detach({
    required String programId,
    required ProgramManifestPartyJourney journey,
  }) async {
    await ref
        .read(programTravelPartyRepositoryProvider)
        .detachLeg(
          programId: programId,
          legId: journey.legId,
          expectedRevision: journey.revision,
        );
  }
}
