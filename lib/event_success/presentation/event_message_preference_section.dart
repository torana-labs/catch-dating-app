import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum EventMessageChannel { sms, whatsapp, rcs }

enum EventMessagePermission { notSet, enabled, disabled, expired }

enum EventMessageAvailability {
  ready,
  verifyPhone,
  notAdmitted,
  eventClosed,
  senderUnavailable,
  subscriptionUnavailable,
}

enum EventMessageSavePhase { ready, saving, uncertain, refreshRequired }

enum EventMessageSaveNotice { none, saved, changed }

String eventMessageChannelLabel(
  BuildContext context,
  EventMessageChannel channel,
) => switch (channel) {
  EventMessageChannel.sms => context.l10n.eventMessagesSms,
  EventMessageChannel.whatsapp => context.l10n.eventMessagesWhatsapp,
  EventMessageChannel.rcs => context.l10n.eventMessagesRcs,
};

/// Read-only presentation facts. Only the channel's retained controller owns
/// a reviewed permission and can supply the corresponding action callbacks.
class EventMessagePreferenceSection extends StatelessWidget {
  const EventMessagePreferenceSection({
    super.key,
    required this.channel,
    required this.permission,
    required this.availability,
    required this.phase,
    required this.notice,
    required this.consentText,
    this.senderName,
    this.senderPhone,
    this.phoneLastFour,
    this.expiresAt,
    this.earlierSender = false,
    this.error,
    this.navigation,
    this.onEnable,
    this.onDisable,
    this.onRetry,
    this.onRefresh,
  });
  final EventMessageChannel channel;
  final EventMessagePermission permission;
  final EventMessageAvailability availability;
  final EventMessageSavePhase phase;
  final EventMessageSaveNotice notice;
  final String consentText;
  final String? senderName, senderPhone, phoneLastFour;
  final int? expiresAt;
  final bool earlierSender;
  final Object? error;
  final Widget? navigation;
  final VoidCallback? onEnable, onDisable, onRetry, onRefresh;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final channelName = eventMessageChannelLabel(context, channel);
    final expiry = expiresAt == null
        ? null
        : DateTime.fromMillisecondsSinceEpoch(expiresAt!);
    final material = MaterialLocalizations.of(context);
    return CatchSection.plain(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (senderName != null)
            CatchText(senderName!, variant: CatchTextVariant.sectionTitle),
          if (senderPhone != null)
            CatchText(senderPhone!, variant: CatchTextVariant.supporting),
          if (earlierSender) ...[
            gapH8,
            CatchText(
              l.eventMessagesEarlierSender,
              variant: CatchTextVariant.supporting,
            ),
          ],
          gapH8,
          CatchText(switch (permission) {
            EventMessagePermission.notSet => l.eventMessagesNotSet,
            EventMessagePermission.enabled => l.eventMessagesEnabled,
            EventMessagePermission.disabled => l.eventMessagesDisabled,
            EventMessagePermission.expired => l.eventMessagesExpired,
          }, variant: CatchTextVariant.supporting),
          if (phoneLastFour != null)
            CatchText(
              l.eventMessagesPhoneEnding(digits: phoneLastFour!),
              variant: CatchTextVariant.supporting,
            ),
          if (expiry != null)
            CatchText(
              l.eventMessagesUntil(
                date: material.formatFullDate(expiry),
                time: material.formatTimeOfDay(TimeOfDay.fromDateTime(expiry)),
              ),
              variant: CatchTextVariant.supporting,
            ),
          if (availability != EventMessageAvailability.ready) ...[
            gapH8,
            CatchText(switch (availability) {
              EventMessageAvailability.ready => '',
              EventMessageAvailability.verifyPhone =>
                l.eventMessagesVerifyPhone,
              EventMessageAvailability.notAdmitted =>
                l.eventMessagesNotAdmitted,
              EventMessageAvailability.eventClosed =>
                l.eventMessagesEventClosed,
              EventMessageAvailability.senderUnavailable =>
                l.eventMessagesSenderUnavailable,
              EventMessageAvailability.subscriptionUnavailable =>
                l.eventMessagesSubscriptionUnavailable,
            }, variant: CatchTextVariant.supporting),
          ],
          gapH12,
          // Server-authored consent is deliberately complete, never a preview
          // or locally reconstructed promise about delivery or privacy.
          CatchText(consentText, variant: CatchTextVariant.supporting),
          if (phase != EventMessageSavePhase.ready) ...[
            gapH12,
            Semantics(
              liveRegion: true,
              child: CatchText(switch (phase) {
                EventMessageSavePhase.ready => '',
                EventMessageSavePhase.saving => l.eventMessagesSaving,
                EventMessageSavePhase.uncertain => l.eventMessagesUncertain,
                EventMessageSavePhase.refreshRequired =>
                  l.eventMessagesReviewChanged,
              }, variant: CatchTextVariant.supporting),
            ),
          ],
          if (notice != EventMessageSaveNotice.none) ...[
            gapH8,
            Semantics(
              liveRegion: true,
              child: CatchText(switch (notice) {
                EventMessageSaveNotice.none => '',
                EventMessageSaveNotice.saved => l.eventMessagesSaved,
                EventMessageSaveNotice.changed => l.eventMessagesChanged,
              }, variant: CatchTextVariant.supporting),
            ),
          ],
          if (error != null) ...[gapH8, CatchLocalizedErrorBanner(error!)],
          if (onEnable != null) ...[
            gapH12,
            CatchButton(
              key: ValueKey('messages.${channel.name}.enable'),
              label: l.eventMessagesAllow(channel: channelName),
              onPressed: onEnable,
              fullWidth: true,
            ),
          ],
          if (onDisable != null) ...[
            gapH12,
            CatchButton(
              key: ValueKey('messages.${channel.name}.disable'),
              label: l.eventMessagesTurnOff(channel: channelName),
              variant: CatchButtonVariant.secondary,
              onPressed: onDisable,
              fullWidth: true,
            ),
          ],
          if (onRetry != null) ...[
            gapH12,
            CatchButton(
              key: ValueKey('messages.${channel.name}.retry'),
              label: l.eventMessagesRetry,
              onPressed: onRetry,
              fullWidth: true,
            ),
          ],
          if (onRefresh != null) ...[
            gapH8,
            CatchButton(
              label: l.eventMessagesRefresh,
              variant: CatchButtonVariant.ghost,
              onPressed: onRefresh,
            ),
          ],
          if (navigation != null) ...[gapH12, navigation!],
        ],
      ),
    );
  }
}
