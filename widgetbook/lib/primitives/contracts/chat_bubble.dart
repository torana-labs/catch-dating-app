import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

// The system ChatMessage: one message in a chat, by sender.

Widget _state(
  BuildContext context, {
  required String label,
  required String description,
  required Widget child,
}) => WidgetbookContractStateCard(
  label: label,
  description: description,
  child: SizedBox(
    width: WidgetbookPreviewLayout.standardContractWidth,
    child: CatchRoot(
      theme: widgetbookThemeOf(context),
      format: CatchFormat.run,
      child: child,
    ),
  ),
);

const _avatar = CatchAvatar(size: CatchChatBubble.leadingWidth, name: 'Tara');

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchChatBubble,
  path: '[Core primitives]/Feedback',
)
Widget catchChatBubbleContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchChatBubble',
    contractId: 'catch.chat_bubble',
    states: const ['mine', 'theirs', 'host', 'system', 'status', 'continued'],
    children: [
      _state(
        context,
        label: 'mine',
        description:
            'The viewer, in ink at the end: an offer sent on '
            'WhatsApp.',
        child: const CatchChatBubble(
          text:
              'Hi Tara! There is a place for you on the Sunday run. '
              'Book here: catchdates.com/o/4fk2',
          variant: CatchChatBubbleVariant.mine,
          time: '7:12 PM',
        ),
      ),
      _state(
        context,
        label: 'theirs',
        description: 'Someone else, in grey after their avatar.',
        child: const CatchChatBubble(
          text: 'Can I bring my sister? She is visiting till Sunday.',
          time: '7:14 PM',
          leading: _avatar,
        ),
      ),
      _state(
        context,
        label: 'host',
        description: 'The host, in the event colour across the width.',
        child: const CatchChatBubble(
          text: 'Doors open at 7:30. Teams of four, two rounds.',
          variant: CatchChatBubbleVariant.host,
          format: CatchFormat.games,
          time: '6:02 PM',
        ),
      ),
      _state(
        context,
        label: 'system',
        description: 'A centred muted line from the app.',
        child: const CatchChatBubble(
          text: 'Kabir joined the chat',
          variant: CatchChatBubbleVariant.system,
        ),
      ),
      _state(
        context,
        label: 'status',
        description: 'Sending, sent, read and failed under the bubble.',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final status in CatchChatBubbleStatus.values)
              CatchChatBubble(
                text: 'See you there',
                variant: CatchChatBubbleVariant.mine,
                status: status,
                time: '7:20 PM',
              ),
          ],
        ),
      ),
      _state(
        context,
        label: 'continued',
        description: 'A follow-on message keeps the avatar column empty.',
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchChatBubble(text: 'Running late', leading: _avatar),
            CatchChatBubble(
              text: 'Ten minutes',
              leading: _avatar,
              continued: true,
              time: '7:31 PM',
            ),
          ],
        ),
      ),
    ],
  );
}
