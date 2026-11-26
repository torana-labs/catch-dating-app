import 'package:catch_dating_app/hosts/people/conversation/conversation_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Whether a conversation fills its own screen (the top bar carries the
/// person) or sits in a pane beside Messages (a pane header does).
enum HostConversationPresentation { screen, pane }

/// One person's conversation, Catch and WhatsApp together: what it is
/// about, the transcript with each message's channel, the notes on what
/// the transcript covers, older Catch messages, the reply routes and the
/// composer. A programme scope shows only why no conversation can be
/// shown there.
class HostConversationBody extends StatelessWidget {
  const HostConversationBody({
    super.key,
    required this.state,
    required this.composer,
    required this.scroll,
    required this.onBack,
    required this.onSelectRoute,
    required this.onSend,
    required this.onSendPhoto,
    required this.onLoadOlder,
    required this.onRetry,
    this.presentation = HostConversationPresentation.screen,
    this.selectedRoute,
    this.sending = HostConversationSending.idle,
    this.trailing,
  });

  final HostConversationState state;

  /// The draft for the selected route.
  final TextEditingController composer;

  /// The transcript, newest at the bottom; read markers follow it.
  final ScrollController scroll;
  final HostConversationPresentation presentation;

  /// The route key a reply goes to; null until one is chosen.
  final String? selectedRoute;
  final HostConversationSending sending;
  final VoidCallback onBack;
  final ValueChanged<HostConversationRoute> onSelectRoute;
  final ValueChanged<String> onSend;
  final VoidCallback onSendPhoto;
  final ValueChanged<String> onLoadOlder;
  final VoidCallback onRetry;

  /// The person actions, in the pane header.
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final person = state.person;
    final header = presentation == HostConversationPresentation.pane
        ? CatchPaneHeader(
            title: person?.displayName ?? hostConversationTitle(l10n, state),
            kicker: person == null ? null : hostConversationKicker(l10n, state),
            back: CatchTopBarBack(
              label: l10n.hostPeopleBack,
              onPressed: onBack,
            ),
            trailing: trailing,
          )
        : null;
    final Widget content = switch (state.status) {
      HostConversationStatus.loading => const CatchLoadingIndicator(),
      HostConversationStatus.error => CatchErrorState(
        title: l10n.hostPeopleMessagesErrorTitle,
        message: l10n.hostPeopleMessagesErrorBody,
        retryLabel: l10n.hostPeopleRetry,
        onRetry: onRetry,
        mode: CatchErrorStateMode.inline,
      ),
      HostConversationStatus.programme => CatchEmptyState(
        icon: CatchIcons.chat,
        title: l10n.hostInboxProgramPurposeUnresolvedTitle,
        message: l10n.hostInboxProgramPurposeUnresolvedBody,
      ),
      HostConversationStatus.unavailable => CatchEmptyState(
        icon: CatchIcons.chat,
        title: l10n.hostInboxSelectionUnavailable,
      ),
      HostConversationStatus.ready => HostConversationThreadSection(
        state: state,
        composer: composer,
        scroll: scroll,
        selectedRoute: selectedRoute,
        sending: sending,
        onSelectRoute: onSelectRoute,
        onSend: onSend,
        onSendPhoto: onSendPhoto,
        onLoadOlder: onLoadOlder,
        onRetry: onRetry,
      ),
    };
    final ready = state.status == HostConversationStatus.ready;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (header != null) CatchPageBody(child: header),
        Expanded(
          child: ready
              ? content
              : CatchScrollView(child: CatchPageBody(child: content)),
        ),
      ],
    );
  }
}

/// What a reply is doing: nothing, sending text, or sending a photo.
enum HostConversationSending { idle, text, photo }

/// The person's name, or the screen's title before there is a person: a
/// programme's title (or why it has none), else New message.
String hostConversationTitle(
  AppLocalizations l10n,
  HostConversationState state,
) =>
    state.person?.displayName ??
    (state.scope?.isProgram ?? false
        ? state.programmeTitle ?? l10n.hostInboxProgramPurposeUnresolvedTitle
        : l10n.hostInboxNewMessage);

/// What the conversation is about: the event, or General inquiries.
String hostConversationKicker(
  AppLocalizations l10n,
  HostConversationState state,
) => state.eventTitle ?? l10n.hostsHostInboxScreenVisiblecopyGeneralInquiries;

/// A channel's name: "Catch" or "WhatsApp".
String hostConversationChannelLabel(
  AppLocalizations l10n,
  HostConversationChannel channel,
) => switch (channel) {
  HostConversationChannel.catchApp => l10n.hostInboxCatchChannel,
  HostConversationChannel.whatsapp => l10n.hostInboxWhatsappReplyChannel,
};

/// A route's chip: the channel, and the date when there are two of it.
String hostConversationRouteLabel(
  BuildContext context,
  HostConversationRoute route,
) {
  final channel = hostConversationChannelLabel(context.l10n, route.channel);
  final date = route.date;
  return date == null
      ? channel
      : '$channel · ${MaterialLocalizations.of(context).formatCompactDate(date)}';
}

/// The ready conversation: the transcript (newest at the bottom, with the
/// coverage notes and older-message buttons above the oldest message), the
/// reply routes and the composer.
class HostConversationThreadSection extends StatelessWidget {
  const HostConversationThreadSection({
    super.key,
    required this.state,
    required this.composer,
    required this.scroll,
    required this.selectedRoute,
    required this.sending,
    required this.onSelectRoute,
    required this.onSend,
    required this.onSendPhoto,
    required this.onLoadOlder,
    required this.onRetry,
  });

