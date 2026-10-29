import 'package:catch_dating_app/chats/presentation/event_chat_participants_controller.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_participants_screen.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_participant.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/widgetbook_harness.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Current event participants',
  type: EventChatParticipantsScreen,
  path: '[P3 utility surfaces]/Event chat',
)
Widget eventChatParticipantsPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: WidgetbookFixtureScope(
        overrides: [
          eventChatParticipantsControllerProvider(
            'preview-event',
          ).overrideWith(_Participants.new),
        ],
        child: const EventChatParticipantsScreen(eventId: 'preview-event'),
      ),
    );

@widgetbook.UseCase(
  name: 'People and their shared event profiles',
  type: EventChatParticipantsRowList,
  path: '[P3 utility surfaces]/Event chat',
)
Widget eventChatParticipantsListPreview(BuildContext context) =>
    WidgetbookUtilityDeviceFrame(
      child: CatchRouteScaffold(
        topBarBuilder: (_, _) => const CatchTopBar.route(title: 'Participants'),
        body: CatchRouteBody.standardConstrained(
          child: EventChatParticipantsRowList(
            state: _state(),
            onOpen: (_) {},
            onLoadMore: () {},
          ),
        ),
      ),
    );
EventChatParticipantsState _state() => EventChatParticipantsState(
  uid: 'host',
  page: EventChatParticipantPage(
    items: const [
      EventChatParticipant(uid: 'host', displayName: 'Maya Demo', isHost: true),
      EventChatParticipant(
        uid: 'sara',
        displayName: 'Sara RSVP Demo',
        isHost: false,
      ),
      EventChatParticipant(
        uid: 'arjun',
        displayName: 'Arjun Demo',
        isHost: false,
      ),
    ],
    nextCursor: null,
  ),
);

class _Participants extends EventChatParticipantsController {
  @override
  Future<EventChatParticipantsState> build(String eventId) async => _state();
  @override
  void setForeground(bool value) {}
  @override
  Future<void> refresh() async {}
  @override
  Future<void> loadMore() async {}
}
