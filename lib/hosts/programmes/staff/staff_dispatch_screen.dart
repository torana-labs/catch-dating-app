import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_policy.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_dispatch_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_dispatch_state.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_operations.dart';
import 'package:catch_dating_app/hosts/programmes/staff/widgets/staff_dispatch_sheet.dart';
import 'package:catch_dating_app/hosts/programmes/staff/widgets/staff_operations_notices.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_controller.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The dispatcher's desk for one pickup point, always night: the cars the
/// plan suggests by curb time and hotel, and the contained sheet that sends
/// one.
///
/// It reads the transport plan and the arrivals roster (offline from the
/// phone's saved copies). Dispatch now checks the dispatcher may still send
/// to that destination, fences each party's revision against the roster
/// and queues the dispatch through the operations outbox, so a dead zone
/// cannot lose a departure.
class StaffDispatchScreen extends ConsumerStatefulWidget {
  const StaffDispatchScreen({
    super.key,
    required this.programId,
    required this.pickupPointId,
    required this.stationLabel,
  });

  final String programId;
  final String pickupPointId;
  final String stationLabel;

  @override
  ConsumerState<StaffDispatchScreen> createState() =>
      _StaffDispatchScreenState();
}

class _StaffDispatchScreenState extends ConsumerState<StaffDispatchScreen>
    with StaffOperationsScreen<StaffDispatchScreen> {
  final _plate = TextEditingController();
  TransportGroupSuggestion? _sending;
  String? _classId;
  String? _vendorId;
  final Set<String> _held = {};
  bool _busy = false;
  Object? _error;

  @override
  String get operationsProgramId => widget.programId;

  @override
  String? get operationsPickupPointId => widget.pickupPointId;

  @override
  void dispose() {
    _plate.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final operations = watchOperations();
    final plan = ref.watch(
      programTransportPlanViewProvider(widget.programId, widget.pickupPointId),
    );
    final roster = ref
        .watch(
          programArrivalsRosterViewProvider(
            widget.programId,
            widget.pickupPointId,
          ),
        )
        .asData
        ?.value
        .value;
    final access = ref
        .watch(programWorkEntryProvider(widget.programId, null))
        .asData
        ?.value
        .value;
    final vehicleClasses = [
      ...(roster?.vehicleClasses ?? access?.vehicleClasses ?? const []),
    ]..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final state = switch (plan) {
      AsyncData(:final value) => StaffDispatchState.fromPlan(
        value.value,
        outbox: operations.outbox,
        vehicleClasses: vehicleClasses,
        roster: roster,
        savedAt: value.snapshotAt,
      ),
      AsyncError() => const StaffDispatchState.error(),
      _ => const StaffDispatchState.loading(),
    };
    final errorMessage = operationsErrorMessage(operations);
    final sending = _sending;
    StaffDispatchSheet? sheet;
    if (sending != null && access != null) {
      final vendors = ref.watch(
        programTransportVendorsProvider(access.organizerId, widget.programId),
      );
      final active = [
        for (final vendor
            in vendors.asData?.value ?? const <ProgramVendorOption>[])
          if (vendor.active && vendor.boundToProgram) vendor,
      ];
      final holds = sending.readiness == TransportGroupReadiness.ready
          ? [
              for (final candidate
                  in plan.asData?.value.value.groups ??
                      const <TransportGroupSuggestion>[])
                if (candidate.readiness == TransportGroupReadiness.expected &&
                    _sameDestination(sending, candidate))
                  candidate,
            ]
          : const <TransportGroupSuggestion>[];
      final heldGroups = [
        for (final candidate in holds)
          if (_held.contains(candidate.legIds.join(','))) candidate,
      ];
      final passengers = heldGroups.fold(
        sending.passengers,
        (sum, candidate) => sum + candidate.passengers,
      );
      final vendorName = active
          .where((vendor) => vendor.vendorId == _vendorId)
          .firstOrNull
          ?.name;
      sheet = StaffDispatchSheet(
        vehicle:
            vehicleClasses
                .where((vehicle) => vehicle.id == _classId)
                .firstOrNull
                ?.label ??
            sending.vehicleClassLabel,
        summary: [
          ?vendorName,
          l10n.hostStaffDispatchSummary(
            count: passengers,
            destination: sending.destinationLabel,
          ),
        ].join(' · '),
        plate: _plate,
        onPlateChanged: (_) => setState(() {}),
        classes: [
          for (final vehicle in vehicleClasses)
            StaffDispatchChoice(id: vehicle.id, label: vehicle.label),
        ],
        classId: _classId ?? sending.vehicleClassId,
        onClass: (id) => setState(() => _classId = id),
        vendors: [
          for (final vendor in active)
            StaffDispatchChoice(id: vendor.vendorId, label: vendor.name),
        ],
        vendorId: _vendorId,
        onVendor: (id) => setState(() => _vendorId = id),
        vendorNote: switch (vendors) {
          AsyncError() => l10n.hostStaffDispatchVendorsFailed,
          AsyncData() when active.isEmpty => l10n.hostStaffDispatchNoVendors,
          AsyncData() => null,
          _ => l10n.hostStaffDispatchVendorsLoading,
        },
        holds: [
          for (final candidate in holds)
            StaffDispatchChoice(
              id: candidate.legIds.join(','),
              label: l10n.hostStaffDispatchHoldOption(
                time: AppTimeFormatters.time(
                  candidate.earliestCurbAt.toLocal(),
                ),
                count: candidate.passengers,
              ),
            ),
        ],
        held: _held,
        onHold: (id) => setState(() {
          if (!_held.remove(id)) _held.add(id);
        }),
        canDispatch:
            _plate.text.trim().isNotEmpty &&
            roster != null &&
            operations.accountId != null &&
            !operations.busy,
        busy: _busy,
        error: switch (_error) {
          final error? => appErrorMessage(error, l10n: l10n),
          null => null,
        },
        onDispatch: () => unawaited(
          _dispatch(sending, heldGroups, access, operations.accountId),
        ),
        onClose: () => setState(() => _sending = null),
      );
    }
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('staff-dispatch-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.live,
          title: l10n.hostStaffDispatchTitle,
          kicker: widget.stationLabel,
          back: CatchTopBarBack(
            label: l10n.hostStaffDispatchBack,
            onPressed: () => hostWorkspaceBack(
              context,
              fallback: Routes.hostWorkScreen.path,
            ),
          ),
          live: l10n.hostStaffDispatchLive,
        ),
        body: StaffDispatchBody(
          state: state,
          busy: operations.busy,
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
          onDispatch: (group) => setState(() {
            _sending = group;
            _classId = group.vehicleClassId;
            _vendorId = null;
            _held.clear();
            _plate.clear();
            _error = null;
          }),
          onRetry: () => ref.invalidate(
            programTransportPlanProvider(
              widget.programId,
              widget.pickupPointId,
            ),
          ),
        ),
        overlay: sheet,
      ),
    );
  }

  Future<void> _dispatch(
    TransportGroupSuggestion group,
    List<TransportGroupSuggestion> held,
    ProgramWorkAccess access,
    String? accountId,
  ) async {
    if (_busy || accountId == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final generation = ref.read(
        programAuthorityGenerationProvider(accountId, widget.programId),
      );
      final authority = programDispatchAccess(
        access,
        widget.pickupPointId,
        group.destinationHotelId,
        now: ref.read(programProjectionClockProvider)(),
      );
      if (!authority.allowed) {
        throw const PermissionException(
          'This route is outside your dispatch access.',
        );
      }
      // provider-graph: ownership-widget-async:_StaffDispatchScreenState._dispatch:await:programArrivalsRosterViewProvider.future planned CAT156 -- Owns pending/error and roster/access-generation checks around the existing operations outbox seam. Preserve access deadlines, actor generation and durable dispatch recovery.
      final view = await ref.read(
        programArrivalsRosterViewProvider(
          widget.programId,
          widget.pickupPointId,
        ).future,
      );
      if (!mounted) return;
      final clock = ref.read(programProjectionClockProvider)();
      if (ref.read(uidProvider).asData?.value != accountId) {
        throw const SignInRequiredException('dispatch this saved manifest');
      }
      if (ref.read(
                programAuthorityGenerationProvider(accountId, widget.programId),
              ) !=
              generation ||
          !isProgramProjectionActive(authority.expiresAt, clock) ||
          !isProgramProjectionActive(
            programProjectionDeadline(
              view.value.accessExpiresAt,
              view.snapshotExpiresAt,
            ),
            clock,
          )) {
        throw const PermissionException(
          'Program access expired. Refresh this view.',
        );
      }
      // provider-graph: ownership-widget-async:_StaffDispatchScreenState._dispatch:await:programOperationsControllerProvider.dispatch planned CAT156 -- Owns pending/error and roster/access-generation checks around the existing operations outbox seam. Preserve access deadlines, actor generation and durable dispatch recovery.
      final accepted =
          await operationsController(accountId)?.dispatch(
            roster: view.value,
            pickupPointId: widget.pickupPointId,
            vehicleClassId: _classId ?? group.vehicleClassId,
            plateDisplay: _plate.text.trim(),
            legIds: [
              ...group.legIds,
              for (final candidate in held) ...candidate.legIds,
            ],
            destinationHotelId: group.destinationHotelId,
            destinationLabel: group.destinationLabel,
            vendorId: _vendorId,
          ) ??
          false;
      if (!mounted) return;
      if (accepted) {
        setState(() => _sending = null);
      } else {
        final current = ref
            .read(programOperationsStateProvider(widget.programId))
            .asData
            ?.value;
        setState(() => _error = current?.error);
      }
    } on Object catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  bool _sameDestination(
    TransportGroupSuggestion a,
    TransportGroupSuggestion b,
  ) {
    if (a.destinationHotelId != null || b.destinationHotelId != null) {
      return a.destinationHotelId != null &&
          a.destinationHotelId == b.destinationHotelId;
    }
    return a.destinationLabel == b.destinationLabel;
  }
}
