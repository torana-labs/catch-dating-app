import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The Sends history in order: Choose what to send and WhatsApp Business
/// settings, the handoffs that need the host's own send, then every
/// campaign, announcement and follower update, newest first.
class HostSendsBody extends StatelessWidget {
  const HostSendsBody({
    super.key,
    required this.state,
    required this.onChoose,
    required this.onSettings,
    required this.onOpen,
    required this.onLoadMore,
    required this.onOpenTask,
    required this.onReplan,
    required this.onLoadMoreTasks,
    required this.onRetry,
    this.busy = false,
    this.replanning = false,
  });

  final HostSendsState state;
  final VoidCallback onChoose;
  final VoidCallback onSettings;
  final ValueChanged<HostSendSummary> onOpen;
  final VoidCallback onLoadMore;
  final ValueChanged<HostManualSendTask> onOpenTask;
  final ValueChanged<List<HostManualSendTask>> onReplan;
  final VoidCallback onLoadMoreTasks;
  final VoidCallback onRetry;

  /// A campaign is opening or a command is running.
  final bool busy;

  /// The handoff route check is running.
  final bool replanning;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final history = state.history;
    final Widget sends = switch (state.historyStatus) {
      HostSendsReadStatus.loading => const CatchLoadingIndicator(),
      HostSendsReadStatus.error => CatchErrorState(
        title: l10n.hostMessagingWorkspaceSends,
        message: l10n.hostPeopleMessagesErrorBody,
        retryLabel: l10n.hostPeopleRetry,
        onRetry: onRetry,
        mode: CatchErrorStateMode.inline,
      ),
      HostSendsReadStatus.ready when history!.items.isEmpty => CatchEmptyState(
        key: const ValueKey<String>('host-sends-empty'),
        icon: CatchIcons.send,
        title: l10n.hostSendsEmpty,
        message: l10n.hostSendsEmptyHelp,
      ),
      HostSendsReadStatus.ready => CatchStack(
        children: [
          CatchSection(
            title: l10n.hostMessagingWorkspaceSends,
            children: [
              for (final send in history!.items)
                CatchIndexRow(
                  key: ValueKey<String>('host-send-${hostSendKey(send)}'),
                  title: hostSendTitle(l10n, send),
                  subtitle: hostSendMetadata(l10n, send),
                  value: hostSendStatus(l10n, send),
                  icon: CatchIcons.send,
                  chevron: true,
                  onTap: busy ? null : () => onOpen(send),
                ),
            ],
          ),
          if (history.nextPageError != null)
            CatchNotice.inline(
              tone: CatchNoticeTone.warning,
              body: l10n.hostPeopleMessagesErrorBody,
              action: CatchNoticeAction(
                label: l10n.sharedActionTryAgain,
                onPressed: onLoadMore,
              ),
            )
          else if (history.hasMore)
            CatchButton(
              key: const ValueKey<String>('host-sends-more'),
              label: l10n.hostSendsLoadMore,
              variant: CatchButtonVariant.secondary,
              status: history.loadingMore
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: history.loadingMore ? null : onLoadMore,
            ),
        ],
      ),
    };
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g8,
          wrap: true,
          children: [
            CatchButton(
              key: const ValueKey<String>('host-sends-new-message'),
              label: l10n.hostSendsChooseIntent,
              leading: CatchIcon(CatchIcons.add, size: CatchIconSize.md),
              onPressed: busy ? null : onChoose,
            ),
            if (state.showWhatsappSetup)
              CatchButton(
                key: const ValueKey<String>('host-sends-settings'),
                label: l10n.hostSendsSettings,
                variant: CatchButtonVariant.secondary,
                onPressed: busy ? null : onSettings,
              ),
          ],
        ),
        HostSendsQueueSection(
          state: state,
          replanning: replanning,
          onOpenTask: onOpenTask,
          onReplan: onReplan,
          onLoadMore: onLoadMoreTasks,
          onRetry: onRetry,
        ),
        sends,
      ],
    );
  }
}

/// The personal WhatsApp handoffs still to send by hand: each person, where
/// the handoff is, Check options, what Catch keeps, and Load more. Hidden
/// when there is nothing to send.
class HostSendsQueueSection extends StatelessWidget {
  const HostSendsQueueSection({
    super.key,
    required this.state,
    required this.onOpenTask,
    required this.onReplan,
    required this.onLoadMore,
    required this.onRetry,
    this.replanning = false,
  });

