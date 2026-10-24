import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum EventAssistanceDeliveryPhase {
  ready,
  submitting,
  retryRequired,
  refreshRequired,
  saved,
  readOnly,
}

/// Evidence, scheduled work and manual ownership remain independent facts.
class EventAssistanceDeliveryDecisionSection extends StatelessWidget {
  const EventAssistanceDeliveryDecisionSection({
    super.key,
    required this.item,
    required this.actorUid,
    required this.phase,
    required this.onRetry,
    required this.onReload,
    required this.onDone,
    this.onTakeOver,
    this.error,
    this.contextMessage,
    this.practice = false,
  });
  final AssistanceDeliveryEvidence item;
  final String actorUid;
  final EventAssistanceDeliveryPhase phase;
  final VoidCallback? onTakeOver;
  final VoidCallback onRetry, onReload, onDone;
  final Object? error;
  final String? contextMessage;
  final bool practice;
  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final busy = phase == EventAssistanceDeliveryPhase.submitting;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          item.displayName ?? l10n.eventAssistanceDeliveryUnknownGuest,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        gapH8,
        CatchText(
          deliveryPurposeLabel(l10n, item.purpose),
          variant: CatchTextVariant.supporting,
        ),
        CatchText(
          deliveryTimeLabel(context, item.createdAt),
          variant: CatchTextVariant.supporting,
        ),
        if (item.lifecycle != AssistanceMessageLifecycle.active)
          CatchText(switch (item.lifecycle) {
            AssistanceMessageLifecycle.cancelled =>
              l10n.eventAssistanceDeliveryStopReasonCancelled,
            AssistanceMessageLifecycle.superseded =>
              l10n.eventAssistanceDeliveryStopReasonSuperseded,
            AssistanceMessageLifecycle.responded =>
              l10n.eventAssistanceDeliveryStopReasonResponded,
            AssistanceMessageLifecycle.active => '',
          }, variant: CatchTextVariant.supporting),
        if (contextMessage != null) ...[
          gapH8,
          CatchText(contextMessage!, variant: CatchTextVariant.supporting),
        ],
        if (item.attendeeId == null) ...[
          gapH12,
          CatchText(
            l10n.eventAssistanceDeliverySourceChanged,
            variant: CatchTextVariant.supporting,
          ),
        ],
        CatchSection.divided(
          title: l10n.eventAssistanceDeliveryEvidence,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CatchText(
                deliveryStatusLabel(l10n, item.status),
                variant: CatchTextVariant.supporting,
              ),
              if (item.status == AssistanceDeliveryStatus.accepted)
                CatchText(
                  l10n.eventAssistanceDeliveryAcceptedBody,
                  variant: CatchTextVariant.supporting,
                ),
              if (item.status == AssistanceDeliveryStatus.unknown ||
                  item.status == AssistanceDeliveryStatus.conflictingEvidence)
                CatchText(
                  l10n.eventAssistanceDeliveryUnknownBody,
                  variant: CatchTextVariant.supporting,
                ),
              if (item.status == AssistanceDeliveryStatus.revoked)
                CatchText(
                  l10n.eventAssistanceDeliveryRevokedBody,
                  variant: CatchTextVariant.supporting,
                ),
            ],
          ),
        ),
        CatchSection.divided(
          title: l10n.eventAssistanceDeliveryCoordination,
          child: CatchText(
            item.handling is AssistanceManualDeliveryHandling
                ? l10n.eventAssistanceDeliveryManualStopped
                : practice && item.coordination is AssistanceDeliveryUntracked
                ? l10n.eventAssistanceDeliveryPracticeSending
                : deliveryCoordinationLabel(l10n, item.coordination),
            variant: CatchTextVariant.supporting,
          ),
        ),
        CatchSection.divided(
          title: l10n.eventAssistanceDeliveryHandling,
          child: CatchText(
            deliveryHandlingLabel(l10n, item.handling, actorUid),
            variant: CatchTextVariant.supporting,
          ),
        ),
        if (item.attempts.isNotEmpty)
          CatchSection.divided(
            title: l10n.eventAssistanceDeliveryAttempts,
            child: CatchSection.containedRows(
              children: [
                for (var i = 0; i < item.attempts.length; i++)
                  CatchField.read(
                    key: ValueKey('delivery.attempt.$i'),
                    content: CatchRecordLayout(
                      icon: CatchIcons.chatCircle,
                      title: switch (item.attempts[i].channel) {
                        AssistanceDeliveryChannel.sms =>
                          l10n.eventAssistanceRuntimeSms,
                        AssistanceDeliveryChannel.whatsapp =>
                          l10n.eventAssistanceRuntimeWhatsapp,
                        AssistanceDeliveryChannel.rcs =>
                          l10n.eventAssistanceRuntimeRcs,
                      },
                      metadata: deliveryTimeLabel(context, item.attempts[i].at),
                      facts: [
                        deliveryAttemptLabel(l10n, item.attempts[i].state),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        if (error != null) ...[gapH12, CatchLocalizedErrorBanner(error!)],
        gapH12,
        if (phase == EventAssistanceDeliveryPhase.ready &&
            item.offersManualHandoff) ...[
          CatchText(
            l10n.eventAssistanceDeliveryTakeOverBody,
            variant: CatchTextVariant.supporting,
          ),
          gapH12,
          CatchButton(
            key: const ValueKey('delivery.takeOver'),
            label: l10n.eventAssistanceDeliveryTakeOver,
            onPressed: onTakeOver,
          ),
        ],
        if (busy)
          CatchButton(
            label: l10n.eventAssistanceDeliveryTakeOver,
            status: CatchButtonStatus.loading,
            onPressed: null,
          ),
        if (phase == EventAssistanceDeliveryPhase.retryRequired) ...[
          CatchText(
            l10n.eventAssistanceDeliveryRetryBody,
            variant: CatchTextVariant.supporting,
          ),
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceDeliveryRetry,
            onPressed: onRetry,
          ),
        ],
        if (phase == EventAssistanceDeliveryPhase.refreshRequired) ...[
          CatchText(
            l10n.eventAssistanceDeliveryRefresh,
            variant: CatchTextVariant.supporting,
          ),
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceDeliveryReload,
            onPressed: onReload,
          ),
        ],
        if (phase == EventAssistanceDeliveryPhase.saved) ...[
          CatchText(
            l10n.eventAssistanceDeliverySaved,
            variant: CatchTextVariant.supporting,
          ),
          gapH8,
          CatchText(
            l10n.eventAssistanceDeliverySavedBody,
            variant: CatchTextVariant.supporting,
          ),
        ],
        gapH12,
        CatchButton(
          label: l10n.eventAssistanceDeliveryDone,
          variant: CatchButtonVariant.secondary,
          onPressed: busy ? null : onDone,
        ),
      ],
    );
  }
}
