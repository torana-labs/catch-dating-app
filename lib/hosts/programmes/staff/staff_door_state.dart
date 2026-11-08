import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_operations.dart';
import 'package:flutter/foundation.dart';

/// Which guests a function's door shows: still expected, in, or walk-ins.
enum StaffDoorFilter { expected, checkedIn, walkIns }

/// Where the door is: reading the roster, showing it, or unable to read it.
enum StaffDoorStatus { loading, content, error }

/// A walk-in this phone registered that the server has not answered yet.
@immutable
class StaffPendingWalkIn {
  const StaffPendingWalkIn({
    required this.operationId,
    required this.name,
    required this.status,
  });

  final String operationId;
  final String name;
  final ProgramOperationOutboxStatus status;
}

/// Everything a function's door shows, as plain values.
@immutable
class StaffDoorState {
  const StaffDoorState({
    required this.status,
    this.view,
    this.outbox = const ProgramOperationOutboxSummary([]),
    this.filter = StaffDoorFilter.expected,
    this.query = '',
    this.selectedGuestId,
    this.savedAt,
  });

  const StaffDoorState.loading() : this(status: StaffDoorStatus.loading);

  const StaffDoorState.error() : this(status: StaffDoorStatus.error);

  final StaffDoorStatus status;

  /// The function's door roster, once it has loaded.
  final ProgramDoorView? view;

  /// The door changes this phone holds.
  final ProgramOperationOutboxSummary outbox;
  final StaffDoorFilter filter;

  /// The search over the loaded guests.
  final String query;

  /// The row opened for how many arrived.
  final String? selectedGuestId;

  /// When this phone saved the roster it shows, while offline.
  final DateTime? savedAt;

  List<ProgramDoorGuest> get _guests => view?.guests ?? const [];

  bool _matches(ProgramDoorGuest guest) {
    final term = query.trim().toLowerCase();
    if (term.isEmpty) return true;
    return guest.displayName.toLowerCase().contains(term) ||
        (guest.householdLabel?.toLowerCase().contains(term) ?? false);
  }

  bool _isUnder(ProgramDoorGuest guest, StaffDoorFilter filter) =>
      switch (filter) {
        StaffDoorFilter.expected =>
          guest.invited &&
              guest.attendanceStatus !=
                  ProgramFunctionAttendanceStatus.checkedIn,
        StaffDoorFilter.checkedIn =>
          guest.attendanceStatus == ProgramFunctionAttendanceStatus.checkedIn,
        StaffDoorFilter.walkIns => !guest.invited,
      };

  /// The guests under [filter] that match [query].
  List<ProgramDoorGuest> get shown => [
    for (final guest in _guests)
      if (_isUnder(guest, filter) && _matches(guest)) guest,
  ];

  /// Walk-ins this phone registered and has not sent yet.
  List<StaffPendingWalkIn> get pendingWalkIns => [
    if (view case final view?)
      for (final entry in outbox.walkInsFor(view.functionId))
        StaffPendingWalkIn(
          operationId: entry.clientOperationId,
          name: entry.payload['displayName']! as String,
          status: entry.status,
        ),
  ];

  /// How many guests are under [filter], whatever the search.
  int countOf(StaffDoorFilter filter) =>
      _guests.where((guest) => _isUnder(guest, filter)).length +
      (filter == StaffDoorFilter.walkIns ? pendingWalkIns.length : 0);

  /// The latest door change this phone holds for [guest].
  ProgramOperationOutboxStatus? queuedFor(ProgramDoorGuest guest) =>
      view == null
      ? null
      : outbox.forDoorGuest(view!.functionId, guest.guestId)?.status;

  /// The function takes check-ins now.
  bool get doorOpen =>
      view != null &&
      view!.function.checkInEnabled &&
      view!.function.status == ProgramFunctionStatus.scheduled;

  StaffDoorState copyWith({
    StaffDoorFilter? filter,
    String? query,
    String? selectedGuestId,
    bool clearSelection = false,
  }) => StaffDoorState(
    status: status,
    view: view,
    outbox: outbox,
    filter: filter ?? this.filter,
    query: query ?? this.query,
    selectedGuestId: clearSelection
        ? null
        : selectedGuestId ?? this.selectedGuestId,
    savedAt: savedAt,
  );
}
