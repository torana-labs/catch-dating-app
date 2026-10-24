import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/chats/presentation/chat_conversation_context.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_event_context_copy.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_event_context_header.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('renders an activity-aware dinner context stamp', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: ChatEventContextHeader(
            event: _event(activityKind: ActivityKind.dinner),
          ),
        ),
      ),
    );

    expect(find.text('MATCHED AFTER DINNER'), findsOneWidget);
    expect(find.text('Friday Evening Dinner · Fri 29 May'), findsOneWidget);
    final contextTitle = tester.widget<Text>(
      find.text('Friday Evening Dinner · Fri 29 May'),
    );
    expect(contextTitle.style!.fontWeight, FontWeight.w500);
    expect(contextTitle.maxLines, 1);
    expect(contextTitle.overflow, TextOverflow.ellipsis);
  });

  testWidgets('renders a neutral fallback stamp while event context loads', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(body: ChatEventContextHeader(event: null)),
      ),
    );

    expect(find.text('MATCHED THROUGH CATCH'), findsOneWidget);
    expect(find.text('the same event'), findsOneWidget);
  });

  testWidgets('uses event-question framing for a contacted host', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: ChatEventContextHeader(
            event: _event(activityKind: ActivityKind.dinner),
            conversationContext: ChatConversationContext.contactedHost,
          ),
        ),
      ),
    );

    expect(find.text('EVENT QUESTION'), findsOneWidget);
    expect(find.text('MATCHED AFTER DINNER'), findsNothing);
  });

  test(
    'empty inquiry copy branches on viewer role without dating language',
    () {
      final event = _event(activityKind: ActivityKind.dinner);

      expect(
        chatEmptyThreadMessageFor(
          event: event,
          otherName: 'Mira',
          conversationContext: ChatConversationContext.contactedHost,
        ),
        'Ask Mira about Friday Evening Dinner.',
      );
      expect(
        chatEmptyThreadMessageFor(
          event: event,
          otherName: 'Aarav',
          conversationContext: ChatConversationContext.attendeeInquiry,
        ),
        'Reply to Aarav about Friday Evening Dinner.',
      );
    },
  );
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
