import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_body.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_drafts.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_screen.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_state.dart';
import 'package:catch_dating_app/pages/inbox/chats_list_view_model.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../preview_layout_contracts.dart';

const _path = '[P1 product surfaces]/Host/People/Conversation';
const _organizerId = 'preview-organizer';

final _sent = DateTime(2026, 10, 27, 18, 40);

final _person = HostInboxPerson(
  organizerId: _organizerId,
  personId: 'uid:guest',
  scope: const HostInboxScope.event('tonight'),
  booked: true,
  catchThreads: [
    ChatThreadPreview(
      match: Match(
        id: 'catch-1',
        user1Id: 'host',
        user2Id: 'guest',
        organizerId: _organizerId,
        conversationType: MatchConversationType.organizerHostInquiry,
        createdAt: DateTime(2026, 10, 20),
        eventIds: const ['tonight'],
      ),
      matchId: 'catch-1',
      otherUid: 'guest',
      displayName: 'Zoya Merchant',
      photoUrl: null,
      previewText: 'Can I bring my sister?',
      timestamp: _sent,
      unreadCount: 1,
      hasConversation: true,
      eventIds: const ['tonight'],
    ),
  ],
  whatsappThreads: const [],
);

final _ready = HostConversationState(
  status: HostConversationStatus.ready,
  person: _person,
  scope: const HostInboxScope.event('tonight'),
  eventTitle: 'Tuesday Trivia Night',
  routes: const [
    HostConversationRoute(
      key: 'catch:catch-1',
      channel: HostConversationChannel.catchApp,
      sourceId: 'catch-1',
      available: true,
    ),
    HostConversationRoute(
      key: 'whatsapp:wa-1',
      channel: HostConversationChannel.whatsapp,
      sourceId: 'wa-1',
      available: false,
    ),
  ],
  partial: true,
  older: const [HostConversationOlder(conversationId: 'catch-1')],
  messages: [
    HostConversationMessage(
      id: 'catch:catch-1/1',
      text: 'Hi! Is there parking near the venue?',
      mine: false,
      channel: HostConversationChannel.catchApp,
      sentAt: _sent,
    ),
    HostConversationMessage(
      id: 'whatsapp:wa-1/1',
      text: 'Yes, the lot behind the building is free after 7.',
      mine: true,
      channel: HostConversationChannel.whatsapp,
      sentAt: _sent.add(const Duration(minutes: 3)),
    ),
    HostConversationMessage(
      id: 'catch:catch-1/2',
      text: 'Can I bring my sister? She is visiting till Sunday.',
      mine: false,
      channel: HostConversationChannel.catchApp,
      sentAt: _sent.add(const Duration(minutes: 9)),
    ),
  ],
);

Widget _phone(Widget child) => SizedBox(
  width: WidgetbookPreviewLayout.phoneChromeWidth,
  height: WidgetbookPreviewLayout.hostEditorViewportHeight,
  child: CatchRoot(child: child),
);

Widget _body(
  HostConversationState state, {
  String? route,
  HostConversationPresentation presentation =
      HostConversationPresentation.screen,
}) => _phone(
  CatchScreen(
    bodyScrolls: false,
    body: HostConversationBody(
      state: state,
      composer: TextEditingController(),
      scroll: ScrollController(),
      presentation: presentation,
      selectedRoute: route,
      onBack: () {},
      onSelectRoute: (_) {},
      onSend: (_) {},
      onSendPhoto: () {},
      onLoadOlder: (_) {},
      onRetry: () {},
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Catch and WhatsApp in one history',
  type: HostConversationBody,
  path: _path,
)
Widget conversationReady(BuildContext context) =>
    _body(_ready, route: 'catch:catch-1');

@widgetbook.UseCase(
  name: 'Beside Messages, route closed',
  type: HostConversationBody,
  path: _path,
)
Widget conversationPane(BuildContext context) => _body(
  _ready,
  route: 'whatsapp:wa-1',
  presentation: HostConversationPresentation.pane,
);

@widgetbook.UseCase(
  name: 'Programme conversations unavailable',
  type: HostConversationBody,
  path: _path,
)
Widget conversationProgramme(BuildContext context) => _body(
  const HostConversationState(
    status: HostConversationStatus.programme,
    scope: HostInboxScope.program('programme'),
    programmeTitle: 'Aditi and Kabir',
  ),
  presentation: HostConversationPresentation.pane,
);

@widgetbook.UseCase(
  name: 'No longer available',
  type: HostConversationBody,
  path: _path,
)
Widget conversationUnavailable(BuildContext context) => _body(
  const HostConversationState(status: HostConversationStatus.unavailable),
);

@widgetbook.UseCase(
  name: 'Transcript, routes and composer',
  type: HostConversationThreadSection,
  path: _path,
)
Widget conversationThread(BuildContext context) => _phone(
  CatchScreen(
    bodyScrolls: false,
    body: HostConversationThreadSection(
      state: _ready,
      composer: TextEditingController(),
      scroll: ScrollController(),
      selectedRoute: null,
      sending: HostConversationSending.idle,
      onSelectRoute: (_) {},
      onSend: (_) {},
      onSendPhoto: () {},
      onLoadOlder: (_) {},
      onRetry: () {},
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Guest and host, sending',
  type: HostConversationMessageBubble,
  path: _path,
)
Widget conversationBubbles(BuildContext context) => SizedBox(
  width: WidgetbookPreviewLayout.phoneChromeWidth,
  child: CatchRoot(
    child: CatchStack(
      children: [
        HostConversationMessageBubble(
          message: _ready.messages.first,
          name: 'Zoya Merchant',
        ),
        const HostConversationMessageBubble(
          message: HostConversationMessage(
            id: 'pending',
            text: 'See you at 7:30.',
            mine: true,
            channel: HostConversationChannel.catchApp,
          ),
          name: 'Zoya Merchant',
        ),
      ],
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Programme scope',
  type: HostConversationScreen,
  path: _path,
)
Widget conversationScreen(BuildContext context) {
  const request = HostConversationRequest(
    organizerId: _organizerId,
    selection: 'uid:guest',
    scope: HostInboxScope.program('programme'),
  );
  return ProviderScope(
    overrides: [
      hostConversationControllerProvider(request).overrideWithValue(
        const HostConversationState(
          status: HostConversationStatus.programme,
          scope: HostInboxScope.program('programme'),
          programmeTitle: 'Aditi and Kabir',
        ),
      ),
    ],
    child: _phone(
      HostConversationScreen(
        request: request,
        drafts: HostReplyDrafts(),
        onBack: () {},
      ),
    ),
  );
}
