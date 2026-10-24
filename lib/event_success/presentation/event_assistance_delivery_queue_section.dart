import 'package:catch_dating_app/event_success/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// A bounded list of message evidence, shared by live and practice adapters.
class EventAssistanceDeliveryQueueSection extends StatelessWidget {
  const EventAssistanceDeliveryQueueSection({
    super.key,
    required this.items,
    required this.actorUid,
    required this.onReview,
    required this.onReload,
    this.onPrevious,
    this.onNext,
    this.practice = false,
  });
  final List<AssistanceDeliveryEvidence> items;
  final String actorUid;
  final ValueChanged<String> onReview;
  final VoidCallback onReload;
  final VoidCallback? onPrevious, onNext;
  final bool practice;
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(
          l10n.eventAssistanceDeliveryBody,
          variant: CatchTextVariant.supporting,
        ),
        gapH12,
        if (items.isEmpty)
          CatchText(
            l10n.eventAssistanceDeliveryEmpty,
            variant: CatchTextVariant.supporting,
          ),
        if (items.isNotEmpty)
          CatchSection.containedRows(
            children: [
              for (final row in items)
                CatchField.navigate(
                  key: ValueKey('delivery.message.${row.messageId}'),
                  content: CatchRecordLayout(
                    icon: CatchIcons.chatCircle,
                    title:
                        row.displayName ??
                        l10n.eventAssistanceDeliveryUnknownGuest,
                    metadata: deliveryTimeLabel(context, row.createdAt),
                    facts: [
                      deliveryPurposeLabel(l10n, row.purpose),
                      deliveryStatusLabel(l10n, row.status),
                      deliveryHandlingLabel(l10n, row.handling, actorUid),
                    ],
                  ),
                  onActivate: () => onReview(row.messageId),
                ),
            ],
          ),
        gapH12,
        CatchText(
          practice
              ? l10n.eventAssistanceDeliveryPracticeBody
              : l10n.eventAssistanceDeliveryPageBody,
          variant: CatchTextVariant.supporting,
        ),
        gapH8,
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s2,
          children: [
            if (onPrevious != null)
              CatchButton(
                label: l10n.eventAssistanceDeliveryPrevious,
                variant: CatchButtonVariant.secondary,
                onPressed: onPrevious,
              ),
            if (onNext != null)
              CatchButton(
                label: l10n.eventAssistanceDeliveryNext,
                variant: CatchButtonVariant.secondary,
                onPressed: onNext,
              ),
            CatchButton(
              label: l10n.eventAssistanceDeliveryReload,
              variant: CatchButtonVariant.ghost,
              onPressed: onReload,
            ),
          ],
        ),
      ],
    );
  }
}
