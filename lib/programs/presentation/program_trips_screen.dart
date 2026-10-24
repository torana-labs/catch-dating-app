import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/data/program_work_repository.dart';
import 'package:catch_dating_app/programs/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_trip_actions_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The trip ledger: every dispatch as a reconciliation record — plate,
/// vendor, class, manifest and outcome. Voided trips keep their row so the
/// vendor invoice can be checked line by line. Rows that are not yet
/// arrived surface in the needs-review strip for reconciliation viewers,
/// and the whole ledger exports to CSV.
class ProgramTripsScreen extends ConsumerStatefulWidget {
  const ProgramTripsScreen({super.key, required this.programId, this.now});

  final String programId;

  /// Test seam for duty-expiry checks; production uses wall clock.
  final DateTime Function()? now;

  @override
  ConsumerState<ProgramTripsScreen> createState() => _ProgramTripsScreenState();
}

class _ProgramTripsScreenState extends ConsumerState<ProgramTripsScreen> {
  final List<String> _cursors = [];
  bool _exceptionsOnly = false;
  bool _exporting = false;

  @override
  void didUpdateWidget(ProgramTripsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.programId != widget.programId) _cursors.clear();
  }

  void _latest() {
    setState(_cursors.clear);
    ref.invalidate(programTripListProvider(widget.programId));
  }

  Future<void> _export(String programTitle) async {
    setState(() => _exporting = true);
    try {
      await ref
          .read(programTripActionsProvider.notifier)
          .exportLedger(
            programId: widget.programId,
            programTitle: programTitle,
            subject: context.l10n.programsTripsExportSubject(
              title: programTitle,
            ),
          );
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = widget.now?.call() ?? DateTime.now();
    final accessAsync = ref.watch(
      programWorkEntryProvider(widget.programId, null),
    );
    final access = accessAsync.value?.value;
    final canVoid =
        access != null &&
        (access.isManager ||
            access.hasDuty(ProgramStaffDuty.transportDispatcher, now: now));
    final provider = programTripListProvider(
      widget.programId,
      cursor: _cursors.lastOrNull,
    );
    final tripsAsync = ref.watch(provider);
    return CatchAsyncBoundary<ProgramTripList>(
      retainDataOn: const {},
      value: tripsAsync,
      onRetry: _latest,
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
            retryLabel: context.l10n.programsTripsLatest,
          ),
        ),
      ),
      builder: (context, list) => _routeScaffold(
        body: CatchRouteBody.standardSections(
          sections: [
            CatchSectionListItem(
              child: Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  if (_cursors.isNotEmpty) ...[
                    CatchButton.command(
                      label: context.l10n.programsTripsNewer,
                      onPressed: () => setState(_cursors.removeLast),
                    ),
                    CatchButton.command(
                      label: context.l10n.programsTripsLatest,
                      onPressed: _latest,
                    ),
                  ],
                  if (list.nextCursor case final cursor?)
                    CatchButton.command(
                      label: context.l10n.programsTripsOlder,
                      onPressed: () => setState(() => _cursors.add(cursor)),
                    ),
                  CatchButton.command(
                    label: _exporting
                        ? context.l10n.programsTripsExporting
                        : context.l10n.programsTripsExport,
                    leading: Icon(CatchIcons.downloadRounded),
                    onPressed: _exporting
                        ? null
                        : () => _export(access?.title ?? widget.programId),
                  ),
                ],
              ),
            ),
            if (list.trips.any(
              (trip) => trip.status != TransportTripStatus.arrived,
            ))
              CatchSectionListItem(
                child: CatchSection.contained(
                  title: context.l10n.programsTripsReviewTitle,
                  subtitle: context.l10n.programsTripsReviewSubtitle,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: CatchSpacing.s2,
                        runSpacing: CatchSpacing.s2,
                        children: [
                          for (final status in TransportTripStatus.values)
                            if (status != TransportTripStatus.arrived)
                              CatchBadge.functional(
                                label:
                                    '${_statusLabel(context, status)} · ${list.trips.where((t) => t.status == status).length}',
                                tone: _statusTone(status),
                              ),
                        ],
                      ),
                      gapH8,
                      CatchButton.command(
                        label: _exceptionsOnly
                            ? context.l10n.programsTripsShowAll
                            : context.l10n.programsTripsReviewOnly,
                        onPressed: () =>
                            setState(() => _exceptionsOnly = !_exceptionsOnly),
                      ),
                    ],
                  ),
                ),
              ),
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsTripsLedgerTitle,
                subtitle: context.l10n.programsTripsLedgerSubtitle,
                child: list.trips.isEmpty
                    ? CatchEmptyState(
                        icon: CatchIcons.receiptLongOutlined,
                        message: context.l10n.programsTripsEmpty,
                        variant: CatchEmptyStateVariant.inline,
                      )
                    : Builder(
                        builder: (context) {
                          final visible = _exceptionsOnly
                              ? list.trips
                                    .where(
                                      (t) =>
                                          t.status !=
                                          TransportTripStatus.arrived,
                                    )
                                    .toList()
                              : list.trips;
                          if (visible.isEmpty) {
                            return CatchEmptyState(
                              icon: CatchIcons.checkCircleOutlineRounded,
                              message: context.l10n.programsTripsReviewEmpty,
                              variant: CatchEmptyStateVariant.inline,
                            );
                          }
                          return Column(
                            children: [
                              for (final trip in visible) ...[
                                ProgramTripLedgerRow(
                                  key: ValueKey(trip.tripId),
                                  trip: trip,
                                  programId: widget.programId,
                                  canVoid: canVoid,
                                  onChanged: () => ref.invalidate(provider),
                                ),
                                gapH8,
                              ],
                            ],
                          );
                        },
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  CatchRouteScaffold _routeScaffold({required CatchRouteBody body}) =>
      CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsTripsTitle,
          subtitle: context.l10n.programsTripsSubtitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: body,
      );
}

