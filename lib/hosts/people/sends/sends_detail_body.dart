import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign_policy.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// What to send, each with whether it can start now: continue a
/// conversation, message a saved audience (WhatsApp Business), send an
/// event announcement, post a follower update; then WhatsApp Business
/// settings.
class HostSendsChooseBody extends StatelessWidget {
  const HostSendsChooseBody({
    super.key,
    required this.state,
    required this.onConversation,
    required this.onCampaign,
    required this.onAnnouncement,
    required this.onFollowerUpdate,
    required this.onSettings,
  });

  final HostSendsState state;
  final VoidCallback onConversation;
  final VoidCallback onCampaign;
  final VoidCallback onAnnouncement;
  final VoidCallback onFollowerUpdate;
  final VoidCallback onSettings;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final setup = state.setup;
    final announcement = state.announcement;
    final event = announcement.event;
    final quota = state.quota;
    final campaignReady = setup?.canComposeCampaign ?? false;
    return CatchStack(
      gap: CatchStackGap.g16,
      children: [
        CatchSection(
          title: l10n.hostSendsIntentTitle,
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('host-send-intent-conversation'),
              title: l10n.hostSendsConversationIntent,
              subtitle: l10n.hostSendsConversationIntentBody,
              icon: CatchIcons.conversations,
              chevron: true,
              onTap: onConversation,
            ),
            if (state.showWhatsappSetup)
              CatchIndexRow(
                key: const ValueKey<String>('host-send-intent-saved-audience'),
                title: l10n.hostSendsSavedAudienceIntent,
                subtitle: switch (state.setupStatus) {
                  HostSendsReadStatus.loading => l10n.hostSendsChannelChecking,
                  HostSendsReadStatus.error => l10n.hostSendsChannelUnavailable,
                  HostSendsReadStatus.ready =>
                    campaignReady
                        ? l10n.hostSendsSavedAudienceIntentBody
                        : l10n.hostSendsSavedAudienceSetupBody,
                },
                value:
                    state.setupStatus != HostSendsReadStatus.loading &&
                        !campaignReady
                    ? l10n.hostSendsSetupRequired
                    : null,
                icon: CatchIcons.people,
                chevron: campaignReady,
                onTap: campaignReady ? onCampaign : null,
              ),
            CatchIndexRow(
              key: const ValueKey<String>(
                'host-send-intent-event-announcement',
              ),
              title: l10n.hostSendsEventAnnouncementIntent,
              subtitle: switch (announcement.status) {
                HostSendsAnnouncementStatus.checkingEvents =>
                  l10n.hostSendsEventAnnouncementChecking,
                HostSendsAnnouncementStatus.checkingAudience =>
                  l10n.hostSendsEventAnnouncementCheckingAudience,
                HostSendsAnnouncementStatus.unavailable =>
                  l10n.hostSendsEventAnnouncementUnavailable,
                HostSendsAnnouncementStatus.noEvent =>
                  l10n.hostSendsEventAnnouncementEmpty,
                HostSendsAnnouncementStatus.ready ||
                HostSendsAnnouncementStatus.blocked =>
                  l10n.hostSendsEventAnnouncementIntentBody(
                    eventTitle: event!.title,
                    bookedCount: announcement.booked,
                    prospectiveCount: announcement.prospective,
                  ),
              },
              value: switch (announcement.status) {
                HostSendsAnnouncementStatus.ready =>
                  l10n.hostSendsEventAudienceSelected(
                    count: announcement.booked > 0
                        ? announcement.booked
                        : announcement.prospective,
                  ),
                HostSendsAnnouncementStatus.blocked =>
                  l10n.hostSendsEventAnnouncementNoAudience,
                _ => null,
              },
              icon: CatchIcons.event,
              chevron: announcement.status == HostSendsAnnouncementStatus.ready,
              onTap: announcement.status == HostSendsAnnouncementStatus.ready
                  ? onAnnouncement
                  : null,
            ),
            CatchIndexRow(
              key: const ValueKey<String>('host-send-intent-follower-update'),
              title: l10n.hostSendsFollowerUpdateIntent,
              subtitle: switch (state.quotaStatus) {
                HostSendsReadStatus.loading => l10n.hostSendsChannelChecking,
                HostSendsReadStatus.error => l10n.hostSendsChannelUnavailable,
                HostSendsReadStatus.ready =>
                  quota! > 0
                      ? l10n.hostSendsFollowerUpdateDescription
                      : l10n.hostSendsFollowerUpdateQuotaUsed,
              },
              value: quota == 0 ? l10n.hostSendsWeeklyLimit : null,
              icon: CatchIcons.announce,
              chevron: (quota ?? 0) > 0,
              onTap: (quota ?? 0) > 0 ? onFollowerUpdate : null,
            ),
          ],
        ),
        if (state.showWhatsappSetup)
          CatchButton(
            key: const ValueKey<String>('host-send-intent-settings'),
            label: l10n.hostSendsSettings,
            variant: CatchButtonVariant.secondary,
            onPressed: onSettings,
          ),
      ],
    );
  }
}

/// A sent announcement or follower update: who it reached, when, and how
/// delivery went.
class HostSendsReportBody extends StatelessWidget {
  const HostSendsReportBody({super.key, required this.send});

