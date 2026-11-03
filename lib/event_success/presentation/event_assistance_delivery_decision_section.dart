import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/event_success/presentation/event_assistance_delivery_copy.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_banner.dart';
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
        CatchLegacyText(
          item.displayName ?? l10n.eventAssistanceDeliveryUnknownGuest,
          variant: CatchLegacyTextVariant.titleL,
        ),
        gapH8,
        CatchLegacyText(
          deliveryPurposeLabel(l10n, item.purpose),
          variant: CatchLegacyTextVariant.supporting,
        ),
        CatchLegacyText(
          deliveryTimeLabel(context, item.createdAt),
          variant: CatchLegacyTextVariant.supporting,
        ),
        if (item.lifecycle != AssistanceMessageLifecycle.active)
          CatchLegacyText(switch (item.lifecycle) {
            AssistanceMessageLifecycle.cancelled =>
              l10n.eventAssistanceDeliveryStopReasonCancelled,
            AssistanceMessageLifecycle.superseded =>
              l10n.eventAssistanceDeliveryStopReasonSuperseded,
            AssistanceMessageLifecycle.responded =>
              l10n.eventAssistanceDeliveryStopReasonResponded,
            AssistanceMessageLifecycle.active => '',
          }, variant: CatchLegacyTextVariant.supporting),
        if (contextMessage != null) ...[
          gapH8,
          CatchLegacyText(
            contextMessage!,
            variant: CatchLegacyTextVariant.supporting,
          ),
        ],
        if (item.attendeeId == null) ...[
          gapH12,
          CatchLegacyText(
            l10n.eventAssistanceDeliverySourceChanged,
            variant: CatchLegacyTextVariant.supporting,
          ),
        ],
        CatchSection.divided(
          title: l10n.eventAssistanceDeliveryEvidence,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CatchLegacyText(
                deliveryStatusLabel(l10n, item.status),
                variant: CatchLegacyTextVariant.supporting,
              ),
              if (item.status == AssistanceDeliveryStatus.accepted)
                CatchLegacyText(
                  l10n.eventAssistanceDeliveryAcceptedBody,
                  variant: CatchLegacyTextVariant.supporting,
                ),
              if (item.status == AssistanceDeliveryStatus.unknown ||
                  item.status == AssistanceDeliveryStatus.conflictingEvidence)
                CatchLegacyText(
                  l10n.eventAssistanceDeliveryUnknownBody,
                  variant: CatchLegacyTextVariant.supporting,
                ),
              if (item.status == AssistanceDeliveryStatus.revoked)
                CatchLegacyText(
                  l10n.eventAssistanceDeliveryRevokedBody,
                  variant: CatchLegacyTextVariant.supporting,
                ),
            ],
          ),
        ),
        CatchSection.divided(
          title: l10n.eventAssistanceDeliveryCoordination,
          child: CatchLegacyText(
            item.handling is AssistanceManualDeliveryHandling
                ? l10n.eventAssistanceDeliveryManualStopped
                : practice && item.coordination is AssistanceDeliveryUntracked
                ? l10n.eventAssistanceDeliveryPracticeSending
                : deliveryCoordinationLabel(l10n, item.coordination),
            variant: CatchLegacyTextVariant.supporting,
          ),
        ),
        CatchSection.divided(
          title: l10n.eventAssistanceDeliveryHandling,
          child: CatchLegacyText(
            deliveryHandlingLabel(l10n, item.handling, actorUid),
            variant: CatchLegacyTextVariant.supporting,
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
                      icon: CatchIcons.chat,
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
          CatchLegacyText(
            l10n.eventAssistanceDeliveryTakeOverBody,
            variant: CatchLegacyTextVariant.supporting,
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
          CatchLegacyText(
            l10n.eventAssistanceDeliveryRetryBody,
            variant: CatchLegacyTextVariant.supporting,
          ),
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceDeliveryRetry,
            onPressed: onRetry,
          ),
        ],
        if (phase == EventAssistanceDeliveryPhase.refreshRequired) ...[
          CatchLegacyText(
            l10n.eventAssistanceDeliveryRefresh,
            variant: CatchLegacyTextVariant.supporting,
          ),
          gapH12,
          CatchButton(
            label: l10n.eventAssistanceDeliveryReload,
            onPressed: onReload,
          ),
        ],
        if (phase == EventAssistanceDeliveryPhase.saved) ...[
          CatchLegacyText(
            l10n.eventAssistanceDeliverySaved,
            variant: CatchLegacyTextVariant.supporting,
          ),
          gapH8,
          CatchLegacyText(
            l10n.eventAssistanceDeliverySavedBody,
            variant: CatchLegacyTextVariant.supporting,
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
