import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_departure_history.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_checkpoint_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_history_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_departure_history_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceDepartureHistorySheet extends ConsumerStatefulWidget {
  const EventAssistanceDepartureHistorySheet({
    super.key,
    required this.scope,
    required this.groupLabel,
  });
  final EventAssistanceGroupScope scope;
  final String groupLabel;
  @override
  ConsumerState<EventAssistanceDepartureHistorySheet> createState() =>
      _EventAssistanceDepartureHistorySheetState();
}

class _EventAssistanceDepartureHistorySheetState
    extends ConsumerState<EventAssistanceDepartureHistorySheet> {
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
    final selection = EventAssistanceDepartureHistoryQuery(
      widget.scope,
      beforeRevision: _cursors.lastOrNull,
    );
    final query = eventAssistanceDepartureHistoryProvider(selection);
    return CatchSheet.standard(
      title: context.l10n.eventAssistanceHistoryTitle,
      child: CatchAsyncBoundary<EventAssistanceDepartureHistorySession>(
        value: ref.watch(query),
        initialLoadTimeout: null,
        onRetry: () => ref.read(query.notifier).reload(),
        loadingBuilder: (_) => const CatchLoadingIndicator(),
        errorBuilder: (_, error, _, retry) =>
            CatchLocalizedErrorBanner(error, onRetry: retry),
        builder: (_, review) {
          final page = review.page;
          return EventAssistanceDepartureHistorySection(
            items: [
              for (final r in page.rosters)
                (
                  revision: r.progressRevision,
                  confirmedAt: r.confirmedAt,
                  title: r.label,
                  rosterSize: r.rosterSize,
                  reportRevision: r.checkpoint?.reportRevision ?? 0,
                  accountedForCount: r.checkpoint?.accountedForCount ?? 0,
                  hasCheckpoint: r.checkpoint != null,
                ),
            ],
            contextMessage: widget.groupLabel,
            onEarlier: page.nextBeforeRevision == null
                ? null
                : () => setState(() => _cursors.add(page.nextBeforeRevision!)),
            onNewer: _cursors.isEmpty
                ? null
                : () => setState(() => _cursors.removeLast()),
            onReload: () => ref.read(query.notifier).reload(),
            onCheckpoint: (revision) async {
              final scope = page.rosters
                  .singleWhere((r) => r.progressRevision == revision)
                  .checkpoint!
                  .scope;
              final detail = eventAssistanceCheckpointProvider(scope);
              if (ref.exists(detail)) ref.read(detail.notifier).reload();
              await showCatchBottomSheet<void>(
                context: context,
                builder: (_) => EventAssistanceCheckpointSheet(
                  scope: scope,
                  groupLabel: widget.groupLabel,
                ),
              );
              if (mounted) ref.read(query.notifier).reload();
            },
          );
        },
      ),
    );
  }
}
