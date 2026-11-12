import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Guest messages (RbProgInbox) as a list beside its conversation; on a
/// phone the conversation replaces the list. The list: the pane header
/// with Assistant settings, Needs you | Handled | All and one row per
/// household. The conversation: the household, the messages (the
/// assistant's answers captioned with their language), "Passed to you",
/// saved replies, the composer and the 24-hour window note.
class HostProgrammeInboxBody extends StatelessWidget {
  const HostProgrammeInboxBody({
    super.key,
    required this.status,
    required this.inbox,
    required this.filter,
    required this.thread,
    required this.threadStatus,
    required this.cannedReplies,
    required this.composer,
    required this.now,
    required this.onBack,
    required this.onSettings,
    required this.onFilter,
    required this.onSelect,
    required this.onCloseThread,
    required this.onOpenHousehold,
    required this.onHandling,
    required this.onCanned,
    required this.onSend,
    required this.onRetry,
    this.selectedThreadId,
    this.busy = false,
  });

  final HostProgrammeStatus status;
  final ProgramWhatsappInbox? inbox;
  final ProgramWhatsappFilter filter;
  final String? selectedThreadId;

  /// The open conversation, once loaded.
  final ProgramWhatsappThread? thread;
  final HostProgrammeStatus threadStatus;
  final List<ProgramCannedReply> cannedReplies;
  final TextEditingController composer;
  final DateTime now;
  final VoidCallback onBack;
  final VoidCallback onSettings;
  final ValueChanged<ProgramWhatsappFilter> onFilter;
  final ValueChanged<ProgramWhatsappThreadSummary> onSelect;
  final VoidCallback onCloseThread;
  final ValueChanged<String> onOpenHousehold;

  /// Who answers next, and optionally whether the thread is done.
  final void Function(
    ProgramWhatsappThreadSummary,
    ProgramWhatsappHandledBy,
    ProgramWhatsappThreadState?,
  )
  onHandling;
  final ValueChanged<ProgramCannedReply> onCanned;
  final ValueChanged<String> onSend;
  final VoidCallback onRetry;

