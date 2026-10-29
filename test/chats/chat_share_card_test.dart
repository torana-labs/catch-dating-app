import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_share_card.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('renders an anonymized activity-aware share card', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SizedBox(
            width: 390,
            child: ChatShareCard(
              messages: const [
                ChatMessage(
                  id: 'msg-1',
                  senderId: 'runner-2',
                  text: 'Still thinking about the dessert debate.',
                ),
                ChatMessage(
                  id: 'msg-2',
                  senderId: 'runner-1',
                  text: 'I am counting that as a win.',
                ),
              ],
              currentUid: 'runner-1',
              event: _event(activityKind: ActivityKind.dinner),
            ),
          ),
        ),
      ),
    );

    expect(find.text('MATCHED AFTER DINNER'), findsWidgets);
    expect(find.text('After dinner'), findsOneWidget);
    expect(
      find.text('Still thinking about the dessert debate.'),
      findsOneWidget,
    );
    expect(find.text('I am counting that as a win.'), findsOneWidget);
    expect(find.text('Taylor'), findsNothing);
    expect(find.text('Maya'), findsNothing);
    expect(find.textContaining('AM'), findsNothing);
  });

  test('hasShareableChatMessages ignores image-only messages', () {
    expect(
      hasShareableChatMessages(const [
        ChatMessage(id: 'msg-1', senderId: 'runner-1', text: ''),
      ]),
      isFalse,
    );
    expect(
      hasShareableChatMessages(const [
        ChatMessage(id: 'msg-1', senderId: 'runner-1', text: 'Hello'),
      ]),
      isTrue,
    );
  });
}

Event _event({required ActivityKind activityKind}) {
  return Event(
    id: 'event-1',
    clubId: 'club-1',
    startTime: DateTime(2026, 5, 29, 19),
    endTime: DateTime(2026, 5, 29, 21),
    meetingPoint: 'Gallery',
    meetingLocation: const EventMeetingLocation(
      name: 'Gallery',
      latitude: 19.0596,
      longitude: 72.8295,
    ),
    startingPointLat: 19.0596,
    startingPointLng: 72.8295,
    eventFormat: EventFormatSnapshot.fromActivityKind(activityKind),
    distanceKm: 0,
    pace: PaceLevel.easy,
    capacityLimit: 12,
    description: 'A small singles event.',
    priceInPaise: 0,
  );
}
