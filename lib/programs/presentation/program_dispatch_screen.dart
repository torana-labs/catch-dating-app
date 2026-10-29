import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_access_policy.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_notice.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The dispatcher's desk for one pickup station: the deterministic batch
/// suggestions plus the dispatch sheet that captures plate, vendor and class
/// at the moment the vehicle departs — the act that generates the
/// reconciliation record.
class ProgramDispatchScreen extends ConsumerStatefulWidget {
  const ProgramDispatchScreen({
    super.key,
    required this.programId,
    required this.pickupPointId,
    required this.stationLabel,
  });

  final String programId;
  final String pickupPointId;
  final String stationLabel;

  @override
  ConsumerState<ProgramDispatchScreen> createState() =>
      _ProgramDispatchScreenState();
}

class _ProgramDispatchScreenState extends ConsumerState<ProgramDispatchScreen> {
  Object? _openingError;
  String? _openingErrorAccount;

  Future<void> _openDispatchSheet(
    TransportGroupSuggestion group,
    ProgramReadView<ProgramTransportPlan> view,
    String? accountId,
  ) async {
    if (accountId == null || ref.read(uidProvider).asData?.value != accountId) {
      return;
    }
    try {
      final accessView = await ref.read(
        programWorkEntryProvider(widget.programId, null).future,
      );
      final access = accessView.value;
      final plan = view.value;
      if (!mounted || ref.read(uidProvider).asData?.value != accountId) return;
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
      final deadlines = [
        authority.expiresAt,
        plan.accessExpiresAt,
        accessView.snapshotExpiresAt,
        view.snapshotExpiresAt,
      ].whereType<DateTime>();
      final expiresAt = deadlines.isEmpty
          ? null
          : deadlines.reduce((a, b) => a.isBefore(b) ? a : b);
      // Ready groups may hold for expected parties bound for the same
      // destination; the dispatcher, not the suggestion engine, makes that call.
      final holdCandidates = group.readiness == TransportGroupReadiness.ready
          ? plan.groups
                .where(
                  (candidate) =>
                      candidate.readiness == TransportGroupReadiness.expected &&
                      _sameDestination(group, candidate),
                )
                .toList(growable: false)
          : const <TransportGroupSuggestion>[];
      await showCatchBottomSheet<void>(
        context: context,
        builder: (sheetContext) => ProgramDispatchSheet(
          programId: widget.programId,
          accessExpiresAt: expiresAt,
          authorityGeneration: ref.read(
            programAuthorityGenerationProvider(accountId, widget.programId),
          ),
          accountId: accountId,
          pickupPointId: widget.pickupPointId,
          organizerId: access.organizerId,
          group: group,
          holdCandidates: holdCandidates,
          vehicleClasses: access.vehicleClasses,
          onDispatched: (summary, error) {
            if (!mounted) return;
            if (ref.read(uidProvider).asData?.value != accountId) return;
            setState(() {
              _openingError = error;
              _openingErrorAccount = accountId;
            });
          },
        ),
      );
    } on Object catch (error) {
      if (mounted && ref.read(uidProvider).asData?.value == accountId) {
        setState(() {
          _openingError = error;
          _openingErrorAccount = accountId;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final uidState = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final accountId = uidState.isSettledData ? uidState.value : null;
    final operations = catchAsyncStateFromAsyncValue(
      ref.watch(programOperationsStateProvider(widget.programId)),
    );
    final current = operations.value;
    final planAsync = ref.watch(
      programTransportPlanViewProvider(widget.programId, widget.pickupPointId),
    );
    return CatchAsyncBoundary<ProgramReadView<ProgramTransportPlan>>(
      retainDataOn: const {},
      value: planAsync,
      onRetry: () => ref.invalidate(
        programTransportPlanProvider(widget.programId, widget.pickupPointId),
      ),
      loadingBuilder: (_) => _routeScaffold(
        body: const CatchRouteBody.standardViewport(
          child: CatchStateViewport.loading(accountForBottomOverlay: false),
        ),
      ),
      errorBuilder: (_, error, _, onBoundaryRetry) => _routeScaffold(
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            error,
            context: AppErrorContext.event,
            onRetry: onBoundaryRetry,
          ),
        ),
      ),
      builder: (context, result) => _routeScaffold(
        body: CatchRouteBody.standardSections(
          sections: [
            if (result.snapshotAt != null)
              CatchSectionListItem(
                child: CatchBanner(
                  title: context.l10n.programsSnapshotTitle,
                  message: context.l10n.programsSnapshotBanner(
                    time: AppTimeFormatters.time(result.snapshotAt!),
                  ),
                  icon: CatchIcons.offline,
                  tone: CatchBannerTone.warning,
                ),
              ),
            if (operations.hasError || operations.value?.hasStatus == true)
              CatchSectionListItem(
                child: ProgramOperationsNotice(
                  programId: widget.programId,
                  pickupPointId: widget.pickupPointId,
                ),
              ),
            ..._planSections(
              context,
              plan: result.value,
              outbox:
                  current?.outbox ?? const ProgramOperationOutboxSummary([]),
              busy:
                  !operations.isSettledData || current == null || current.busy,
              mutationError: _openingErrorAccount == accountId
                  ? _openingError
                  : null,
              onDispatch: (group) =>
                  _openDispatchSheet(group, result, accountId),
            ),
          ],
        ),
      ),
    );
  }

  CatchRouteScaffold _routeScaffold({required CatchRouteBody body}) =>
      CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: widget.stationLabel,
          subtitle: context.l10n.programsDispatchTitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: body,
      );

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

class ProgramDispatchGroupTile extends StatelessWidget {
  const ProgramDispatchGroupTile({
    super.key,
    required this.group,
    required this.onDispatch,
  });

  final TransportGroupSuggestion group;
  final VoidCallback? onDispatch;

  @override
  Widget build(BuildContext context) {
    return CatchSurface.card(
      padding: CatchInsets.contentDense,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: CatchText(
                  '${AppTimeFormatters.time(group.earliestCurbAt)}'
                  ' – ${AppTimeFormatters.time(group.latestCurbAt)}',
                  variant: CatchTextVariant.sectionTitle,
                ),
              ),
              CatchBadge.functional(
                label: group.vehicleClassLabel,
                tone: CatchBadgeTone.brand,
              ),
            ],
          ),
          gapH8,
          CatchMetaRow(icon: CatchIcons.hotel, label: group.destinationLabel),
          CatchMetaRow(
            icon: CatchIcons.people,
            label: context.l10n.programsDispatchGroupMeta(
              passengers: group.passengers,
              luggage: group.luggageUnits,
              legs: group.legIds.length,
            ),
          ),
          if (group.dispatchBy != null)
            CatchMetaRow(
              icon: CatchIcons.time,
              label: group.waitOverdue
                  ? context.l10n.programsDispatchWaitOverdue(
                      time: AppTimeFormatters.time(group.dispatchBy!),
                    )
                  : context.l10n.programsDispatchDispatchBy(
                      time: AppTimeFormatters.time(group.dispatchBy!),
                    ),
              color: group.waitOverdue
                  ? Theme.of(context).colorScheme.error
                  : null,
            ),
          gapH12,
          CatchButton(
            label: context.l10n.programsDispatchAction,
            leading: Icon(CatchIcons.taxi),
            fullWidth: true,
            onPressed: onDispatch,
          ),
        ],
      ),
    );
  }
}

