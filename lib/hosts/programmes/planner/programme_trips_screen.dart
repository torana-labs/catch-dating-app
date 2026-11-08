import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_reports_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_trips_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_trip_sheet.dart';
import 'package:catch_dating_app/programs/presentation/program_trip_actions_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Car trips (RbProgTrips): every trip with its vendor, plate, route and
/// state.
///
/// Export for the vendors shares the ledger CSV through the kept trip
/// action controller; a trip opens a sheet that runs
/// `markProgramTripArrived` or `voidProgramTrip`, each fenced by the trip
/// revision with its own operation id.
class HostProgrammeTripsScreen extends ConsumerStatefulWidget {
  const HostProgrammeTripsScreen({super.key, required this.programId});

  final String programId;

  @override
  ConsumerState<HostProgrammeTripsScreen> createState() =>
      _HostProgrammeTripsScreenState();
}

class _HostProgrammeTripsScreenState
    extends ConsumerState<HostProgrammeTripsScreen> {
  HostProgrammeTripFilter _filter = const HostProgrammeTripFilter.all();
  bool _exporting = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(
      hostProgrammeTripsControllerProvider(widget.programId),
    );
    final program = state.programme.program;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-trips-screen'),
        bodyScrolls: false,
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
          kicker: program?.title,
          title: l10n.hostProgrammeTravelTrips,
        ),
        body: HostProgrammeTripsBody(
          state: state,
          now: ref.watch(appClockProvider).now(),
          filter: _filter,
          exporting: _exporting,
          onFilter: (filter) => setState(() => _filter = filter),
          onExport: () => unawaited(_export(program?.title)),
          onOpenTrip: (trip) => unawaited(_openTrip(trip)),
          onRetry: () => refreshHostProgrammeTrips(ref, widget.programId),
        ),
      ),
    );
  }

  String _operationId() =>
      'trip_${DateTime.now().microsecondsSinceEpoch}_${Random.secure().nextInt(1 << 32)}';

  Future<void> _openTrip(ProgramTripSummary trip) async {
    final decision = await showCatchBottomSheet<HostProgrammeTripDecision>(
      context: context,
      builder: (_) => HostProgrammeTripSheet(trip: trip),
    );
    if (decision == null || !mounted) return;
    final actions = ref.read(programTripActionsProvider.notifier);
    final reason = decision.voidReason;
    try {
      if (reason == null) {
        await actions.markArrived(
          programId: widget.programId,
          tripId: trip.tripId,
          expectedRevision: trip.revision,
          clientOperationId: _operationId(),
        );
      } else {
        await actions.voidTrip(
          programId: widget.programId,
          tripId: trip.tripId,
          expectedRevision: trip.revision,
          reason: reason,
          clientOperationId: _operationId(),
        );
      }
    } on Object catch (error, stackTrace) {
      ref
          .read(errorLoggerProvider)
          .logError(error, stackTrace, reason: 'change a programme trip');
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.event,
        );
      }
      return;
    }
    if (mounted) refreshHostProgrammeTrips(ref, widget.programId);
  }

  Future<void> _export(String? title) async {
    final l10n = context.l10n;
    setState(() => _exporting = true);
    try {
      await ref
          .read(programTripActionsProvider.notifier)
          .exportLedger(
            programId: widget.programId,
            programTitle: title ?? widget.programId,
            subject: l10n.hostProgrammeTripsExportSubject(
              programme: title ?? '',
            ),
          );
    } on Object catch (error, stackTrace) {
      ref
          .read(errorLoggerProvider)
          .logError(error, stackTrace, reason: 'export programme trips');
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.event,
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }
}
