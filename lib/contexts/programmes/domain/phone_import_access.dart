import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// An affordance derived from a fresh canonical work-access response. The
/// import callable must still recheck the current grant before every write.
bool canImportWeddingPhoneContacts(ProgramWorkAccess access, DateTime now) {
  if (access.kind != ProgramKind.wedding ||
      access.status == ProgramStatus.archived) {
    return false;
  }
  if (access.isManager) return true;
  final grantDeadline = access.grantExpiresAt;
  if (grantDeadline == null || !grantDeadline.isAfter(now)) return false;
  return access
      .activeDutiesAt(now)
      .any(
        (assignment) =>
            (assignment.duty == ProgramStaffDuty.guestRelations ||
                assignment.duty == ProgramStaffDuty.programCoordinator) &&
            assignment.pickupPointIds.isEmpty &&
            assignment.hotelIds.isEmpty &&
            assignment.functionIds.isEmpty &&
            !assignment.expiresAt!.isAfter(grantDeadline),
      );
}
