import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:flutter/foundation.dart';

enum HostProgrammeStatus { loading, error, ready }

/// One planner read's status: a failure reads as an error, as before, even
/// when an older value is still held; otherwise data is ready.
HostProgrammeStatus hostProgrammeStatusOf<T>(CatchAsyncState<T> read) {
  if (read.error != null) return HostProgrammeStatus.error;
  return read.hasData ? HostProgrammeStatus.ready : HostProgrammeStatus.loading;
}

/// One guest's answer for one function.
enum HostProgrammeReply { coming, maybe, declined, noReply, notInvited }

/// What a household's cell in the reply grid says.
enum HostProgrammeCellKind { everyone, some, maybe, noReply, none, notInvited }

/// A household's answer for one function: how many of its invited members
/// are coming, out of how many were invited.
@immutable
class HostProgrammeCell {
  const HostProgrammeCell({
    required this.kind,
    required this.coming,
    required this.invited,
  });

  final HostProgrammeCellKind kind;
  final int coming;
  final int invited;
}

/// One household with its members, the side and groups it belongs to, and
/// its answer for each function in schedule order.
@immutable
class HostProgrammeHousehold {
  const HostProgrammeHousehold({
    required this.id,
    required this.label,
    required this.members,
    required this.groups,
    required this.cells,
    required this.replied,
  });

  final String id;
  final String label;
  final List<ProgramGuestRow> members;

  /// Group labels (side first), such as "Aditi's side".
  final List<String> groups;
  final List<HostProgrammeCell> cells;

  /// Every invited member has answered every function.
  final bool replied;
}

/// One function's answers across the guest list.
@immutable
class HostProgrammeFunctionReplies {
  const HostProgrammeFunctionReplies({
    this.invited = 0,
    this.coming = 0,
    this.maybe = 0,
    this.declined = 0,
    this.noReply = 0,
  });

  final int invited;
  final int coming;
  final int maybe;
  final int declined;
  final int noReply;
}

/// The guest list filters on the Guests view.
enum HostProgrammeGuestFilter { all, noReply }

/// The programme the planner works on: its settings, schedule, pickup
/// points and hotels from `getOrganizerProgram`, and its guests,
/// households, groups and function answers from `listProgramGuests`.
@immutable
class HostProgrammeState {
  const HostProgrammeState({
    required this.status,
    this.detail,
    this.guests,
    this.error,
  });

  const HostProgrammeState.loading()
    : status = HostProgrammeStatus.loading,
      detail = null,
      guests = null,
      error = null;

  final HostProgrammeStatus status;
  final OrganizerProgramDetail? detail;

  /// Null while the guest list is still on its way (the schedule shows
  /// without answers).
  final ProgramGuestListPage? guests;
  final Object? error;

  OrganizerProgramSettings? get program => detail?.program;

  /// Functions in schedule order.
  List<OrganizerFunctionDetail> get functions {
    final functions = [...?detail?.functions]
      ..sort((a, b) => a.startsAt.compareTo(b.startsAt));
    return functions;
  }

  /// The schedule's days, each with its functions in order.
  List<(DateTime, List<OrganizerFunctionDetail>)> get days {
    final byDay = <DateTime, List<OrganizerFunctionDetail>>{};
    for (final function in functions) {
      final start = function.startsAt;
      byDay
          .putIfAbsent(DateTime(start.year, start.month, start.day), () => [])
          .add(function);
    }
    return [for (final entry in byDay.entries) (entry.key, entry.value)];
  }

  OrganizerFunctionDetail? function(String functionId) =>
      functions.where((f) => f.functionId == functionId).firstOrNull;

  int count(String key) => detail?.counts[key] ?? 0;

  Map<(String, String), ProgramFunctionGuestRow> get _rows => {
    for (final row
        in guests?.functionGuests ?? const <ProgramFunctionGuestRow>[])
      (row.guestId, row.functionId): row,
  };

  /// A guest's answer for a function. An everyone function invites a guest
  /// who has no row.
  HostProgrammeReply reply(
    ProgramGuestRow guest,
    OrganizerFunctionDetail function, [
    Map<(String, String), ProgramFunctionGuestRow>? rows,
  ]) {
    final row = (rows ?? _rows)[(guest.guestId, function.functionId)];
    final invited = row?.invited ?? !function.isSelectedGuests;
    if (!invited) return HostProgrammeReply.notInvited;
    return switch (row?.rsvpStatus) {
      'attending' => HostProgrammeReply.coming,
      'maybe' => HostProgrammeReply.maybe,
      'declined' => HostProgrammeReply.declined,
      _ => HostProgrammeReply.noReply,
    };
  }

