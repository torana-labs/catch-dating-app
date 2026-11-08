import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_policy.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_arrival_row.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_arrivals_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_arrivals_state.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_operations.dart';
import 'package:catch_dating_app/hosts/programmes/staff/widgets/staff_arrival_sheet.dart';
import 'package:catch_dating_app/hosts/programmes/staff/widgets/staff_operations_notice_list.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The airport greeter's curb for one pickup point, always night: who is
/// out, who needs someone, who is still landing, and Open dispatch for a
/// dispatcher.
///
/// It reads the arrivals roster (offline from the phone's saved copy, shown
/// with its time). Claim, Let go, Ready and Flag a problem queue a readiness
/// observation through the operations outbox, which replays it with the
/// same operation id when the phone is back online.
class StaffArrivalsScreen extends ConsumerStatefulWidget {
  const StaffArrivalsScreen({
    super.key,
    required this.programId,
    required this.pickupPointId,
    required this.stationLabel,
  });

  final String programId;
  final String? pickupPointId;

  /// The pickup point's name, carried by the route so the bar reads it
  /// before the roster arrives.
  final String stationLabel;

  @override
  ConsumerState<StaffArrivalsScreen> createState() =>
      _StaffArrivalsScreenState();
}

class _StaffArrivalsScreenState extends ConsumerState<StaffArrivalsScreen>
    with StaffOperationsScreen<StaffArrivalsScreen> {
  String? _openLegId;

  @override
  String get operationsProgramId => widget.programId;

  @override
  String? get operationsPickupPointId => widget.pickupPointId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final operations = watchOperations();
    final roster = catchAsyncStateFromAsyncValue(
      ref.watch(
        programArrivalsRosterViewProvider(
          widget.programId,
          widget.pickupPointId,
        ),
      ),
    );
    final state = switch (roster) {
      CatchAsyncState(hasData: true, :final value?) =>
        StaffArrivalsState.fromRoster(
          value.value,
          outbox: operations.outbox,
          savedAt: value.snapshotAt,
        ),
      CatchAsyncState(hasError: true) => const StaffArrivalsState.error(),
      _ => const StaffArrivalsState.loading(),
    };
    final errorMessage = operationsErrorMessage(operations);
    final access = catchAsyncStateFromAsyncValue(
      ref.watch(programWorkEntryProvider(widget.programId, null)),
    ).value?.value;
    final canDispatch =
        widget.pickupPointId != null &&
        access != null &&
        canReadProgramStation(
          access,
          widget.pickupPointId,
          dispatch: true,
          now: ref.read(programProjectionClockProvider)(),
        );
    final open = [
      ...state.needsYou,
      ...state.atCurb,
      ...state.landing,
    ].where((arrival) => arrival.row.legId == _openLegId).firstOrNull;
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('staff-arrivals-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.live,
          title: widget.stationLabel,
          kicker: switch (state.generatedAt) {
            final at? => l10n.hostStaffArrivalsKicker(
              time: AppTimeFormatters.time(at.toLocal()),
            ),
            null => l10n.hostStaffArrivalsKickerPlain,
          },
          back: CatchTopBarBack(
            label: l10n.hostStaffBackToJobs,
            onPressed: () => hostWorkspaceBack(
              context,
              fallback: Routes.hostWorkScreen.path,
            ),
          ),
          live: l10n.hostStaffArrivalsLive,
        ),
        body: StaffArrivalsBody(
          state: state,
          notices:
              StaffOperationsNoticeList.shows(
                outbox: operations.outbox,
                savedAt: state.savedAt,
                errorMessage: errorMessage,
              )
              ? StaffOperationsNoticeList(
                  savedAt: state.savedAt,
                  outbox: operations.outbox,
                  busy: operations.busy,
                  errorMessage: errorMessage,
                  onSync: () => syncOperations(operations),
                  onReview: () => reviewOperations(operations),
                  onSaveCopy: saveCopyOf(operations),
                )
              : null,
          onMove: (row, move) => unawaited(_move(operations, row, move)),
          onOpen: (row) => setState(() => _openLegId = row.legId),
          onRetry: () => ref.invalidate(
            programArrivalsRosterProvider(
              widget.programId,
              widget.pickupPointId,
            ),
          ),
        ),
        overlay: open == null
            ? null
            : StaffArrivalSheet(
                row: open.row,
                blocked: open.blocked || operations.busy,
                onMove: (move) {
                  setState(() => _openLegId = null);
                  unawaited(_move(operations, open.row, move));
                },
                onClose: () => setState(() => _openLegId = null),
              ),
        dock: canDispatch
            ? CatchDock(
                placement: CatchDockPlacement.bar,
                primary: CatchDockAction(
                  label: l10n.hostStaffArrivalsOpenDispatch(
                    count: state.atCurb.length,
                  ),
                  icon: CatchIcons.taxi,
                  onPressed: () => context.pushNamed(
                    Routes.hostWorkDispatchScreen.name,
                    pathParameters: {
                      'programId': widget.programId,
                      'pickupPointId': widget.pickupPointId!,
                    },
                    queryParameters: {'station': widget.stationLabel},
                  ),
                ),
              )
            : null,
      ),
    );
  }

  Future<void> _move(
    StaffOperations operations,
    ArrivalsRosterRow row,
    StaffArrivalMove move,
  ) async {
    await operationsController(
      operations.accountId,
    )?.observe(row, staffArrivalWireAction(move));
  }
}