  /// A reply or a hand-over is on its way.
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final inbox = this.inbox;
    if (status != HostProgrammeStatus.ready || inbox == null) {
      return HostProgrammeStateBody(status: status, onRetry: onRetry);
    }
    final list = CatchScrollView(
      primary: false,
      child: CatchPageBody(
        child: CatchStack(
          gap: CatchStackGap.g16,
          children: [
            CatchPaneHeader(
              title: l10n.hostProgrammeInboxTitle,
              back: CatchTopBarBack(
                label: l10n.hostProgrammeBackToProgramme,
                onPressed: onBack,
              ),
              trailing: CatchIconAction(
                key: const ValueKey<String>('host-programme-inbox-settings'),
                tooltip: l10n.hostProgrammeInboxSettings,
                variant: CatchIconActionVariant.plain,
                onPressed: onSettings,
                child: CatchIcon(CatchIcons.settings),
              ),
            ),
            CatchPageTabBar<ProgramWhatsappFilter>.segmented(
              selected: filter,
              label: l10n.hostProgrammeInboxShow,
              size: CatchPageTabBarSize.sm,
              onChanged: onFilter,
              options: [
                CatchOption<ProgramWhatsappFilter>(
                  value: ProgramWhatsappFilter.needsYou,
                  label: l10n.hostProgrammeInboxSegmentCount(
                    label: l10n.hostProgrammeInboxNeedsYou,
                    count: inbox.needsYou,
                  ),
                ),
                CatchOption<ProgramWhatsappFilter>(
                  value: ProgramWhatsappFilter.handled,
                  label: l10n.hostProgrammeInboxSegmentCount(
                    label: l10n.hostProgrammeInboxHandled,
                    count: inbox.handled,
                  ),
                ),
                CatchOption<ProgramWhatsappFilter>(
                  value: ProgramWhatsappFilter.all,
                  label: l10n.hostProgrammeInboxAll,
                ),
              ],
            ),
            if (inbox.sender == null)
              CatchNotice.inline(
                tone: CatchNoticeTone.warning,
                icon: CatchIcons.chat,
                body: l10n.hostProgrammeInboxNoNumber,
              ),
            CatchSection(
              empty: l10n.hostProgrammeInboxEmpty,
              children: [
                for (final row in inbox.threads)
                  CatchIndexRow(
                    key: ValueKey<String>(
                      'host-programme-inbox-thread-${row.threadId}',
                    ),
                    title: row.unknownSender
                        ? l10n.hostProgrammeInboxUnknownName
                        : row.displayName,
                    subtitle: row.lastMessagePreview,
                    leading: CatchAvatar.system(
                      size: CatchAvatarSize.sm,
                      name: row.displayName,
                    ),
                    badge: hostProgrammeInboxBadge(l10n, row),
                    value: AppTimeFormatters.chatTimestamp(
                      row.lastMessageAt,
                      now: now,
                    ),
                    selected: row.threadId == selectedThreadId,
                    onTap: () => onSelect(row),
                  ),
              ],
            ),
            CatchText(
              l10n.hostProgrammeInboxFooter,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
      ),
    );
    final selected = selectedThreadId;
    final thread = this.thread;
    final detail = CatchScrollView(
      primary: false,
      child: CatchPageBody(
        child: selected == null
            ? CatchEmptyState(
                icon: CatchIcons.conversations,
                title: l10n.hostProgrammeInboxPick,
              )
            : threadStatus != HostProgrammeStatus.ready || thread == null
            ? HostProgrammeStateBody(status: threadStatus, onRetry: onRetry)
            : HostProgrammeInboxThreadSection(
                thread: thread,
                cannedReplies: cannedReplies,
                composer: composer,
                now: now,
                busy: busy,
                onClose: onCloseThread,
                onOpenHousehold: onOpenHousehold,
                onHandling: onHandling,
                onCanned: onCanned,
                onSend: onSend,
              ),
      ),
    );
    return CatchPaneLayout(
      pattern: CatchPaneLayoutMode.listDetail,
      detailOpen: selected != null,
      children: [list, detail],
    );
  }
}

/// One conversation: the household, the messages, the hand-over and the
/// composer.
class HostProgrammeInboxThreadSection extends StatelessWidget {
  const HostProgrammeInboxThreadSection({
    super.key,
    required this.thread,
    required this.cannedReplies,
    required this.composer,
    required this.now,
    required this.busy,
    required this.onClose,
    required this.onOpenHousehold,
    required this.onHandling,
    required this.onCanned,
    required this.onSend,
  });

  final ProgramWhatsappThread thread;
  final List<ProgramCannedReply> cannedReplies;
  final TextEditingController composer;
  final DateTime now;
  final bool busy;
  final VoidCallback onClose;
  final ValueChanged<String> onOpenHousehold;
  final void Function(
    ProgramWhatsappThreadSummary,
    ProgramWhatsappHandledBy,
    ProgramWhatsappThreadState?,
  )
  onHandling;
  final ValueChanged<ProgramCannedReply> onCanned;
  final ValueChanged<String> onSend;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final summary = thread.summary;
    final household = thread.household;
    final title = summary.unknownSender
        ? l10n.hostProgrammeInboxUnknownName
        : summary.displayName;
    final guestName =
        household?.primaryContactName ??
        (summary.unknownSender
            ? l10n.hostProgrammeInboxUnknownName
            : summary.displayName);
    final windowOpen =
        summary.serviceWindowOpen &&
        now.isBefore(summary.serviceWindowExpiresAt);
    final canReply = windowOpen && !summary.unknownSender && !busy;
    final escalation = summary.escalation;
    final handBack = summary.handledBy == ProgramWhatsappHandledBy.planner;
    return CatchStack(
      children: [
        CatchPaneHeader(
          title: title,
          kicker: summary.sideLabel == null
              ? null
              : l10n.hostProgrammeInboxSide(name: summary.sideLabel!),
          back: CatchTopBarBack(
            label: l10n.hostProgrammeInboxTitle,
            onPressed: onClose,
          ),
          trailing: CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            children: [
              if (household != null)
                CatchButton(
                  key: const ValueKey<String>(
                    'host-programme-inbox-open-household',
                  ),
                  label: l10n.hostProgrammeInboxOpenHousehold,
                  variant: CatchButtonVariant.secondary,
                  size: CatchButtonSize.sm,
                  onPressed: () => onOpenHousehold(household.householdId),
                ),
              if (!summary.unknownSender)
                CatchButton(
                  key: const ValueKey<String>('host-programme-inbox-handling'),
                  label: handBack
                      ? l10n.hostProgrammeInboxHandBack
                      : l10n.hostProgrammeInboxTakeOver,
                  variant: CatchButtonVariant.secondary,
                  size: CatchButtonSize.sm,
                  onPressed: busy
                      ? null
                      : () => onHandling(
                          summary,
                          handBack
                              ? ProgramWhatsappHandledBy.assistant
                              : ProgramWhatsappHandledBy.planner,
                          null,
                        ),
                ),
            ],
          ),
        ),
        if (household != null)
          CatchIndexRow(
            title: guestName,
            subtitle: l10n.hostProgrammeInboxRepliesFor(
              count: household.guestCount,
            ),
            leading: CatchAvatar.system(
              size: CatchAvatarSize.sm,
              name: guestName,
            ),
            onTap: null,
          ),
        for (final message in thread.messages)
          HostProgrammeInboxMessageBubble(
            message: message,
            guestName: guestName,
            language: summary.language,
          ),
        if (escalation != null &&
            summary.state == ProgramWhatsappThreadState.needsYou)
          CatchNotice.inline(
            key: const ValueKey<String>('host-programme-inbox-passed'),
            tone: CatchNoticeTone.warning,
            icon: CatchIcons.flag,
            title: l10n.hostProgrammeInboxPassedTitle,
            body: hostProgrammeInboxEscalationText(l10n, escalation),
            action: summary.unknownSender
                ? null
                : CatchNoticeAction(
                    label: l10n.hostProgrammeInboxMarkHandled,
                    onPressed: busy
                        ? null
                        : () => onHandling(
                            summary,
                            summary.handledBy,
                            ProgramWhatsappThreadState.handled,
                          ),
                  ),
          ),
        if (canReply && cannedReplies.isNotEmpty)
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g6,
            wrap: true,
            children: [
              for (final reply in cannedReplies)
                CatchChip.filter(
                  key: ValueKey<String>(
                    'host-programme-inbox-canned-${reply.cannedReplyId}',
                  ),
                  label: reply.label,
                  size: CatchChipSize.sm,
                  onPressed: () => onCanned(reply),
                ),
            ],
          ),
        CatchComposerInput(
          key: const ValueKey<String>('host-programme-inbox-composer'),
          controller: composer,
          placeholder: l10n.hostProgrammeInboxReplyTo(name: guestName),
          sendLabel: l10n.hostProgrammeInboxSend,
          onSend: canReply ? onSend : null,
          closedNote: summary.unknownSender
              ? l10n.hostProgrammeInboxUnknownClosed
              : windowOpen
              ? null
              : l10n.hostProgrammeInboxWindowClosed,
        ),
        if (windowOpen && !summary.unknownSender)
          CatchText(
            l10n.hostProgrammeInboxWindowOpen(
              when: AppTimeFormatters.dateTime(summary.serviceWindowExpiresAt),
            ),
            variant: CatchTextVariant.bodyMeta,
            tone: CatchTextTone.secondary,
          ),
      ],
    );
  }
}

