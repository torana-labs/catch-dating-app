import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'programme_vendor_controller.g.dart';

/// The car vendor command the vendor page runs: `upsertTransportVendor`.
@riverpod
class HostProgrammeVendorCommands extends _$HostProgrammeVendorCommands {
  @override
  void build() {}

  /// Adds a vendor to the organiser's directory, bound to [programId].
  Future<ProgramMutationResult> addVendor({
    required String organizerId,
    required String programId,
    required String name,
    String? contactName,
    String? phoneE164,
  }) => ref
      .read(programSetupRepositoryProvider)
      .upsertVendor(
        organizerId: organizerId,
        name: name,
        contactName: contactName,
        phoneE164: phoneE164,
        programIds: [programId],
      );
}
