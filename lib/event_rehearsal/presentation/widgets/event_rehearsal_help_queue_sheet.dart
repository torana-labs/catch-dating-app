import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_help_requests.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_pending_help.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_help_sheet.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceHelpQueueSection, EventAssistanceHelpItem;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

EventAssistanceHelpItem practiceHelpItem(RehearsalHelpCase row) => (
  id: row.caseId,
  displayName: row.displayName,
  category: row.category,
  receivedAt: row.receivedAt,
  assignment: row.assignment,
  resolution: row is RehearsalClosedHelpCase ? row.resolution.outcome : null,
  sourceChanged: false,
);

class EventRehearsalHelpQueueSheet extends ConsumerStatefulWidget {
  const EventRehearsalHelpQueueSheet({
    super.key,
    required this.sessionId,
    this.practiceOperatorId,
  });
  final String sessionId;
  final String? practiceOperatorId;
  @override
  ConsumerState<EventRehearsalHelpQueueSheet> createState() =>
      _EventRehearsalHelpQueueSheetState();
}

class _EventRehearsalHelpQueueSheetState
    extends ConsumerState<EventRehearsalHelpQueueSheet> {
  AssistanceCaseStatus _status = AssistanceCaseStatus.open;
  int _page = 0;
  @override
  Widget build(BuildContext context) {
    final provider = eventRehearsalAssistanceProvider(
      widget.sessionId,
      practiceOperatorId: widget.practiceOperatorId,
    );
    final pending = ref
        .watch(eventRehearsalPendingHelpProvider)
        .where((s) => s.sessionId == widget.sessionId);
    void review(RehearsalHelpScope scope) => showCatchBottomSheet<void>(
      context: context,
      builder: (_) => EventRehearsalHelpSheet(
        scope: scope,
        practiceOperatorId: widget.practiceOperatorId,
      ),
    );
    return CatchSheet.standard(
      title: context.l10n.eventAssistanceHelpTitle,
      badge: context.l10n.hostEventRehearsalBadge,
      badgeTone: CatchBadgeTone.danger,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (pending.isNotEmpty)
            CatchSection.containedRows(
              children: [
                for (final scope in pending)
                  CatchField.navigate(
                    key: ValueKey('help.pending.${scope.caseId}'),
                    content: CatchRecordLayout(
                      icon: CatchIcons.refresh,
                      title: context.l10n.eventAssistanceHelpPending,
                      metadata: context.l10n.eventAssistanceHelpPendingBody,
                    ),
                    onActivate: () => review(scope),
                  ),
              ],
            ),
          CatchAsyncBoundary<RehearsalAssistanceReview>(
            value: ref.watch(provider),
            initialLoadTimeout: null,
            onRetry: () => ref.read(provider.notifier).reload(),
            loadingBuilder: (_) => const CatchLoadingIndicator(),
            errorBuilder: (_, error, _, retry) =>
                CatchLocalizedErrorBanner(error, onRetry: retry),
            builder: (_, session) {
              final queue = session.snapshot.helpRequests;
              if (queue == null) {
                return CatchText(
                  context.l10n.eventAssistanceHelpMissing,
                  variant: CatchTextVariant.supporting,
                );
              }
              final rows =
                  queue.cases
                      .where(
                        (r) => _status == AssistanceCaseStatus.open
                            ? r is RehearsalOpenHelpCase
                            : r is RehearsalClosedHelpCase,
                      )
                      .toList()
                    ..sort((a, b) => a.caseId.compareTo(b.caseId));
              final page = _page.clamp(
                0,
                rows.isEmpty ? 0 : (rows.length - 1) ~/ 50,
              );
              final visible = rows.skip(page * 50).take(50).toList();
              return EventAssistanceHelpQueueSection(
                items: visible.map(practiceHelpItem).toList(),
                options: queue.managerOptions,
                status: _status,
                contextMessage: queue.untrackedActorIds.isEmpty
                    ? null
                    : context.l10n.eventAssistanceHelpPracticeUnknown,
                onStatus: (status) => setState(() {
                  _status = status;
                  _page = 0;
                }),
                onReview: (id) => review(
                  rehearsalHelpScope(
                    session.snapshot,
                    visible.singleWhere((r) => r.caseId == id),
                  ),
                ),
                onReload: () => ref.read(provider.notifier).reload(),
                onPrevious: page == 0
                    ? null
                    : () => setState(() => _page = page - 1),
                onNext: rows.length <= (page + 1) * 50
                    ? null
                    : () => setState(() => _page = page + 1),
              );
            },
          ),
        ],
      ),
    );
  }
}