/// One message bubble, with the assistant's or planner's caption.
class HostProgrammeInboxMessageBubble extends StatelessWidget {
  const HostProgrammeInboxMessageBubble({
    super.key,
    required this.message,
    required this.guestName,
    this.language,
  });

  final ProgramWhatsappMessage message;
  final String guestName;

  /// The guest's language, which the assistant answers in.
  final ProgramAssistantLanguage? language;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final inbound = message.direction == ProgramWhatsappDirection.inbound;
    final text = message.kind == ProgramWhatsappMessageKind.mediaRef
        ? l10n.hostProgrammeInboxAttachment
        : message.text ?? '';
    final language = this.language;
    final caption = switch (message.author) {
      ProgramWhatsappAuthor.assistant when language != null =>
        l10n.hostProgrammeInboxAssistantCaption(
          language: hostProgrammeInboxLanguageName(l10n, language),
        ),
      ProgramWhatsappAuthor.assistant =>
        l10n.hostProgrammeInboxAssistantCaptionNoLanguage,
      ProgramWhatsappAuthor.planner when message.authorName != null =>
        l10n.hostProgrammeInboxPlannerCaption(name: message.authorName!),
      _ => null,
    };
    final bubble = CatchChatBubble(
      key: ValueKey<String>(
        'host-programme-inbox-message-${message.messageId}',
      ),
      text: text,
      variant: inbound
          ? CatchChatBubbleVariant.theirs
          : message.author == ProgramWhatsappAuthor.system
          ? CatchChatBubbleVariant.system
          : CatchChatBubbleVariant.mine,
      time: AppTimeFormatters.time(message.createdAt),
      status: inbound ? null : hostProgrammeInboxBubbleStatus(message.status),
      author: inbound ? CatchChatAuthor(name: guestName) : null,
    );
    if (caption == null) return bubble;
    return CatchStack(
      gap: CatchStackGap.g4,
      children: [
        bubble,
        CatchText(
          caption,
          variant: CatchTextVariant.bodyMeta,
          tone: CatchTextTone.secondary,
          align: TextAlign.end,
        ),
      ],
    );
  }
}