  final HostSendSummary send;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final send = this.send;
    return switch (send) {
      HostAnnouncementSendSummary announcement => CatchNotice.inline(
        key: const ValueKey<String>('host-send-report-announcement'),
        tone: announcement.partialFailure
            ? CatchNoticeTone.warning
            : CatchNoticeTone.status,
        title: announcement.eventName,
        body: [
          l10n.hostSendsRecipients(count: announcement.recipientCount),
          AppTimeFormatters.dateTime(announcement.sentAt),
          if (announcement.partialFailure) l10n.hostSendsPartial,
        ].join(' · '),
      ),
      HostFollowerUpdateSendSummary update => CatchNotice.inline(
        key: const ValueKey<String>('host-send-report-follower-update'),
        tone: update.deliveryCompleted
            ? CatchNoticeTone.status
            : CatchNoticeTone.warning,
        title: l10n.hostSendsFollowersAudience,
        body: [
          AppTimeFormatters.dateTime(update.createdAt),
          if (update.eventId != null) l10n.hostSendsLinkedEventUpdate,
          l10n.hostSendsFollowerDeliveryStatus(status: update.deliveryStatus),
          if (update.hasTrackedDelivery)
            l10n.hostSendsRecipients(count: update.activityAvailableCount),
          if (update.whatsapp case final whatsapp?)
            l10n.hostSendsFollowerUpdateWhatsapp(
              sent: whatsapp.sentCount,
              delivered: whatsapp.deliveredCount,
              skipped: whatsapp.skippedCount,
            ),
        ].join(' · '),
      ),
      HostCampaignSendSummary() => const SizedBox.shrink(),
    };
  }
}

/// A campaign's report: its status and audience counts, what blocks it,
/// how delivery went, and Approve, Send now, Refresh, Cancel and New
/// campaign.
class HostSendsCampaignSection extends StatelessWidget {
  const HostSendsCampaignSection({
    super.key,
    required this.campaign,
    required this.onRefresh,
    required this.onNew,
    this.onApprove,
    this.onSend,
    this.onCancel,
    this.busy = false,
  });

  final HostCampaign campaign;
  final VoidCallback? onApprove;
  final VoidCallback? onSend;
  final VoidCallback? onCancel;
  final VoidCallback onRefresh;
  final VoidCallback onNew;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final counts = campaign.audienceCounts;
    final delivery = campaign.deliveryCounts;
    final status = busy ? CatchButtonStatus.loading : CatchButtonStatus.idle;
    return CatchStack(
      key: ValueKey<String>('host-campaign-report-${campaign.campaignId}'),
      children: [
        CatchNotice.inline(
          tone: campaign.blockers.isEmpty
              ? CatchNoticeTone.status
              : CatchNoticeTone.warning,
          title: l10n.hostsHostAudienceCampaignStatus(status: campaign.status),
          body: l10n.hostsHostAudienceCampaignCounts(
            total: counts['total'],
            reachable: counts['reachable'],
            optedOut: counts['optedOut'],
            unknown: counts['unknown'],
          ),
        ),
        if (campaign.blockers.isNotEmpty)
          CatchText(
            campaign.blockers
                .map((value) => hostCampaignBlockerLabel(l10n, value))
                .join(' · '),
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.warning,
          ),
        if (delivery.values.values.any((value) => value > 0))
          CatchText(
            l10n.hostsHostAudienceDeliveryCounts(
              sent: delivery['sent'],
              delivered: delivery['delivered'],
              read: delivery['read'],
              failed: delivery['failed'],
            ),
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g8,
          wrap: true,
          children: [
            if (onApprove != null)
              CatchButton(
                key: const ValueKey<String>('host-campaign-approve'),
                label: l10n.hostsHostAudienceApprove,
                status: status,
                onPressed: busy ? null : onApprove,
              ),
            if (onSend != null)
              CatchButton(
                key: const ValueKey<String>('host-campaign-send'),
                label: l10n.hostsHostAudienceSendNow,
                status: status,
                onPressed: busy ? null : onSend,
              ),
            CatchButton(
              key: const ValueKey<String>('host-campaign-refresh'),
              label: l10n.hostsHostAudienceRefresh,
              variant: CatchButtonVariant.secondary,
              onPressed: busy ? null : onRefresh,
            ),
            if (onCancel != null)
              CatchButton(
                key: const ValueKey<String>('host-campaign-cancel'),
                label: l10n.hostsHostAudienceCancel,
                variant: CatchButtonVariant.quiet,
                onPressed: busy ? null : onCancel,
              ),
            CatchButton(
              key: const ValueKey<String>('host-campaign-new'),
              label: l10n.hostsHostAudienceNewCampaign,
              variant: CatchButtonVariant.quiet,
              onPressed: busy ? null : onNew,
            ),
          ],
        ),
      ],
    );
  }
}

/// A campaign blocker in the host's words.
String hostCampaignBlockerLabel(
  AppLocalizations l10n,
  String value,
) => switch (value) {
  HostCampaignBlockers.providerSetupRequired =>
    l10n.hostsHostAudienceBlockerProvider,
  HostCampaignBlockers.senderInactive => l10n.hostsHostAudienceBlockerSender,
  HostCampaignBlockers.templateMissing ||
  HostCampaignBlockers.templateUnapproved =>
    l10n.hostsHostAudienceBlockerTemplate,
  HostCampaignBlockers.noReachableRecipients =>
    l10n.hostsHostAudienceBlockerNoRecipients,
  HostCampaignBlockers.audienceCoveragePartial =>
    l10n.hostsHostAudienceBlockerCoverage,
  HostCampaignBlockers.audienceTooLarge =>
    l10n.hostsHostAudienceBlockerTooLarge,
  HostCampaignBlockers.eventMissing ||
  HostCampaignBlockers.eventUnavailable => l10n.hostsHostAudienceBlockerEvent,
  HostCampaignBlockers.scheduleInPast => l10n.hostsHostAudienceBlockerSchedule,
  _ => value,
};
