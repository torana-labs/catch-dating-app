import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_door_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_door_state.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_operations.dart';
import 'package:catch_dating_app/hosts/programmes/staff/widgets/staff_operations_notices.dart';
import 'package:catch_dating_app/hosts/programmes/staff/widgets/staff_walk_in_sheet.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The door for one function of a programme, always night: how many are
/// in, the guests by Expected, In and Walk-ins, and Add a walk-in in the
/// dock under the offline badge.
///
/// It reads the function's door roster (offline from the phone's saved
/// copy). Check in, Undo, Did not come, a changed party size and a walk-in
/// queue door journal operations through the operations outbox; the server
/// folds each through the durable journal, so a replay lands as a
/// duplicate rather than a second check-in.
class StaffDoorScreen extends ConsumerStatefulWidget {
  const StaffDoorScreen({
    super.key,
    required this.programId,
    required this.functionId,
    this.functionName,
  });

  final String programId;
  final String functionId;

  /// The function's name from the route, shown before the roster loads.
  final String? functionName;

  @override
  ConsumerState<StaffDoorScreen> createState() => _StaffDoorScreenState();
}

class _StaffDoorScreenState extends ConsumerState<StaffDoorScreen>
    with StaffOperationsScreen<StaffDoorScreen> {
  final _walkInName = TextEditingController();
  var _filter = StaffDoorFilter.expected;
  var _query = '';
  String? _selected;
  var _party = 1;
  var _addingWalkIn = false;
  var _walkInParty = 1;

  @override
  String get operationsProgramId => widget.programId;

  @override
  void dispose() {
    _walkInName.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final operations = watchOperations();
    final offline = ref.watch(isObviouslyOfflineProvider);
    final door = ref.watch(
      programFunctionDoorViewWithSnapshotProvider(
        widget.programId,
        widget.functionId,
      ),
    );
    final state = switch (door) {
      AsyncData(:final value) => StaffDoorState(
        status: StaffDoorStatus.content,
        view: value.value,
        outbox: operations.outbox,
        filter: _filter,
        query: _query,
        selectedGuestId: _selected,
        savedAt: value.snapshotAt,
      ),
      AsyncError() => const StaffDoorState.error(),
      _ => const StaffDoorState.loading(),
    };
    final view = state.view;
    final errorMessage = operationsErrorMessage(operations);
    final pending = operations.outbox.pendingCount;
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('staff-door-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.live,
          title:
              view?.function.name ??
              widget.functionName ??
              l10n.hostStaffDutyDoor,
          kicker: view == null
              ? null
              : [
                  ?view.function.venueName,
                  AppTimeFormatters.time(view.serverTime.toLocal()),
                ].join(' · '),
          back: CatchTopBarBack(
            label: l10n.hostStaffBackToJobs,
            onPressed: () => hostWorkspaceBack(
              context,
              fallback: Routes.hostWorkScreen.path,
            ),
          ),
          live: l10n.hostStaffDoorLive,
        ),
        body: StaffDoorBody(
          state: state,
          party: _party,
          notices:
              StaffOperationsNotices.shows(
                outbox: operations.outbox,
                savedAt: state.savedAt,
                errorMessage: errorMessage,
              )
              ? StaffOperationsNotices(
                  savedAt: state.savedAt,
                  outbox: operations.outbox,
                  busy: operations.busy,
                  errorMessage: errorMessage,
                  onSync: () => syncOperations(operations),
                  onReview: () => reviewOperations(operations),
                  onSaveCopy: saveCopyOf(operations),
                )
              : null,
          onFilter: (filter) => setState(() {
            _filter = filter;
            _selected = null;
          }),
          onSearch: (query) => setState(() => _query = query),
          onSelect: (guest) => setState(() {
            _selected = _selected == guest.guestId ? null : guest.guestId;
            _party = guest.partySize ?? 1;
          }),
          onParty: (party) => setState(() => _party = party),
          onCheckIn: (guest, party) =>
              unawaited(_checkIn(operations, guest, party)),
          onUndo: (guest) => unawaited(_door(operations, guest, 'undoCheckIn')),
          onNoShow: (guest) =>
              unawaited(_door(operations, guest, 'markNoShow')),
          onRetry: () => ref.invalidate(
            programFunctionDoorViewProvider(
              widget.programId,
              widget.functionId,
            ),
          ),
        ),
        overlay: _addingWalkIn
            ? StaffWalkInSheet(
                name: _walkInName,
                onNameChanged: (_) => setState(() {}),
                party: _walkInParty,
                onParty: (party) => setState(() => _walkInParty = party),
                busy: operations.busy,
                onAdd: () => unawaited(_addWalkIn(operations)),
                onClose: () => setState(() => _addingWalkIn = false),
              )
            : null,
        dock: state.doorOpen
            ? CatchDock(
                placement: CatchDockPlacement.bar,
                header: pending > 0 || offline
                    ? CatchBadge(
                        key: const ValueKey<String>('staff-door-sync'),
                        label: offline
                            ? l10n.hostStaffDoorOffline(count: pending)
                            : l10n.hostStaffDoorToSync(count: pending),
                        tone: CatchBadgeTone.warning,
                        icon: CatchIcons.offline,
                      )
                    : null,
                primary: CatchDockAction(
                  label: l10n.hostStaffDoorAddWalkIn,
                  icon: CatchIcons.addPerson,
                  onPressed: () => setState(() {
                    _walkInName.clear();
                    _walkInParty = 1;
                    _addingWalkIn = true;
                  }),
                ),
              )
            : null,
      ),
    );
  }

  /// Adjusts the party size first when more or fewer came, then checks
  /// the guest in.
  Future<void> _checkIn(
    StaffOperations operations,
    ProgramDoorGuest guest,
    int party,
  ) async {
    final controller = operationsController(operations.accountId);
    if (controller == null) return;
    if (party != (guest.partySize ?? 1)) {
      final adjusted = await controller.doorAction(
        functionId: widget.functionId,
        guestId: guest.guestId,
        action: 'partySizeAdjust',
        partySize: party,
      );
      if (!adjusted || !mounted) return;
    }
    final checkedIn = await controller.doorAction(
      functionId: widget.functionId,
      guestId: guest.guestId,
      action: 'checkIn',
    );
    if (checkedIn && mounted) setState(() => _selected = null);
  }

  Future<void> _door(
    StaffOperations operations,
    ProgramDoorGuest guest,
    String action,
  ) async {
    final done =
        await operationsController(operations.accountId)?.doorAction(
          functionId: widget.functionId,
          guestId: guest.guestId,
          action: action,
        ) ??
        false;
    if (done && mounted) setState(() => _selected = null);
  }

  Future<void> _addWalkIn(StaffOperations operations) async {
    final name = _walkInName.text.trim();
    if (name.isEmpty) return;
    final added =
        await operationsController(operations.accountId)?.walkIn(
          functionId: widget.functionId,
          displayName: name,
          partySize: _walkInParty,
        ) ??
        false;
    if (added && mounted) {
      setState(() {
        _addingWalkIn = false;
        _filter = StaffDoorFilter.walkIns;
      });
    }
  }
}
