import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_banner.dart';
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
            CatchLegacyText(
              senderName!,
              variant: CatchLegacyTextVariant.sectionTitle,
            ),
          if (senderPhone != null)
            CatchLegacyText(
              senderPhone!,
              variant: CatchLegacyTextVariant.supporting,
            ),
          if (earlierSender) ...[
            gapH8,
            CatchLegacyText(
              l.eventMessagesEarlierSender,
              variant: CatchLegacyTextVariant.supporting,
            ),
          ],
          gapH8,
          CatchLegacyText(switch (permission) {
            EventMessagePermission.notSet => l.eventMessagesNotSet,
            EventMessagePermission.enabled => l.eventMessagesEnabled,
            EventMessagePermission.disabled => l.eventMessagesDisabled,
            EventMessagePermission.expired => l.eventMessagesExpired,
          }, variant: CatchLegacyTextVariant.supporting),
          if (phoneLastFour != null)
            CatchLegacyText(
              l.eventMessagesPhoneEnding(digits: phoneLastFour!),
              variant: CatchLegacyTextVariant.supporting,
            ),
          if (expiry != null)
            CatchLegacyText(
              l.eventMessagesUntil(
                date: material.formatFullDate(expiry),
                time: material.formatTimeOfDay(TimeOfDay.fromDateTime(expiry)),
              ),
              variant: CatchLegacyTextVariant.supporting,
            ),
          if (availability != EventMessageAvailability.ready) ...[
            gapH8,
            CatchLegacyText(switch (availability) {
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
            }, variant: CatchLegacyTextVariant.supporting),
          ],
          gapH12,
          // Server-authored consent is deliberately complete, never a preview
          // or locally reconstructed promise about delivery or privacy.
          CatchLegacyText(
            consentText,
            variant: CatchLegacyTextVariant.supporting,
          ),
          if (phase != EventMessageSavePhase.ready) ...[
            gapH12,
            Semantics(
              liveRegion: true,
              child: CatchLegacyText(switch (phase) {
                EventMessageSavePhase.ready => '',
                EventMessageSavePhase.saving => l.eventMessagesSaving,
                EventMessageSavePhase.uncertain => l.eventMessagesUncertain,
                EventMessageSavePhase.refreshRequired =>
                  l.eventMessagesReviewChanged,
              }, variant: CatchLegacyTextVariant.supporting),
            ),
          ],
          if (notice != EventMessageSaveNotice.none) ...[
            gapH8,
            Semantics(
              liveRegion: true,
              child: CatchLegacyText(switch (notice) {
                EventMessageSaveNotice.none => '',
                EventMessageSaveNotice.saved => l.eventMessagesSaved,
                EventMessageSaveNotice.changed => l.eventMessagesChanged,
              }, variant: CatchLegacyTextVariant.supporting),
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
              variant: CatchButtonVariant.quiet,
              onPressed: onRefresh,
            ),
          ],
          if (navigation != null) ...[gapH12, navigation!],
        ],
      ),
    );
  }
}