/// Plate capture + vendor + class override. The dispatch write is queued
/// through the operations outbox so a dead zone cannot lose a departure.
class ProgramDispatchSheet extends ConsumerStatefulWidget {
  const ProgramDispatchSheet({
    super.key,
    required this.programId,
    required this.accessExpiresAt,
    required this.authorityGeneration,
    required this.pickupPointId,
    required this.organizerId,
    required this.accountId,
    required this.group,
    required this.holdCandidates,
    required this.vehicleClasses,
    required this.onDispatched,
  });

  final DateTime? accessExpiresAt;
  final int authorityGeneration;
  final String programId;
  final String pickupPointId;
  final String organizerId;
  final String accountId;
  final TransportGroupSuggestion group;

  /// Expected-readiness suggestions bound for the same destination; toggling
  /// one pins its legs into this dispatch so the vehicle waits for them.
  final List<TransportGroupSuggestion> holdCandidates;
  final List<ProgramVehicleClass> vehicleClasses;
  final void Function(ProgramOperationOutboxSummary? summary, Object? error)
  onDispatched;

  @override
  ConsumerState<ProgramDispatchSheet> createState() =>
      _ProgramDispatchSheetState();
}

class _ProgramDispatchSheetState extends ConsumerState<ProgramDispatchSheet> {
  final _plateController = TextEditingController();
  late String _vehicleClassId = widget.group.vehicleClassId;
  final Set<int> _heldCandidates = {};
  String? _vendorId;
  bool _busy = false;
  Object? _error;

