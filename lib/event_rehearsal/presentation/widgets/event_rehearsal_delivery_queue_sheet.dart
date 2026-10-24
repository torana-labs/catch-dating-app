import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal_delivery_reviews.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_pending_deliveries.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_delivery_sheet.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show EventAssistanceDeliveryQueueSection;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventRehearsalDeliveryQueueSheet extends ConsumerStatefulWidget {
  const EventRehearsalDeliveryQueueSheet({
    super.key,
    required this.sessionId,
    this.practiceOperatorId,
  });
  final String sessionId;
  final String? practiceOperatorId;
  @override
  ConsumerState<EventRehearsalDeliveryQueueSheet> createState() =>
      _EventRehearsalDeliveryQueueSheetState();
}

class _EventRehearsalDeliveryQueueSheetState
    extends ConsumerState<EventRehearsalDeliveryQueueSheet> {
  @override
  Widget build(BuildContext context) {
    final provider = eventRehearsalAssistanceProvider(
      widget.sessionId,
      practiceOperatorId: widget.practiceOperatorId,
    );
    final pending = ref
        .watch(eventRehearsalPendingDeliveriesProvider)
        .where((s) => s.sessionId == widget.sessionId);
    void review(RehearsalDeliveryScope scope) => showCatchBottomSheet<void>(
      context: context,
      builder: (_) => EventRehearsalDeliverySheet(
        scope: scope,
        practiceOperatorId: widget.practiceOperatorId,
      ),
    );
    return CatchSheet.standard(
      title: context.l10n.eventAssistanceDeliveryTitle,
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
          CatchAsyncBoundary<RehearsalAssistanceReview>(
            value: ref.watch(provider),
            initialLoadTimeout: null,
            onRetry: () => ref.read(provider.notifier).reload(),
            loadingBuilder: (_) => const CatchLoadingIndicator(),
            errorBuilder: (_, error, _, retry) =>
                CatchLocalizedErrorBanner(error, onRetry: retry),
            builder: (_, session) {
              final queue = session.snapshot.deliveryReviews;
              if (queue == null) {
                return CatchText(
                  context.l10n.eventAssistanceDeliveryMissing,
                  variant: CatchTextVariant.supporting,
                );
              }
              return EventAssistanceDeliveryQueueSection(
                items: queue.deliveries.map((r) => r.evidence).toList(),
                actorUid: session.account.uid,
                practice: true,
                onReview: (id) => review(
                  queue.deliveries
                      .singleWhere((r) => r.scope.messageId == id)
                      .scope,
                ),
                onReload: () => ref.read(provider.notifier).reload(),
              );
            },
          ),
        ],
      ),
    );
  }
}