/// A thread's list badge: Needs you, Passed to you, Not on the list or
/// Answered.
CatchIndexRowBadge hostProgrammeInboxBadge(
  AppLocalizations l10n,
  ProgramWhatsappThreadSummary row,
) => switch (row) {
  ProgramWhatsappThreadSummary(unknownSender: true) => CatchIndexRowBadge(
    label: l10n.hostProgrammeInboxUnknownBadge,
    tone: CatchBadgeTone.info,
  ),
  ProgramWhatsappThreadSummary(state: ProgramWhatsappThreadState.handled) =>
    CatchIndexRowBadge(
      label: l10n.hostProgrammeInboxAnswered,
      tone: CatchBadgeTone.success,
    ),
  ProgramWhatsappThreadSummary(escalation: final _?) => CatchIndexRowBadge(
    label: l10n.hostProgrammeInboxPassedBadge,
    tone: CatchBadgeTone.warning,
  ),
  _ => CatchIndexRowBadge(
    label: l10n.hostProgrammeInboxNeedsYou,
    tone: CatchBadgeTone.warning,
  ),
};

/// Why the assistant passed a thread on, in the planner's words.
String hostProgrammeInboxEscalationText(
  AppLocalizations l10n,
  ProgramWhatsappEscalation escalation,
) => switch (escalation) {
  ProgramWhatsappEscalation.notInFacts =>
    l10n.hostProgrammeInboxPassedNotInFacts,
  ProgramWhatsappEscalation.askedForPerson =>
    l10n.hostProgrammeInboxPassedPerson,
  ProgramWhatsappEscalation.media => l10n.hostProgrammeInboxPassedMedia,
  ProgramWhatsappEscalation.distress => l10n.hostProgrammeInboxPassedDistressed,
  ProgramWhatsappEscalation.unknownSender =>
    l10n.hostProgrammeInboxPassedUnknown,
  ProgramWhatsappEscalation.assistantOff => l10n.hostProgrammeInboxPassedOff,
  ProgramWhatsappEscalation.budgetExhausted =>
    l10n.hostProgrammeInboxPassedBudget,
  ProgramWhatsappEscalation.outsideWindow =>
    l10n.hostProgrammeInboxPassedWindow,
  ProgramWhatsappEscalation.giftsOrMoney => l10n.hostProgrammeInboxPassedMoney,
  ProgramWhatsappEscalation.changeRequest =>
    l10n.hostProgrammeInboxPassedChange,
  ProgramWhatsappEscalation.plannerHandling =>
    l10n.hostProgrammeInboxPassedPlanner,
  ProgramWhatsappEscalation.providerError ||
  ProgramWhatsappEscalation.unsafeAnswer ||
  ProgramWhatsappEscalation.factsUnavailable ||
  ProgramWhatsappEscalation.uncertainRetry =>
    l10n.hostProgrammeInboxPassedOther,
};

CatchChatBubbleStatus? hostProgrammeInboxBubbleStatus(
  ProgramWhatsappMessageStatus status,
) => switch (status) {
  ProgramWhatsappMessageStatus.pending => CatchChatBubbleStatus.sending,
  ProgramWhatsappMessageStatus.sent ||
  ProgramWhatsappMessageStatus.delivered => CatchChatBubbleStatus.sent,
  ProgramWhatsappMessageStatus.read => CatchChatBubbleStatus.read,
  ProgramWhatsappMessageStatus.failed => CatchChatBubbleStatus.failed,
  _ => null,
};

/// A language's name in the planner's words.
String hostProgrammeInboxLanguageName(
  AppLocalizations l10n,
  ProgramAssistantLanguage language,
) => switch (language) {
  ProgramAssistantLanguage.en => l10n.hostProgrammeInboxLanguageEn,
  ProgramAssistantLanguage.hi => l10n.hostProgrammeInboxLanguageHi,
  ProgramAssistantLanguage.gu => l10n.hostProgrammeInboxLanguageGu,
  ProgramAssistantLanguage.mr => l10n.hostProgrammeInboxLanguageMr,
  ProgramAssistantLanguage.ta => l10n.hostProgrammeInboxLanguageTa,
};