  final HostSendsState state;
  final ValueChanged<HostManualSendTask> onOpenTask;
  final ValueChanged<List<HostManualSendTask>> onReplan;
  final VoidCallback onLoadMore;
  final VoidCallback onRetry;
  final bool replanning;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.tasksStatus) {
      case HostSendsReadStatus.loading:
        return CatchIndexRow(
          key: const ValueKey<String>('host-manual-send-queue-loading'),
          title: l10n.hostManualSendQueueTitle,
          subtitle: l10n.hostManualSendQueueLoading,
          onTap: null,
        );
      case HostSendsReadStatus.error:
        return CatchNotice.inline(
          key: const ValueKey<String>('host-manual-send-queue-error'),
          tone: CatchNoticeTone.warning,
          title: l10n.hostManualSendQueueTitle,
          body: l10n.hostPeopleMessagesErrorBody,
          action: CatchNoticeAction(
            label: l10n.sharedActionTryAgain,
            onPressed: onRetry,
          ),
        );
      case HostSendsReadStatus.ready:
        break;
    }
    final tasks = state.activeTasks;
    if (tasks.isEmpty) return const SizedBox.shrink();
    final pages = state.tasks!;
    return CatchStack(
      key: const ValueKey<String>('host-manual-send-queue'),
      gap: CatchStackGap.g8,
      children: [
        CatchSection(
          title: l10n.hostManualSendQueueTitle,
          note: l10n.hostSendsRecipients(count: tasks.length),
          action: CatchSectionAction(
            label: l10n.hostManualSendQueueReplan,
            onPressed: replanning ? null : () => onReplan(tasks),
          ),
          children: [
            for (final task in tasks)
              CatchIndexRow(
                key: ValueKey<String>('host-manual-send-${task.taskId}'),
                title: task.displayName,
                subtitle: hostManualTaskBody(l10n, task),
                value: hostManualTaskStatus(l10n, task),
                chevron: true,
                onTap: () => onOpenTask(task),
              ),
          ],
        ),
        CatchText(
          l10n.hostManualSendQueueDisclosure,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        if (pages.hasMore)
          CatchButton(
            label: l10n.hostSendsLoadMore,
            variant: CatchButtonVariant.secondary,
            status: pages.loadingMore
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: pages.loadingMore ? null : onLoadMore,
          ),
      ],
    );
  }
}

/// A send's stable key.
String hostSendKey(HostSendSummary send) => switch (send) {
  HostCampaignSendSummary(:final campaignId) => 'campaign-$campaignId',
  HostAnnouncementSendSummary(:final broadcastId) =>
    'announcement-$broadcastId',
  HostFollowerUpdateSendSummary(:final postId) => 'update-$postId',
};

/// A send's title: the campaign, the event, or Follower update.
String hostSendTitle(AppLocalizations l10n, HostSendSummary send) =>
    switch (send) {
      HostCampaignSendSummary campaign => campaign.name,
      HostAnnouncementSendSummary announcement => announcement.eventName,
      HostFollowerUpdateSendSummary() => l10n.hostSendsFollowerUpdateChannel,
    };

/// The channel, the audience or template, and the date.
String hostSendMetadata(AppLocalizations l10n, HostSendSummary send) =>
    switch (send) {
      HostCampaignSendSummary campaign => [
        l10n.hostSendsWhatsappBusinessChannel,
        campaign.templateName ?? campaign.templateId,
        AppTimeFormatters.shortDate(campaign.activityAt),
      ].join(' · '),
      HostAnnouncementSendSummary announcement => [
        l10n.hostSendsCatchAnnouncementChannel,
        l10n.hostSendsRecipients(count: announcement.recipientCount),
        AppTimeFormatters.shortDate(announcement.sentAt),
      ].join(' · '),
      HostFollowerUpdateSendSummary update => [
        l10n.hostSendsFollowersAudience,
        if (update.hasTrackedDelivery)
          l10n.hostSendsRecipients(count: update.activityAvailableCount),
        AppTimeFormatters.shortDate(update.createdAt),
      ].join(' · '),
    };

/// The campaign's status, the announcement's audience or partial
/// delivery, or the follower update's delivery.
String hostSendStatus(AppLocalizations l10n, HostSendSummary send) =>
    switch (send) {
      HostCampaignSendSummary campaign => campaign.status,
      HostAnnouncementSendSummary announcement =>
        announcement.partialFailure
            ? l10n.hostSendsPartial
            : announcement.audience,
      HostFollowerUpdateSendSummary update =>
        l10n.hostSendsFollowerDeliveryStatus(status: update.deliveryStatus),
    };

/// Where a handoff is: queued, or opened in WhatsApp.
String hostManualTaskBody(AppLocalizations l10n, HostManualSendTask task) =>
    task.status == HostManualSendTaskStatus.handoffOpened
    ? l10n.hostManualSendTaskOpenedBody
    : l10n.hostManualSendTaskQueuedBody;

/// A handoff's status label.
String hostManualTaskStatus(AppLocalizations l10n, HostManualSendTask task) =>
    switch (task.status) {
      HostManualSendTaskStatus.queued => l10n.hostManualSendTaskQueued,
      HostManualSendTaskStatus.handoffOpened => l10n.hostManualSendTaskOpened,
      HostManualSendTaskStatus.hostMarkedSent =>
        l10n.hostManualSendTaskHostMarkedSent,
      HostManualSendTaskStatus.skipped => l10n.hostManualSendTaskSkipped,
      HostManualSendTaskStatus.cancelled => l10n.hostManualSendTaskCancelled,
      HostManualSendTaskStatus.superseded => l10n.hostManualSendTaskSuperseded,
      HostManualSendTaskStatus.expired => l10n.hostManualSendTaskExpired,
    };