  List<String> get _dispatchLegIds => [
    ...widget.group.legIds,
    for (final index in _heldCandidates) ...widget.holdCandidates[index].legIds,
  ];

  int get _passengers =>
      widget.group.passengers +
      _heldCandidates.fold(
        0,
        (sum, index) => sum + widget.holdCandidates[index].passengers,
      );

  int get _luggageUnits =>
      widget.group.luggageUnits +
      _heldCandidates.fold(
        0,
        (sum, index) => sum + widget.holdCandidates[index].luggageUnits,
      );

  @override
  void dispose() {
    _plateController.dispose();
    super.dispose();
  }

  Future<void> _dispatch() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (ref.read(
                programAuthorityGenerationProvider(
                  widget.accountId,
                  widget.programId,
                ),
              ) !=
              widget.authorityGeneration ||
          !isProgramProjectionActive(
            widget.accessExpiresAt,
            ref.read(programProjectionClockProvider)(),
          )) {
        throw const PermissionException(
          'Program access expired. Refresh this view.',
        );
      }
      if (ref.read(uidProvider).asData?.value != widget.accountId) {
        throw const SignInRequiredException('dispatch this saved manifest');
      }
      final view = await ref.read(
        programArrivalsRosterViewProvider(
          widget.programId,
          widget.pickupPointId,
        ).future,
      );
      if (!mounted) return;
      if (ref.read(
                programAuthorityGenerationProvider(
                  widget.accountId,
                  widget.programId,
                ),
              ) !=
              widget.authorityGeneration ||
          !isProgramProjectionActive(
            widget.accessExpiresAt,
            ref.read(programProjectionClockProvider)(),
          )) {
        throw const PermissionException(
          'Program access expired. Refresh this view.',
        );
      }
      if (ref.read(uidProvider).asData?.value != widget.accountId) {
        throw const SignInRequiredException('dispatch this saved manifest');
      }
      if (!isProgramProjectionActive(
        programProjectionDeadline(
          view.value.accessExpiresAt,
          view.snapshotExpiresAt,
        ),
        ref.read(programProjectionClockProvider)(),
      )) {
        throw const PermissionException(
          'Roster access expired. Refresh this view.',
        );
      }
      final provider = programOperationsControllerProvider(
        widget.programId,
        widget.accountId,
      );
      final accepted = await ref
          .read(provider.notifier)
          .dispatch(
            roster: view.value,
            pickupPointId: widget.pickupPointId,
            vehicleClassId: _vehicleClassId,
            plateDisplay: _plateController.text.trim(),
            legIds: _dispatchLegIds,
            destinationHotelId: widget.group.destinationHotelId,
            destinationLabel: widget.group.destinationLabel,
            vendorId: _vendorId,
          );
      if (!mounted) return;
      if (accepted) {
        widget.onDispatched(ref.read(provider).asData?.value.outbox, null);
        Navigator.of(context).pop();
      } else {
        setState(() => _error = ref.read(provider).asData?.value.error);
      }
    } on Object catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final uidState = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final accountMatches =
        uidState.isSettledData && uidState.value == widget.accountId;
    final active = ref.watch(
      programProjectionActiveProvider(widget.accessExpiresAt),
    );
    final authorityMatches =
        ref.watch(
          programAuthorityGenerationProvider(
            widget.accountId,
            widget.programId,
          ),
        ) ==
        widget.authorityGeneration;
    if (!accountMatches || !active || !authorityMatches) {
      return CatchSheet.standard(
        title: context.l10n.programsDispatchSheetTitle,
        child: CatchLocalizedErrorState(
          const PermissionException(
            'Program access changed. Reopen this view.',
          ),
          context: AppErrorContext.event,
          actions: [
            CatchButton(
              label: MaterialLocalizations.of(context).closeButtonLabel,
              onPressed: () => Navigator.of(context).pop(),
            ),
          ],
        ),
      );
    }
    final vendorsAsync = ref.watch(
      programTransportVendorsProvider(widget.organizerId, widget.programId),
    );
    final classes = [...widget.vehicleClasses]
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final operations = catchAsyncStateFromAsyncValue(
      ref.watch(programOperationsStateProvider(widget.programId)),
    );
    final canDispatch =
        accountMatches &&
        operations.isSettledData &&
        operations.value?.busy == false &&
        _plateController.text.trim().isNotEmpty &&
        !_busy;
    return CatchSheet.standard(
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        label: context.l10n.programsDispatchConfirm,
        leading: Icon(CatchIcons.taxi),

        status: _busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
        onPressed: canDispatch ? _dispatch : null,
      ),
      title: context.l10n.programsDispatchSheetTitle,
      subtitle: context.l10n.programsDispatchSheetSubtitle(
        destination: widget.group.destinationLabel,
      ),
      glyph: CatchIcons.taxi,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null)
            CatchBanner.error(
              message: appErrorMessage(_error!, l10n: context.l10n),
            ),
          CatchMetaRow(
            icon: CatchIcons.people,
            label: context.l10n.programsDispatchGroupMeta(
              passengers: _passengers,
              luggage: _luggageUnits,
              legs: _dispatchLegIds.length,
            ),
          ),
          if (widget.holdCandidates.isNotEmpty) ...[
            gapH16,
            CatchText(
              context.l10n.programsDispatchHoldTitle,
              variant: CatchTextVariant.supportingStrong,
            ),
            gapH4,
            CatchText(
              context.l10n.programsDispatchHoldSubtitle(
                destination: widget.group.destinationLabel,
              ),
              variant: CatchTextVariant.bodyS,
            ),
            gapH8,
            CatchChoiceInput<int>(
              values: List.generate(
                widget.holdCandidates.length,
                (index) => index,
              ),
              itemLabelBuilder: (index) =>
                  context.l10n.programsDispatchHoldOption(
                    time: AppTimeFormatters.time(
                      widget.holdCandidates[index].earliestCurbAt,
                    ),
                    passengers: widget.holdCandidates[index].passengers,
                  ),
              selected: _heldCandidates,
              mode: CatchChipMode.multiple,
              allowEmptySelection: true,
              onChanged: (selected) => setState(() {
                _heldCandidates
                  ..clear()
                  ..addAll(selected);
              }),
            ),
          ],
          gapH16,
          CatchTextInput(
            controller: _plateController,
            decoration: InputDecoration(
              hintText: context.l10n.programsDispatchPlateHint,
            ),
            keyboardType: TextInputType.visiblePassword,
            textCapitalization: TextCapitalization.characters,
            onChanged: (_) => setState(() {}),
          ),
          gapH16,
          CatchChoiceInput<String>(
            values: [for (final entry in classes) entry.id],
            itemLabelBuilder: (id) =>
                classes.firstWhere((entry) => entry.id == id).label,
            selected: {
              for (final entry in classes)
                if (entry.id == _vehicleClassId) entry.id,
            },
            mode: CatchChipMode.single,
            onChanged: (selected) =>
                setState(() => _vehicleClassId = selected.single),
          ),

          gapH16,
          vendorsAsync.when(
            data: (vendors) {
              final active = vendors
                  .where((vendor) => vendor.active && vendor.boundToProgram)
                  .toList(growable: false);
              if (active.isEmpty) {
                return CatchMetaRow(
                  icon: CatchIcons.business,
                  label: context.l10n.programsDispatchNoVendors,
                );
              }
              return CatchChoiceInput<String>(
                values: [for (final vendor in active) vendor.vendorId],
                itemLabelBuilder: (id) =>
                    active.firstWhere((vendor) => vendor.vendorId == id).name,
                selected: {
                  for (final vendor in active)
                    if (vendor.vendorId == _vendorId) vendor.vendorId,
                },
                mode: CatchChipMode.single,
                allowEmptySelection: true,
                onChanged: (selected) =>
                    setState(() => _vendorId = selected.firstOrNull),
              );
            },
            loading: CatchLoadingIndicator.new,
            error: (_, _) => CatchMetaRow(
              icon: CatchIcons.warning,
              label: context.l10n.programsDispatchVendorsUnavailable,
            ),
          ),
        ],
      ),
    );
  }
}

