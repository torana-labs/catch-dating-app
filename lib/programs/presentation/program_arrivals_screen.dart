import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/data/program_operations_outbox.dart';
import 'package:catch_dating_app/programs/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/programs/data/program_work_repository.dart';
import 'package:catch_dating_app/programs/domain/program_models.dart';
import 'package:catch_dating_app/programs/domain/program_operation_projection.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_notice.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

export 'program_operations_notice.dart' show ProgramArrivalsOutboxBanner;

/// The greeter's live arrivals roster for one pickup station.
///
/// Rows are sorted by curb estimate — the moment a guest actually reaches
/// the exit, not when the wheels touch — and claims are exclusive so two
/// greeters never greet the same party. Mutations go through the offline
/// outbox: a claim taken in a dead zone is replayed with the same
/// `clientOperationId` so the server cannot double-apply it.
class ProgramArrivalsScreen extends ConsumerWidget {
  const ProgramArrivalsScreen({
    super.key,
    required this.programId,
    required this.pickupPointId,
    required this.stationLabel,
  });

  final String programId;
  final String? pickupPointId;
  final String stationLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidState = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final accountId = uidState.isSettledData ? uidState.value : null;
    final operations = catchAsyncStateFromAsyncValue(
      ref.watch(programOperationsStateProvider(programId)),
    );
    final outbox =
        operations.value?.outbox ?? const ProgramOperationOutboxSummary([]);
    final busy = !operations.isSettledData || (operations.value?.busy ?? true);
    final rosterAsync = ref.watch(
      programArrivalsRosterViewProvider(programId, pickupPointId),
    );
    return CatchAsyncBoundary<ProgramReadView<ProgramArrivalsRoster>>(
      retainDataOn: const {},
      value: rosterAsync,
      onRetry: () => ref.invalidate(
        programArrivalsRosterProvider(programId, pickupPointId),
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
                  programId: programId,
                  pickupPointId: pickupPointId,
                ),
              ),
            ..._rosterSections(
              context,
              roster: result.value,
              outbox: outbox,
              busy: busy,
              onAction: (row, action, {manualCurbNote}) async {
                if (accountId == null) return;
                await ref
                    .read(
                      programOperationsControllerProvider(
                        programId,
                        accountId,
                      ).notifier,
                    )
                    .observe(row, action, manualCurbNote: manualCurbNote);
              },
            ),
          ],
        ),
      ),
    );
  }

  CatchRouteScaffold _routeScaffold({required CatchRouteBody body}) =>
      CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: stationLabel,
          subtitle: context.l10n.programsArrivalsTitle,
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

List<CatchSectionListItem> _rosterSections(
  BuildContext context, {
  required ProgramArrivalsRoster roster,
  required ProgramOperationOutboxSummary outbox,
  required bool busy,
  required Future<void> Function(
    ArrivalsRosterRow row,
    String action, {
    String? manualCurbNote,
  })
  onAction,
}) {
  final projected = {
    for (final row in roster.rows)
      row.legId: projectProgramArrival(row, outbox),
  };
  final rows = projected.values.map((view) => view.row);
  final attention = rows
      .where((row) => row.needsAttention)
      .toList(growable: false);
  final ready =
      rows
          .where(
            (row) =>
                !row.needsAttention &&
                row.readiness == TravelLegReadiness.ready,
          )
          .toList(growable: false)
        ..sort(
          (a, b) => (a.curbAt ?? DateTime.fromMillisecondsSinceEpoch(0))
              .compareTo(b.curbAt ?? DateTime.fromMillisecondsSinceEpoch(0)),
        );
  final expected =
      rows
          .where(
            (row) =>
                !row.needsAttention &&
                row.readiness == TravelLegReadiness.expected,
          )
          .toList(growable: false)
        ..sort(
          (a, b) => (a.curbAt ?? DateTime.fromMillisecondsSinceEpoch(0))
              .compareTo(b.curbAt ?? DateTime.fromMillisecondsSinceEpoch(0)),
        );

  return <CatchSectionListItem>[
    if (attention.isNotEmpty)
      CatchSectionListItem(
        child: CatchSection.contained(
          title: context.l10n.programsArrivalsAttentionTitle,
          subtitle: context.l10n.programsArrivalsAttentionSubtitle,
          child: Column(
            children: [
              for (final row in attention)
                ProgramArrivalRow(
                  row: row,
                  blocked: busy || projected[row.legId]!.blocked,
                  queuedStatus: outbox.forLeg(row.legId)?.status,
                  onAction: onAction,
                ),
            ],
          ),
        ),
      ),
    CatchSectionListItem(
      child: CatchSection.contained(
        title: context.l10n.programsArrivalsReadyTitle,
        subtitle: context.l10n.programsArrivalsReadySubtitle,
        child: ready.isEmpty
            ? CatchEmptyState(
                icon: CatchIcons.meetingPoint,
                message: context.l10n.programsArrivalsReadyEmpty,
                variant: CatchEmptyStateVariant.inline,
              )
            : Column(
                children: [
                  for (final row in ready)
                    ProgramArrivalRow(
                      row: row,
                      blocked: busy || projected[row.legId]!.blocked,
                      queuedStatus: outbox.forLeg(row.legId)?.status,
                      onAction: onAction,
                    ),
                ],
              ),
      ),
    ),
    CatchSectionListItem(
      child: CatchSection.contained(
        title: context.l10n.programsArrivalsExpectedTitle,
        subtitle: context.l10n.programsArrivalsExpectedSubtitle,
        child: expected.isEmpty
            ? CatchEmptyState(
                icon: CatchIcons.arrivals,
                message: context.l10n.programsArrivalsExpectedEmpty,
                variant: CatchEmptyStateVariant.inline,
              )
            : Column(
                children: [
                  for (final row in expected)
                    ProgramArrivalRow(
                      row: row,
                      blocked: busy || projected[row.legId]!.blocked,
                      queuedStatus: outbox.forLeg(row.legId)?.status,
                      onAction: onAction,
                    ),
                ],
              ),
      ),
    ),
  ];
}