String _statusLabel(BuildContext context, TransportTripStatus status) {
  return switch (status) {
    TransportTripStatus.enRoute => context.l10n.programsTripsStatusEnRoute,
    TransportTripStatus.arrived => context.l10n.programsTripsStatusArrived,
    TransportTripStatus.cancelled => context.l10n.programsTripsStatusCancelled,
    TransportTripStatus.voided => context.l10n.programsTripsStatusVoided,
  };
}

CatchBadgeTone _statusTone(TransportTripStatus status) {
  return switch (status) {
    TransportTripStatus.enRoute => CatchBadgeTone.brand,
    TransportTripStatus.arrived => CatchBadgeTone.success,
    TransportTripStatus.cancelled => CatchBadgeTone.warning,
    TransportTripStatus.voided => CatchBadgeTone.danger,
  };
}

class ProgramTripLedgerRow extends ConsumerStatefulWidget {
  const ProgramTripLedgerRow({
    super.key,
    required this.trip,
    required this.programId,
    required this.canVoid,
    required this.onChanged,
  });

  final ProgramTripSummary trip;
  final String programId;

  /// Read-only duties (reconciliation viewer) never see the void affordance.
  final bool canVoid;
  final VoidCallback onChanged;

  @override
  ConsumerState<ProgramTripLedgerRow> createState() =>
      _ProgramTripLedgerRowState();
}

class _ProgramTripLedgerRowState extends ConsumerState<ProgramTripLedgerRow> {
  bool _busy = false;
  Object? _error;

  Future<void> _voidTrip() async {
    final reason = await showCatchBottomSheet<String>(
      context: context,
      builder: (context) => const ProgramTripVoidSheet(),
    );
    if (reason == null || reason.isEmpty || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(programTripActionsProvider.notifier)
          .voidTrip(
            programId: widget.programId,
            tripId: widget.trip.tripId,
            expectedRevision: widget.trip.revision,
            reason: reason,
            clientOperationId:
                'void_${widget.trip.tripId.hashCode.abs().toRadixString(36)}_'
                '${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}',
          );
      if (!mounted) return;
      widget.onChanged();
    } on Object catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trip = widget.trip;
    return CatchSurface.card(
      padding: CatchInsets.contentDense,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: CatchText(
                  trip.plateDisplay,
                  variant: CatchTextVariant.sectionTitle,
                ),
              ),
              CatchBadge.functional(
                label: _statusLabel(context, trip.status),
                tone: _statusTone(trip.status),
              ),
            ],
          ),
          gapH8,
          CatchMetaRow(icon: CatchIcons.hotel, label: trip.destinationLabel),
          CatchMetaRow(
            icon: CatchIcons.group,
            label: context.l10n.programsTripsRowMeta(
              passengers: trip.passengerCount,
              names: trip.guestNames.join(', '),
            ),
          ),
          if (trip.manifestSource == TransportManifestSource.currentRecords)
            CatchText(
              context.l10n.programsTripCurrentNames,
              variant: CatchTextVariant.bodyS,
            ),
          CatchMetaRow(
            icon: CatchIcons.clock,
            label: trip.arrivedAt != null
                ? context.l10n.programsTripsRowTimingArrived(
                    departed: AppTimeFormatters.time(trip.departedAt),
                    arrived: AppTimeFormatters.time(trip.arrivedAt!),
                  )
                : context.l10n.programsTripsRowTimingDeparted(
                    departed: AppTimeFormatters.time(trip.departedAt),
                  ),
          ),
          if (trip.vendorName != null)
            CatchMetaRow(
              icon: CatchIcons.businessOutlined,
              label: trip.vendorName!,
            ),
          if (trip.voidReason != null)
            CatchMetaRow(
              icon: CatchIcons.warningAmberRounded,
              label: trip.voidReason!,
            ),
          if (_error != null) ...[
            gapH8,
            CatchBanner.error(
              message: appErrorMessage(_error!, l10n: context.l10n),
            ),
          ],
          if (widget.canVoid && trip.status == TransportTripStatus.enRoute) ...[
            gapH12,
            CatchButton.command(
              label: context.l10n.programsTripsVoidAction,
              leading: Icon(CatchIcons.blockOutlined),
              onPressed: _busy ? null : _voidTrip,
            ),
          ],
        ],
      ),
    );
  }
}

class ProgramTripVoidSheet extends StatefulWidget {
  const ProgramTripVoidSheet({super.key});

  @override
  State<ProgramTripVoidSheet> createState() => _ProgramTripVoidSheetState();
}

class _ProgramTripVoidSheetState extends State<ProgramTripVoidSheet> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CatchSheet.standard(
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        label: context.l10n.programsTripsVoidConfirm,

        onPressed: _controller.text.trim().isEmpty
            ? null
            : () => Navigator.of(context).pop(_controller.text.trim()),
      ),
      title: context.l10n.programsTripsVoidSheetTitle,
      subtitle: context.l10n.programsTripsVoidSheetSubtitle,
      glyph: CatchIcons.warningAmberRounded,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchTextInput(
            controller: _controller,
            decoration: InputDecoration(
              hintText: context.l10n.programsTripsVoidReasonHint,
            ),
            textCapitalization: TextCapitalization.sentences,
            maxLines: 2,
            onChanged: (_) => setState(() {}),
          ),
        ],
      ),
    );
  }
}
