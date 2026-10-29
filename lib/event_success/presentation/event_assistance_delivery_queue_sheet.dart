import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_deliveries_provider.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_queue_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_pending_deliveries.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventAssistanceDeliveryQueueSheet extends ConsumerStatefulWidget {
  const EventAssistanceDeliveryQueueSheet({
    super.key,
    required this.organizerId,
    required this.eventId,
  });
  final String organizerId, eventId;
  @override
  ConsumerState<EventAssistanceDeliveryQueueSheet> createState() =>
      _EventAssistanceDeliveryQueueSheetState();
}

class _EventAssistanceDeliveryQueueSheetState
    extends ConsumerState<EventAssistanceDeliveryQueueSheet> {
  final _cursors = <String?>[null];
  @override
  Widget build(BuildContext context) {
    final query = EventAssistanceDeliveryQuery(
      organizerId: widget.organizerId,
      eventId: widget.eventId,
      cursor: _cursors.last,
    );
    final provider = eventAssistanceDeliveriesProvider(query);
    final pending = ref
        .watch(eventAssistancePendingDeliveriesProvider)
        .where(
          (s) =>
              s.organizerId == widget.organizerId &&
              s.eventId == widget.eventId,
        );
    void review(EventAssistanceDeliveryScope scope) =>
        showCatchBottomSheet<void>(
          context: context,
          builder: (_) =>
              EventAssistanceDeliverySheet(scope: scope, query: query),
        );
    return CatchSheet.standard(
      title: context.l10n.eventAssistanceDeliveryTitle,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (pending.isNotEmpty)
            CatchSection.containedRows(
              children: [
                for (final scope in pending)
                  CatchField.navigate(
                    key: ValueKey('delivery.pending.${scope.messageId}'),
                    content: CatchRecordLayout(
                      icon: CatchIcons.refresh,
                      title: context.l10n.eventAssistanceDeliveryPending,
                      metadata: context.l10n.eventAssistanceDeliveryPendingBody,
                    ),
                    onActivate: () => review(scope),
                  ),
              ],
            ),
          CatchAsyncBoundary<EventAssistanceDeliveriesSession>(
            value: ref.watch(provider),
            initialLoadTimeout: null,
            onRetry: () => ref.read(provider.notifier).reload(),
            loadingBuilder: (_) => const CatchLoadingIndicator(),
            errorBuilder: (_, error, _, retry) =>
                CatchLocalizedErrorBanner(error, onRetry: retry),
            builder: (_, session) => EventAssistanceDeliveryQueueSection(
              items: session.page.deliveries
                  .map((row) => row.evidence)
                  .toList(),
              actorUid: session.account.uid,
              onReview: (id) => review(query.scopeFor(id)),
              onReload: () => ref.read(provider.notifier).reload(),
              onPrevious: _cursors.length < 2
                  ? null
                  : () {
                      if (_cursors.last != query.cursor) {
                        return;
                      }
                      setState(() => _cursors.removeLast());
                    },
              onNext: session.page.nextCursor == null
                  ? null
                  : () {
                      if (_cursors.last != query.cursor) {
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
