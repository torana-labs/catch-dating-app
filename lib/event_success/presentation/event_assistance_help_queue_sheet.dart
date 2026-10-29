import 'package:catch_dating_app/contexts/live/domain/event_assistance_case_scope.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_cases_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_queue_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_help_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_pending_cases.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceHelpQueueSheet extends ConsumerStatefulWidget {
  const EventAssistanceHelpQueueSheet({
    super.key,
    required this.organizerId,
    required this.eventId,
  });
  final String organizerId, eventId;
  @override
  ConsumerState<EventAssistanceHelpQueueSheet> createState() =>
      _EventAssistanceHelpQueueSheetState();
}

class _EventAssistanceHelpQueueSheetState
    extends ConsumerState<EventAssistanceHelpQueueSheet> {
  AssistanceCaseStatus _status = AssistanceCaseStatus.open;
  final _cursors = <String?>[null];
  @override
  Widget build(BuildContext context) {
    final query = EventAssistanceCaseQuery(
      organizerId: widget.organizerId,
      eventId: widget.eventId,
      status: _status,
      cursor: _cursors.last,
    );
    final provider = eventAssistanceCasesProvider(query);
    final pending = ref
        .watch(eventAssistancePendingCasesProvider)
        .where(
          (s) =>
              s.organizerId == widget.organizerId &&
              s.eventId == widget.eventId,
        );
    void review(EventAssistanceCaseScope scope) => showCatchBottomSheet<void>(
      context: context,
      builder: (_) => EventAssistanceHelpSheet(scope: scope, query: query),
    );
    return CatchSheet.standard(
      title: context.l10n.eventAssistanceHelpTitle,
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
          CatchAsyncBoundary<EventAssistanceCasesSession>(
            value: ref.watch(provider),
            initialLoadTimeout: null,
            onRetry: () => ref.read(provider.notifier).reload(),
            loadingBuilder: (_) => const CatchLoadingIndicator(),
            errorBuilder: (_, error, _, retry) =>
                CatchLocalizedErrorBanner(error, onRetry: retry),
            builder: (_, session) => EventAssistanceHelpQueueSection(
              items: session.page.cases.map(liveHelpItem).toList(),
              options: session.page.managerOptions,
              status: _status,
              onStatus: (status) {
                if (_status == status) return;
                setState(() {
                  _status = status;
                  _cursors
                    ..clear()
                    ..add(null);
                });
              },
              onReview: (id) => review(query.scopeFor(id)),
              onReload: () => ref.read(provider.notifier).reload(),
              onPrevious: _cursors.length < 2
                  ? null
                  : () {
                      if (_status != query.status ||
                          _cursors.last != query.cursor) {
                        return;
                      }
                      setState(() => _cursors.removeLast());
                    },
              onNext: session.page.nextCursor == null
                  ? null
                  : () {
                      if (_status != query.status ||
                          _cursors.last != query.cursor) {
                        return;
                      }
                      setState(() => _cursors.add(session.page.nextCursor));
                    },
            ),
          ),
        ],
      ),
    );
  }
}