class ProgramArrivalRow extends StatelessWidget {
  const ProgramArrivalRow({
    super.key,
    required this.row,
    required this.queuedStatus,
    this.blocked = false,
    required this.onAction,
  });

  final ArrivalsRosterRow row;
  final ProgramOperationOutboxStatus? queuedStatus;
  final bool blocked;
  final Future<void> Function(
    ArrivalsRosterRow row,
    String action, {
    String? manualCurbNote,
  })
  onAction;

  @override
  Widget build(BuildContext context) {
    final claimed = row.claimedByDisplay != null;
    return CatchFieldRow.standard(
      leading: Icon(
        row.needsAttention
            ? CatchIcons.warning
            : row.readiness == TravelLegReadiness.ready
            ? CatchIcons.meetingPoint
            : CatchIcons.arrivals,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(row.partyTitle, variant: CatchTextVariant.sectionTitle),
          CatchMetaRow(icon: CatchIcons.people, label: _meta(context)),
          gapH4,
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s1,
            children: [
              ProgramArrivalReadinessBadge(row: row),
              if (claimed)
                CatchBadge.functional(
                  label: row.claimedByMe
                      ? context.l10n.programsArrivalsClaimedByMe
                      : context.l10n.programsArrivalsClaimedBy(
                          name: row.claimedByDisplay!,
                        ),
                  tone: CatchBadgeTone.brand,
                ),
              if (queuedStatus != null)
                CatchBadge(
                  label:
                      queuedStatus == ProgramOperationOutboxStatus.needsReview
                      ? context.l10n.programsOperationsReviewBadge
                      : context.l10n.programsArrivalsQueued,
                  tone: queuedStatus == ProgramOperationOutboxStatus.needsReview
                      ? CatchBadgeTone.danger
                      : CatchBadgeTone.warning,
                  icon: CatchIcons.offline,
                ),
            ],
          ),
        ],
      ),
      trailing: ProgramArrivalActionMenu(
        row: row,
        queued: blocked,
        onAction: onAction,
      ),
    );
  }

  String _meta(BuildContext context) {
    final parts = <String>[
      context.l10n.programsArrivalsPassengerCount(count: row.passengers),
      if (row.luggageUnits > 0)
        context.l10n.programsArrivalsBagCount(count: row.luggageUnits),
      if (row.flightNumber != null) row.flightNumber!,
      if (row.originIata != null)
        context.l10n.programsArrivalsOrigin(airport: row.originIata!),
      if (row.arrivalTerminal != null)
        context.l10n.programsArrivalsTerminal(terminal: row.arrivalTerminal!),
      row.curbLabel(context),
      row.destinationLabel,
    ];
    return parts.join(' · ');
  }
}