List<CatchSectionListItem> _planSections(
  BuildContext context, {
  required ProgramTransportPlan plan,
  required ProgramOperationOutboxSummary outbox,
  required Object? mutationError,
  required bool busy,
  required void Function(TransportGroupSuggestion group) onDispatch,
}) {
  return [
    if (mutationError != null)
      CatchSectionListItem(
        child: CatchBanner.error(
          message: appErrorMessage(mutationError, l10n: context.l10n),
        ),
      ),
    CatchSectionListItem(
      child: CatchSection.contained(
        title: context.l10n.programsDispatchGroupsTitle,
        subtitle: context.l10n.programsDispatchGroupsSubtitle,
        child: plan.groups.isEmpty
            ? CatchEmptyState(
                icon: CatchIcons.taxi,
                message: context.l10n.programsDispatchGroupsEmpty,
                variant: CatchEmptyStateVariant.inline,
              )
            : Column(
                children: [
                  for (final group in plan.groups) ...[
                    ProgramDispatchGroupTile(
                      group: group,
                      onDispatch:
                          busy ||
                              outbox.entries.any(
                                (entry) =>
                                    entry.kind ==
                                        ProgramOperationKind.dispatch &&
                                    (entry.payload['legIds']! as List).any(
                                      group.legIds.contains,
                                    ),
                              )
                          ? null
                          : () => onDispatch(group),
                    ),
                    gapH8,
                  ],
                ],
              ),
      ),
    ),
    if (plan.unassigned.isNotEmpty)
      CatchSectionListItem(
        child: CatchSection.contained(
          title: context.l10n.programsDispatchUnassignedTitle,
          subtitle: context.l10n.programsDispatchUnassignedSubtitle,
          child: Column(
            children: [
              for (final item in plan.unassigned)
                CatchFieldRow.standard(
                  leading: Icon(CatchIcons.warning),
                  body: CatchText(
                    _unassignedReasonText(context, item.reason),
                    variant: CatchTextVariant.bodyM,
                  ),
                ),
            ],
          ),
        ),
      ),
  ];
}

String _unassignedReasonText(
  BuildContext context,
  TransportUnassignedReason reason,
) {
  return switch (reason) {
    TransportUnassignedReason.missingTime =>
      context.l10n.programsDispatchReasonMissingTime,
    TransportUnassignedReason.noSuitableVehicle =>
      context.l10n.programsDispatchReasonNoVehicle,
    TransportUnassignedReason.missingScope =>
      context.l10n.programsDispatchReasonMissingScope,
  };
}
