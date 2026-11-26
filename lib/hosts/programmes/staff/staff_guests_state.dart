import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_guest_commands.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:flutter/foundation.dart';

/// Where the staff guest list is.
enum StaffGuestsStatus {
  loading,

  /// The guest list for someone who may read it.
  content,

  /// Signed in, but holding neither a manager role nor the guest relations
  /// duty.
  locked,
  error,
}

/// One household on the staff guest list, with its members.
@immutable
class StaffGuestsHousehold {
  const StaffGuestsHousehold({required this.household, required this.members});

  final ProgramHouseholdRow household;
  final List<ProgramGuestRow> members;
}

/// The staff guest list as plain values: the programme's functions, its
/// households with their members, the guests with no household, the
/// groups, each guest's answer per function, and what this person may do.
@immutable
class StaffGuestsState {
  const StaffGuestsState({
    required this.status,
    this.title,
    this.functions = const <ProgramFunction>[],
    this.hotels = const <ProgramHotel>[],
    this.households = const <StaffGuestsHousehold>[],
    this.unaffiliated = const <ProgramGuestRow>[],
    this.groups = const <ProgramGuestGroupRow>[],
    this.allHouseholds = const <ProgramHouseholdRow>[],
    this.rows = const <(String, String), ProgramFunctionGuestRow>{},
    this.canManage = false,
    this.canShareLinks = false,
    this.error,
  });

  /// Builds the list from the work access and the live guest list. A
  /// manager or a coordinator manages guests and groups; the guest
  /// relations and communications duties send household links.
  factory StaffGuestsState.from({
    required ProgramWorkAccess access,
    required ProgramGuestListPage? page,
    required DateTime now,
    List<ProgramGuestGroupRow>? groups,
    List<ProgramHouseholdRow>? households,
  }) {
    final open =
        access.isManager ||
        access.hasDuty(ProgramStaffDuty.guestRelations, now: now);
    if (!open) {
      return StaffGuestsState(
        status: StaffGuestsStatus.locked,
        title: access.title,
      );
    }
    if (page == null) {
      return StaffGuestsState(
        status: StaffGuestsStatus.loading,
        title: access.title,
      );
    }
    final byHousehold = <String, List<ProgramGuestRow>>{};
    final unaffiliated = <ProgramGuestRow>[];
    for (final guest in page.guests) {
      final id = guest.householdId;
      if (id == null) {
        unaffiliated.add(guest);
      } else {
        byHousehold.putIfAbsent(id, () => []).add(guest);
      }
    }
    final archived = access.status == ProgramStatus.archived;
    return StaffGuestsState(
      status: StaffGuestsStatus.content,
      title: access.title,
      functions: access.functions,
      hotels: access.hotels,
      households: [
        for (final household in page.households)
          if (byHousehold[household.householdId] case final members?)
            StaffGuestsHousehold(household: household, members: members),
      ]..sort((a, b) => a.household.label.compareTo(b.household.label)),
      unaffiliated: unaffiliated
        ..sort((a, b) => a.displayName.compareTo(b.displayName)),
      groups: groups ?? page.groups,
      allHouseholds: households ?? page.households,
      rows: {
        for (final row in page.functionGuests)
          (row.guestId, row.functionId): row,
      },
      canManage:
          !archived &&
          (access.isManager ||
              access.hasDuty(ProgramStaffDuty.programCoordinator, now: now)),
      canShareLinks:
          !archived &&
          (access.hasDuty(ProgramStaffDuty.guestRelations, now: now) ||
              access.hasDuty(ProgramStaffDuty.communications, now: now)),
    );
  }

  final StaffGuestsStatus status;
  final String? title;
  final List<ProgramFunction> functions;
  final List<ProgramHotel> hotels;
  final List<StaffGuestsHousehold> households;
  final List<ProgramGuestRow> unaffiliated;

  /// Every group and household, empty ones included, for Add guest and the
  /// group list.
  final List<ProgramGuestGroupRow> groups;
  final List<ProgramHouseholdRow> allHouseholds;

  /// Each guest's join row for each function, keyed (guest, function).
  final Map<(String, String), ProgramFunctionGuestRow> rows;

  /// Add guest and the group sheets.
  final bool canManage;

  /// Send their link.
  final bool canShareLinks;
  final Object? error;

  /// [guest]'s answer for [function].
  HostProgrammeReply reply(ProgramGuestRow guest, ProgramFunction function) =>
      hostProgrammeJoinReply(rows[(guest.guestId, function.functionId)]);
}
