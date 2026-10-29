import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_movement_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_checkpoint_sheet.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceDepartureHistorySection;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventRehearsalDepartureHistorySheet extends ConsumerStatefulWidget {
  const EventRehearsalDepartureHistorySheet({
    super.key,
    required this.selection,
  });
  final RehearsalMovementSelection selection;
  @override
  ConsumerState<EventRehearsalDepartureHistorySheet> createState() =>
      _EventRehearsalDepartureHistorySheetState();
}

class _EventRehearsalDepartureHistorySheetState
    extends ConsumerState<EventRehearsalDepartureHistorySheet> {
  AuthenticatedSession? _account;
  final _cursors = <int>[];
  @override
  Widget build(BuildContext context) {
    final account = catchAsyncStateFromAsyncValue(
      ref.watch(authenticatedSessionProvider),
    ).value;
    if (!identical(account, _account)) {
      _account = account;
      _cursors.clear();
    }
    final selection = RehearsalMovementSelection(
      scope: widget.selection.scope,
      beforeRevision: _cursors.lastOrNull,
      practiceOperatorId: widget.selection.practiceOperatorId,
    );
    final query = eventRehearsalMovementProvider(selection);
    return CatchSheet.standard(
      title: context.l10n.eventAssistanceHistoryTitle,
      badge: context.l10n.hostEventRehearsalBadge,
      badgeTone: CatchBadgeTone.danger,
      child: CatchAsyncBoundary<RehearsalMovementPage>(
        value: ref.watch(query),
        initialLoadTimeout: null,
        onRetry: () => ref.read(query.notifier).reload(),
        loadingBuilder: (_) => const CatchLoadingIndicator(),
        errorBuilder: (_, error, _, retry) =>
            CatchLocalizedErrorBanner(error, onRetry: retry),
        builder: (_, review) {
          final page = review.snapshot;
          return EventAssistanceDepartureHistorySection(
            items: [
              for (final r in page.history)
                if (r.rosterSize != null)
                  (
                    revision: r.revision,
                    confirmedAt: r.confirmedAt,
                    title: page.destinations
                        .where((d) => d.target == r.destination)
                        .firstOrNull
                        ?.label,
                    rosterSize: r.rosterSize!,
                    reportRevision: r.reportRevision,
                    accountedForCount: r.accountedForCount,
                    hasCheckpoint: r.destination is! AssistanceFixedPlace,
                  ),
            ],
            contextMessage: page.groups
                .firstWhere((g) => g.groupId == page.scope.groupId)
                .label,
            onEarlier: page.nextBeforeRevision == null
                ? null
                : () => setState(() => _cursors.add(page.nextBeforeRevision!)),
            onNewer: _cursors.isEmpty
                ? null
                : () => setState(() => _cursors.removeLast()),
            onReload: () => ref.read(query.notifier).reload(),
            onCheckpoint: (revision) async {
              final target = RehearsalMovementSelection(
                scope: page.scope,
                progressRevision: revision,
                practiceOperatorId: selection.practiceOperatorId,
              );
              final detail = eventRehearsalMovementProvider(target);
              if (ref.exists(detail)) ref.read(detail.notifier).reload();
              await showCatchBottomSheet<void>(
                context: context,
                builder: (_) =>
                    EventRehearsalCheckpointSheet(selection: target),
              );
              if (mounted) ref.read(query.notifier).reload();
            },
          );
        },
      ),
    );
  }
}