  final HostConversationState state;
  final TextEditingController composer;
  final ScrollController scroll;
  final String? selectedRoute;
  final HostConversationSending sending;
  final ValueChanged<HostConversationRoute> onSelectRoute;
  final ValueChanged<String> onSend;
  final VoidCallback onSendPhoto;
  final ValueChanged<String> onLoadOlder;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final messages = state.messages;
    final route = state.route(selectedRoute);
    final canSend = route != null && route.available;
    final busy = sending != HostConversationSending.idle;
    final notes = CatchStack(
      key: const ValueKey<String>('host-conversation-notes'),
      gap: CatchStackGap.g8,
      children: [
        CatchText(
          l10n.hostInboxHistoryCoverage,
          variant: CatchTextVariant.bodyMeta,
          tone: CatchTextTone.secondary,
        ),
        if (state.sharedScope)
          CatchText(
            l10n.hostInboxSharedThreadHistory,
            variant: CatchTextVariant.bodyMeta,
            tone: CatchTextTone.secondary,
          ),
        if (state.partial)
          CatchNotice.inline(
            key: const ValueKey<String>('host-conversation-partial'),
            tone: CatchNoticeTone.warning,
            icon: CatchIcons.warning,
            body: l10n.hostInboxPartialSources,
            action: CatchNoticeAction(
              label: l10n.sharedActionTryAgain,
              onPressed: onRetry,
            ),
          ),
        for (final older in state.older)
          CatchButton(
            key: ValueKey<String>(
              'host-conversation-older-${older.conversationId}',
            ),
            label: older.failed
                ? l10n.sharedActionTryAgain
                : l10n.hostInboxOlderMessages,
            variant: CatchButtonVariant.secondary,
            size: CatchButtonSize.sm,
            status: older.loading
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed: older.loading
                ? null
                : () => onLoadOlder(older.conversationId),
          ),
      ],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: ListView.builder(
            key: PageStorageKey<String>(
              'host-conversation-${state.person?.key}-'
              '${state.scope?.eventId ?? 'general'}',
            ),
            controller: scroll,
            reverse: true,
            padding: CatchInsets.pageBody,
            itemCount: messages.length + 1,
            itemBuilder: (context, index) {
              if (index == messages.length) return notes;
              final message = messages[messages.length - 1 - index];
              final previous = index + 1 < messages.length
                  ? messages[messages.length - 2 - index]
                  : null;
              return HostConversationMessageBubble(
                key: ValueKey<String>(message.id),
                message: message,
                name: state.person?.displayName ?? '',
                photoUrl: state.person?.photoUrl,
                continued:
                    previous != null &&
                    previous.mine == message.mine &&
                    previous.channel == message.channel,
              );
            },
          ),
        ),
        CatchPageBody(
          padding: CatchInsets.pageHorizontal,
          child: CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchText(
                l10n.hostInboxReplyVia,
                variant: CatchTextVariant.labelAction,
              ),
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g6,
                wrap: true,
                children: [
                  for (final option in state.routes)
                    CatchChip.choice(
                      key: ValueKey<String>(
                        'host-conversation-route-${option.key}',
                      ),
                      label: hostConversationRouteLabel(context, option),
                      size: CatchChipSize.sm,
                      selected: option.key == selectedRoute,
                      mode: CatchChipMode.single,
                      onPressed: busy ? null : () => onSelectRoute(option),
                    ),
                ],
              ),
              if (!canSend)
                CatchText(
                  route == null
                      ? l10n.hostInboxChooseReplyRoute
                      : l10n.hostInboxRouteUnavailable,
                  variant: CatchTextVariant.bodyMeta,
                  tone: CatchTextTone.secondary,
                ),
            ],
          ),
        ),
        CatchComposerInput(
          key: const ValueKey<String>('host-conversation-composer'),
          controller: composer,
          placeholder: l10n.chatsChatInputBarPlaceholderMessage,
          sendLabel: l10n.chatsChatInputBarMessageSendMessage,
          onSend: canSend && !busy ? onSend : null,
          leading: route?.channel == HostConversationChannel.catchApp
              ? CatchIconAction(
                  key: const ValueKey<String>('host-conversation-photo'),
                  tooltip: l10n.chatsChatInputBarMessageSendAnImage,
                  variant: CatchIconActionVariant.plain,
                  onPressed: canSend && !busy ? onSendPhoto : null,
                  child: sending == HostConversationSending.photo
                      ? const CatchLoadingIndicator()
                      : CatchIcon(CatchIcons.addPhoto),
                )
              : null,
        ),
      ],
    );
  }
}

/// One message: the channel it came on over the bubble, then the bubble
/// (with its photo under it).
class HostConversationMessageBubble extends StatelessWidget {
  const HostConversationMessageBubble({
    super.key,
    required this.message,
    required this.name,
    this.photoUrl,
    this.continued = false,
  });

  final HostConversationMessage message;

  /// The guest, for the avatar beside their messages.
  final String name;
  final String? photoUrl;

  /// The message before it came from the same side on the same channel.
  final bool continued;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final sentAt = message.sentAt;
    final imageUrl = message.imageUrl;
    final channel = hostConversationChannelLabel(l10n, message.channel);
    return CatchChatBubble(
      text: message.text,
      variant: message.mine
          ? CatchChatBubbleVariant.mine
          : CatchChatBubbleVariant.theirs,
      time: sentAt == null
          ? l10n.chatsMessageBubbleVisiblecopySending
          : '$channel · ${AppTimeFormatters.time(sentAt)}',
      status: message.mine && sentAt == null
          ? CatchChatBubbleStatus.sending
          : null,
      continued: continued,
      leading: message.mine
          ? null
          : CatchAvatar.system(
              size: CatchAvatarSize.sm,
              name: name,
              imageUrl: photoUrl,
            ),
      footer: imageUrl == null ? null : CatchNetworkImage(imageUrl, aspect: 1),
    );
  }
}