extension on ArrivalsRosterRow {
  String curbLabel(BuildContext context) {
    if (curbAt != null) {
      final source = switch (curbSource) {
        CurbSource.ready => context.l10n.programsArrivalsCurbSourceReady,
        CurbSource.manual => context.l10n.programsArrivalsCurbSourceManual,
        CurbSource.actualLanding =>
          context.l10n.programsArrivalsCurbSourceLanded,
        CurbSource.estimatedLanding =>
          context.l10n.programsArrivalsCurbSourceEstimated,
        CurbSource.scheduledLanding =>
          context.l10n.programsArrivalsCurbSourceScheduled,
        null => '',
      };
      return '${AppTimeFormatters.time(curbAt!)} $source'.trim();
    }
    return switch (unavailableReason) {
      TimingUnavailableReason.cancelled =>
        context.l10n.programsArrivalsCancelled,
      TimingUnavailableReason.diverted => context.l10n.programsArrivalsDiverted,
      _ => context.l10n.programsArrivalsNoEstimate,
    };
  }
}

class ProgramArrivalReadinessBadge extends StatelessWidget {
  const ProgramArrivalReadinessBadge({super.key, required this.row});

  final ArrivalsRosterRow row;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = switch (row.readiness) {
      TravelLegReadiness.ready => (
        context.l10n.programsArrivalsReadyBadge,
        CatchBadgeTone.success,
      ),
      TravelLegReadiness.expected => (
        context.l10n.programsArrivalsExpectedBadge,
        CatchBadgeTone.brand,
      ),
      TravelLegReadiness.disrupted => (
        context.l10n.programsArrivalsDisruptedBadge,
        CatchBadgeTone.danger,
      ),
      TravelLegReadiness.dispatched => (
        context.l10n.programsArrivalsDispatchedBadge,
        CatchBadgeTone.success,
      ),
      TravelLegReadiness.noShow => (
        context.l10n.programsArrivalsNoShowBadge,
        CatchBadgeTone.danger,
      ),
      TravelLegReadiness.arrived => (
        context.l10n.programsArrivalsArrivedBadge,
        CatchBadgeTone.success,
      ),
    };
    return CatchBadge.functional(label: label, tone: tone);
  }
}

enum ProgramArrivalActionKind { claim, unclaim, ready, disrupted }

class ProgramArrivalActionMenu extends StatelessWidget {
  const ProgramArrivalActionMenu({
    super.key,
    required this.row,
    required this.queued,
    required this.onAction,
  });

  final ArrivalsRosterRow row;
  final bool queued;
  final Future<void> Function(
    ArrivalsRosterRow row,
    String action, {
    String? manualCurbNote,
  })
  onAction;

  @override
  Widget build(BuildContext context) {
    return CatchActionMenu<ProgramArrivalActionKind>(
      tooltip: context.l10n.programsArrivalsRowActions,
      enabled: !queued,
      items: [
        if (row.claimedByDisplay == null)
          CatchActionMenuItem(
            value: ProgramArrivalActionKind.claim,
            label: context.l10n.programsArrivalsClaimAction,
          ),
        if (row.claimedByMe)
          CatchActionMenuItem(
            value: ProgramArrivalActionKind.unclaim,
            label: context.l10n.programsArrivalsUnclaimAction,
          ),
        if (row.readiness == TravelLegReadiness.expected ||
            row.readiness == TravelLegReadiness.disrupted)
          CatchActionMenuItem(
            value: ProgramArrivalActionKind.ready,
            label: context.l10n.programsArrivalsReadyAction,
          ),
        if (row.readiness != TravelLegReadiness.disrupted &&
            row.readiness != TravelLegReadiness.arrived)
          CatchActionMenuItem(
            value: ProgramArrivalActionKind.disrupted,
            label: context.l10n.programsArrivalsDisruptedAction,
          ),
      ],
      onSelected: (action) {
        final wireAction = switch (action) {
          ProgramArrivalActionKind.claim => 'claim',
          ProgramArrivalActionKind.unclaim => 'unclaim',
          ProgramArrivalActionKind.ready => 'markReady',
          ProgramArrivalActionKind.disrupted => 'markDisrupted',
        };
        onAction(row, wireAction);
      },
    );
  }
}
