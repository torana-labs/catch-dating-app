import 'package:catch_dating_app/chats/presentation/widgets/chat_message_list.dart';
import 'package:catch_dating_app/chats/presentation/widgets/message_bubble.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('renders message text and formatted time', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: MessageBubble(
            text: 'Morning event?',
            isMe: true,
            sentAt: DateTime(2026, 4, 23, 9, 5),
          ),
        ),
      ),
    );

    expect(find.byType(CatchTimestampedMessageText), findsOneWidget);

    expect(find.text('Morning event?'), findsOneWidget);
    expect(find.text('9:05 AM'), findsOneWidget);
  });

  testWidgets('keeps timestamp inline when the final line has room', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SizedBox(
            width: 390,
            child: MessageBubble(
              text: 'Coffee?',
              isMe: true,
              sentAt: DateTime(2026, 4, 23, 9, 5),
            ),
          ),
        ),
      ),
    );

    final messageRect = tester.getRect(find.text('Coffee?'));
    final timestampRect = tester.getRect(find.text('9:05 AM'));

    expect(timestampRect.top, lessThan(messageRect.bottom));
    expect(timestampRect.bottom, greaterThan(messageRect.top));
  });

  testWidgets('right-aligns stacked timestamp for incoming messages', (
    tester,
  ) async {
    const message =
        'This is long enough that the timestamp needs its own line inside the bubble.';

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SizedBox(
            width: 260,
            child: MessageBubble(
              text: message,
              isMe: false,
              sentAt: DateTime(2026, 4, 23, 9, 5),
            ),
          ),
        ),
      ),
    );

    final messageRight = tester.getTopRight(find.text(message)).dx;
    final timestampRight = tester.getTopRight(find.text('9:05 AM')).dx;

    expect(timestampRight, closeTo(messageRight, 1));
  });

  testWidgets('removes the outgoing tail before the final bubble in a group', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: MessageBubble(
            text: 'First thought.',
            isMe: true,
            sentAt: DateTime(2026, 4, 23, 9, 5),
            isLastInGroup: false,
          ),
        ),
      ),
    );

    final container = tester.widget<AnimatedContainer>(
      find.byType(AnimatedContainer),
    );
    final decoration = container.decoration! as BoxDecoration;
    final borderRadius = decoration.borderRadius! as BorderRadius;

    expect(borderRadius.bottomRight, const Radius.circular(CatchRadius.lg));
  });

  testWidgets('uses tighter vertical rhythm inside same-sender groups', (
    tester,
  ) async {
    final scrollController = ScrollController();
    addTearDown(scrollController.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SizedBox(
            width: 390,
            height: 500,
            child: ChatMessageList(
              messagesAsync: AsyncData([
                ChatMessage(
                  id: 'msg-1',
                  senderId: 'runner-2',
                  text: 'First thought.',
                  sentAt: DateTime(2026, 5, 8, 14, 48),
                ),
                ChatMessage(
                  id: 'msg-2',
                  senderId: 'runner-2',
                  text: 'Second thought.',
                  sentAt: DateTime(2026, 5, 8, 14, 49),
                ),
                ChatMessage(
                  id: 'msg-3',
                  senderId: 'runner-1',
                  text: 'Reply.',
                  sentAt: DateTime(2026, 5, 8, 14, 55),
                ),
              ]),
              currentUid: 'runner-1',
              otherName: 'Yash',
              scrollController: scrollController,
            ),
          ),
        ),
      ),
    );

    await tester.pump();

    final sameSenderGap =
        tester.getTopLeft(find.text('Second thought.')).dy -
        tester.getBottomLeft(find.text('First thought.')).dy;
    final speakerChangeGap =
        tester.getTopLeft(find.text('Reply.')).dy -
        tester.getBottomLeft(find.text('Second thought.')).dy;

    expect(sameSenderGap, lessThan(speakerChangeGap));
  });

  testWidgets('message list gives multi-line bubbles enough height', (
    tester,
  ) async {
    final scrollController = ScrollController();
    addTearDown(scrollController.dispose);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.dark,
        home: Scaffold(
          body: SizedBox(
            width: 390,
            height: 500,
            child: ChatMessageList(
              messagesAsync: AsyncData([
                ChatMessage(
                  id: 'msg-1',
                  senderId: 'runner-2',
                  text: 'That Indore route was fun.\nSame pace next time?',
                  sentAt: DateTime(2026, 5, 8, 14, 48),
                ),
                ChatMessage(
                  id: 'msg-2',
                  senderId: 'runner-1',
                  text: 'Definitely. I liked the last 2 km push.',
                  sentAt: DateTime(2026, 5, 8, 14, 55),
                ),
                ChatMessage(
                  id: 'msg-3',
                  senderId: 'runner-2',
                  text: 'Coffee after the weekend event?',
                  sentAt: DateTime(2026, 5, 8, 15, 2),
                ),
              ]),
              currentUid: 'runner-1',
              otherName: 'Yash',
              scrollController: scrollController,
            ),
          ),
        ),
      ),
    );

    await tester.pump();

    final firstTimestampBottom = tester.getBottomLeft(find.text('2:48 PM')).dy;
    final secondMessageTop = tester
        .getTopLeft(find.text('Definitely. I liked the last 2 km push.'))
        .dy;
    final secondTimestampBottom = tester
        .getBottomRight(find.text('2:55 PM'))
        .dy;
    final thirdMessageTop = tester
        .getTopLeft(find.text('Coffee after the weekend event?'))
        .dy;

    expect(firstTimestampBottom, lessThan(secondMessageTop));
    expect(secondTimestampBottom, lessThan(thirdMessageTop));
    expect(tester.takeException(), isNull);
  });
}
