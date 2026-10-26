import 'package:catch_dating_app/chats/presentation/widgets/chat_input.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/activity_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/notifications/domain/activity_notification.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Localized conversation copy',
  type: CatchPersonRowCopy,
  path: '[Core primitives]/Product composites',
)
Widget catchPersonRowCopyContract(BuildContext context) =>
    catchPersonRowChatPreviewContractStates(context);

@widgetbook.UseCase(
  name: 'Contract states',
  type: ChatInput,
  path: '[Core primitives]/Product composites',
)
Widget chatInputBarContractStates(BuildContext context) {
  return const WidgetbookContractFrame(
    title: 'ChatInput',
    contractId: 'catch.chat_composer',
    states: [
      'empty-unfocused',
      'empty-focused',
      'draft-unfocused',
      'draft-focused',
      'multiline',
      'sending-text',
      'uploading-image',
      'disabled',
      'text-only',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'empty-unfocused',
        child: _ChatComposerContractPreview(),
      ),
      WidgetbookContractStateCard(
        label: 'draft-unfocused',
        child: _ChatComposerContractPreview(
          initialText: 'That last loop was fun.',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'multiline',
        child: _ChatComposerContractPreview(
          initialText: 'A message that can wrap onto more than one line.',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'sending-text',
        child: _ChatComposerContractPreview(
          initialText: 'Sending this now...',
          sending: true,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'uploading-image',
        child: _ChatComposerContractPreview(sendingImage: true),
      ),
      WidgetbookContractStateCard(
        label: 'disabled',
        child: _ChatComposerContractPreview(
          disabledReason: 'This chat is closed.',
        ),
      ),
      WidgetbookContractStateCard(
        label: 'text-only',
        child: _ChatComposerContractPreview(showImageButton: false),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Focused empty',
  type: ChatInput,
  path: '[Core primitives]/Product composites',
)
Widget chatInputBarFocusedEmpty(BuildContext context) {
  return const Scaffold(
    body: Align(
      alignment: Alignment.bottomCenter,
      child: _ChatComposerContractPreview(autofocus: true),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Focused draft',
  type: ChatInput,
  path: '[Core primitives]/Product composites',
)
Widget chatInputBarFocusedDraft(BuildContext context) {
  return const Scaffold(
    body: Align(
      alignment: Alignment.bottomCenter,
      child: _ChatComposerContractPreview(
        initialText: 'That last loop was fun.',
        autofocus: true,
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchPersonLayout,
  path: '[Core primitives]/Product composites',
)
Widget catchPersonRowChatPreviewContractStates(BuildContext context) {
  final copy = catchPersonRowCopy(context.l10n);
  Widget preview(
    String label,
    CatchFieldLayout layout, {
    double scale = 1,
    bool read = false,
    CatchFieldSecondaryAction? action,
  }) => WidgetbookContractStateCard(
    label: label,
    child: MediaQuery(
      data: MediaQuery.of(
        context,
      ).copyWith(textScaler: TextScaler.linear(scale)),
      child: CatchSection.containedRows(
        children: [
          if (read)
            CatchField.read(content: layout, secondaryAction: action)
          else
            CatchField.navigate(
              content: layout,
              onActivate: () {},
              secondaryAction: action,
            ),
        ],
      ),
    ),
  );
  return WidgetbookContractFrame(
    title: 'Person and conversation layouts in Field',
    contractId: 'catch.field',
    states: const [
      'directory',
      'directory-large-text',
      'roster',
      'roster-trailing',
      'chat-preview',
      'chat-preview-new',
      'chat-preview-unread',
      'chat-preview-square-avatar',
      'chat-context',
      'chat-typing',
      'contact-identity-only',
      'contact-navigable',
      'contact-message-enabled',
      'contact-verified',
      'long-copy',
    ],
    children: [
      preview(
        'directory',
        const CatchPersonLayout(
          name: 'Ananya Rao',
          supportingText: '8 events · Last seen 18 June',
          badges: [
            CatchRowBadge(label: 'Regular', tone: CatchBadgeTone.affinity),
          ],
        ),
      ),
      preview(
        'directory-large-text',
        const CatchPersonLayout(
          name: 'Ananya Rao with a longer family name',
          supportingText: '8 events · Last seen 18 June',
          context: 'Returning customer with complete contextual information',
          badges: [
            CatchRowBadge(
              label: 'Needs identity review',
              tone: CatchBadgeTone.warning,
            ),
          ],
        ),
        scale: 2,
      ),
      preview(
        'roster',
        const CatchPersonLayout(name: 'Riya', supportingText: '5:30 /km · 26'),
        read: true,
      ),
      preview(
        'roster-trailing',
        const CatchPersonLayout(name: 'Riya', supportingText: 'Checked in'),
        read: true,
        action: CatchFieldSecondaryAction.button(
          label: 'Undo check-in',
          onActivate: () {},
        ),
      ),
      preview(
        'chat-preview',
        const CatchConversationLayout(
          name: 'Riya',
          preview: 'See you Saturday!',
          timestamp: '2m',
        ),
      ),
      preview(
        'chat-preview-new',
        CatchConversationLayout(
          name: 'Riya',
          preview: 'You matched!',
          activityLabel: copy.newMatchLabel,
          activitySemantics: copy.newMatchLabel,
        ),
      ),
      preview(
        'chat-preview-unread',
        CatchConversationLayout(
          name: 'Riya',
          preview: 'See you Saturday!',
          timestamp: '2m',
          activityLabel: '2',
          activitySemantics: copy.unreadCountLabel(2),
        ),
      ),
      preview(
        'chat-preview-square-avatar',
        const CatchConversationLayout(
          name: 'Sunday Social',
          preview: 'We look forward to seeing you.',
          avatarShape: CatchAvatarVariant.square,
        ),
      ),
      preview(
        'chat-context',
        const CatchConversationLayout(
          name: 'Riya',
          preview: 'See you Saturday!',
          context: 'Bandra Breakers 7K',
        ),
      ),
      preview(
        'chat-typing',
        CatchConversationLayout(name: 'Riya', preview: copy.typingLabel),
      ),
      preview(
        'contact-identity-only',
        const CatchPersonLayout(name: 'Mira Shah'),
        read: true,
      ),
      preview(
        'contact-navigable',
        const CatchPersonLayout(
          name: 'Mira Shah',
          supportingText: 'Hosting since May 2026',
        ),
      ),
      preview(
        'contact-message-enabled',
        const CatchPersonLayout(name: 'Mira Shah'),
        action: CatchFieldSecondaryAction.command(
          label: 'Message Mira',
          icon: CatchIcons.chat,
          onActivate: () {},
        ),
      ),
      preview(
        'contact-verified',
        CatchPersonLayout(
          name: 'Mira Shah',
          badges: [
            CatchRowBadge(
              label: 'Owner verified',
              tone: CatchBadgeTone.success,
              icon: CatchIcons.verified,
            ),
          ],
        ),
      ),
      preview(
        'long-copy',
        const CatchConversationLayout(
          name: 'A person whose complete name must remain readable',
          preview:
              'A complete message preview with enough detail to wrap naturally across lines.',
          context: 'Sunday social at the neighbourhood garden',
        ),
        scale: 2,
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: NotificationRow,
  path: '[Core primitives]/Product composites',
)
Widget notificationRowContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'NotificationRow',
    contractId: 'catch.notification_row',
    states: const [
      'unread',
      'read',
      'with-body',
      'divider',
      'non-navigable',
      'long-copy',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'unread',
        child: _MessageFrame(
          child: NotificationRow(
            type: ActivityNotificationType.eventReminder,
            title: 'Event starts soon',
            time: '8m',
            body: 'Head to the south gate for check-in.',
            unread: true,
            onTap: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'read',
        child: _MessageFrame(
          child: NotificationRow(
            type: ActivityNotificationType.clubUpdate,
            title: 'Run club posted an update',
            time: '2h',
            body: 'Sunday route changed to the waterfront.',
            onTap: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-body',
        child: _MessageFrame(
          child: NotificationRow(
            type: ActivityNotificationType.match,
            title: 'You matched',
            time: 'now',
            body: 'Start with a specific note about the event.',
            unread: true,
            onTap: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'waitlist promotion',
        child: _MessageFrame(
          child: NotificationRow(
            type: ActivityNotificationType.waitlistPromotion,
            title: 'You are off the waitlist',
            time: '1d',
            onTap: widgetbookNoop,
          ),
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'non-navigable',
        child: _MessageFrame(
          child: NotificationRow(
            type: ActivityNotificationType.eventCancelled,
            title: 'Event cancelled',
            time: '3d',
            body: 'No action is available for this update.',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'long-copy',
        child: _MessageFrame(
          child: NotificationRow(
            type: ActivityNotificationType.eventUpdated,
            title:
                'A very long notification title that should wrap across lines',
            time: '11:42',
            body:
                'A long notification body should remain readable and avoid pushing the timestamp out of the row.',
            unread: true,
            onTap: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}

class _MessageFrame extends StatelessWidget {
  const _MessageFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return CatchSurface(
      width: WidgetbookPreviewLayout.wideContractWidth,
      tone: CatchSurfaceTone.surface,
      borderRole: CatchBorderRole.separator,
      padding: const EdgeInsets.symmetric(horizontal: CatchSpacing.s4),
      child: child,
    );
  }
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchTimestampedMessageText,
  path: '[Core primitives]/Data display',
)
Widget catchTimestampedMessageContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'Timestamped message',
    contractId: 'catch.timestamped_message',
    states: const [
      'inline-timestamp',
      'stacked-timestamp',
      'empty-message',
      'large-text',
    ],
    children: [
      for (final example in const [
        ('inline-timestamp', 'Hi!', '19:30', 240.0),
        ('stacked-timestamp', 'See you', '19:30', 80.0),
        ('empty-message', '', '19:30', 240.0),
      ])
        WidgetbookContractStateCard(
          label: example.$1,
          child: SizedBox(
            width: example.$4,
            child: CatchTimestampedMessageText(
              text: example.$2,
              timestamp: example.$3,
              textStyle: CatchTextStyles.bodyM(context),
              timestampStyle: CatchTextStyles.numericMeta(context),
            ),
          ),
        ),
    ],
  );
}

class _ChatComposerContractPreview extends StatefulWidget {
  const _ChatComposerContractPreview({
    this.initialText = '',
    this.sending = false,
    this.sendingImage = false,
    this.disabledReason,
    this.showImageButton = true,
    this.autofocus = false,
  });

  final String initialText;
  final bool sending;
  final bool sendingImage;
  final String? disabledReason;
  final bool showImageButton;
  final bool autofocus;

  @override
  State<_ChatComposerContractPreview> createState() =>
      _ChatComposerContractPreviewState();
}

class _ChatComposerContractPreviewState
    extends State<_ChatComposerContractPreview> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialText);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ChatInput(
      controller: _controller,
      sending: widget.sending,
      sendingImage: widget.sendingImage,
      disabledReason: widget.disabledReason,
      showImageButton: widget.showImageButton,
      autofocus: widget.autofocus,
      onSend: widget.disabledReason == null ? widgetbookNoop : null,
      onSendImage: widget.disabledReason == null ? widgetbookNoop : null,
    );
  }
}