  HostProgrammeFunctionReplies replies(OrganizerFunctionDetail function) {
    final rows = _rows;
    var invited = 0, coming = 0, maybe = 0, declined = 0, noReply = 0;
    for (final guest in guests?.guests ?? const <ProgramGuestRow>[]) {
      switch (reply(guest, function, rows)) {
        case HostProgrammeReply.notInvited:
          continue;
        case HostProgrammeReply.coming:
          coming++;
        case HostProgrammeReply.maybe:
          maybe++;
        case HostProgrammeReply.declined:
          declined++;
        case HostProgrammeReply.noReply:
          noReply++;
      }
      invited++;
    }
    return HostProgrammeFunctionReplies(
      invited: invited,
      coming: coming,
      maybe: maybe,
      declined: declined,
      noReply: noReply,
    );
  }

  /// Every household in label order, with its cells for [functions].
  List<HostProgrammeHousehold> get households {
    final page = guests;
    if (page == null) return const [];
    final rows = _rows;
    final schedule = functions;
    final guestById = {for (final guest in page.guests) guest.guestId: guest};
    final groups = {for (final group in page.groups) group.groupId: group};
    final households = <HostProgrammeHousehold>[];
    for (final household in page.households) {
      final members = [
        for (final id in household.memberGuestIds) ?guestById[id],
      ];
      final groupRows = <ProgramGuestGroupRow>{
        for (final member in members)
          for (final id in member.groupIds) ?groups[id],
      }.toList()..sort((a, b) => _groupRank(a).compareTo(_groupRank(b)));
      var replied = true;
      final cells = <HostProgrammeCell>[];
      for (final function in schedule) {
        var invited = 0, coming = 0, maybe = 0, pending = 0;
        for (final member in members) {
          switch (reply(member, function, rows)) {
            case HostProgrammeReply.notInvited:
              continue;
            case HostProgrammeReply.coming:
              coming++;
            case HostProgrammeReply.maybe:
              maybe++;
            case HostProgrammeReply.noReply:
              pending++;
            case HostProgrammeReply.declined:
              break;
          }
          invited++;
        }
        if (pending > 0) replied = false;
        cells.add(
          HostProgrammeCell(
            kind: invited == 0
                ? HostProgrammeCellKind.notInvited
                : coming == invited
                ? HostProgrammeCellKind.everyone
                : coming > 0
                ? HostProgrammeCellKind.some
                : maybe > 0
                ? HostProgrammeCellKind.maybe
                : pending > 0
                ? HostProgrammeCellKind.noReply
                : HostProgrammeCellKind.none,
            coming: coming,
            invited: invited,
          ),
        );
      }
      households.add(
        HostProgrammeHousehold(
          id: household.householdId,
          label: household.label,
          members: members,
          groups: [for (final group in groupRows) group.label],
          cells: cells,
          replied: replied,
        ),
      );
    }
    households.sort((a, b) => a.label.compareTo(b.label));
    return households;
  }

  HostProgrammeHousehold? household(String householdId) =>
      households.where((h) => h.id == householdId).firstOrNull;

  /// Households that have answered for everyone they were invited with.
  int get repliedHouseholds => households.where((h) => h.replied).length;

  /// Households with at least one invited member still to answer.
  int get waitingHouseholds => households.where((h) => !h.replied).length;

  List<HostProgrammeHousehold> filtered(HostProgrammeGuestFilter filter) =>
      switch (filter) {
        HostProgrammeGuestFilter.all => households,
        HostProgrammeGuestFilter.noReply =>
          households.where((h) => !h.replied).toList(),
      };

  /// Days from [now] to the first function, or to the programme start.
  int? daysToGo(DateTime now) {
    final start = program?.startsAt;
    if (start == null) return null;
    final today = DateTime(now.year, now.month, now.day);
    final first = DateTime(start.year, start.month, start.day);
    return first.difference(today).inDays;
  }
}

int _groupRank(ProgramGuestGroupRow group) =>
    (group.dimension == 'side' ? 0 : 1) * 1000 + (group.sortOrder ?? 999);
