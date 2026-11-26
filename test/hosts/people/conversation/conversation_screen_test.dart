import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_drafts.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_pages_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_screen.dart';
import 'package:catch_dating_app/pages/inbox/chats_list_view_model.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'conversation_fixtures.dart';

class _Conversations extends Fake implements ConversationRepository {
  final sent = <({String endpoint, String body, String? operation})>[];
  final completion = Completer<void>();
  @override
  Future<void> sendTextMessage({
    required String conversationId,
    required String senderId,
    required String text,
    String? messageId,
  }) {
    sent.add((endpoint: conversationId, body: text, operation: messageId));
    return completion.future;
  }

  @override
  Future<void> markRead({
    required String conversationId,
    required String uid,
  }) async {}
}

class _Whatsapp extends Fake implements HostWhatsappRepository {
  final sent = <String>[];
  @override
  Future<void> sendWhatsappReply({
    required String organizerId,
    required HostWhatsappThreadDetail thread,
    required String body,
    required String idempotencyKey,
  }) async {
    sent.add(thread.threadId);
  }
}

void main() {
  Widget screen(
    _Conversations conversations,
    _Whatsapp whatsapp, {
    String detailUid = 'guest',
    bool validCatch = true,
  }) {
    final source = preview('source-id', 'guest');
    final drafts = HostReplyDrafts();
    addTearDown(drafts.dispose);
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('host')),
        watchEventsForOrganizerProvider(
          'org',
        ).overrideWithValue(const AsyncData(<Event>[])),
        hostInboxCatchViewModelProvider.overrideWithValue(
          AsyncData(
            ChatsListViewModel(
              newMatches: const [],
              conversations: [source],
              totalThreadCount: 1,
            ),
          ),
        ),
        hostWhatsappThreadPagesProvider('org').overrideWithBuild(
          (ref, notifier) => Stream.value(
            LivePages(
              items: [wa('wa-id', 'contact', uid: 'guest')],
              hasMore: false,
            ),
          ),
        ),
        matchStreamProvider('source-id').overrideWithValue(
          AsyncData(
            validCatch
                ? source.match
                : source.match.copyWith(organizerId: 'other'),
          ),
        ),
        conversationRepositoryProvider.overrideWithValue(conversations),
        hostWhatsappRepositoryProvider.overrideWithValue(whatsapp),
        watchConversationMessagesProvider('source-id').overrideWithValue(
          AsyncData([
            ChatMessage(
              id: 'same',
              senderId: 'guest',
              text: 'Catch history',
              sentAt: DateTime(2026, 9, 10),
            ),
          ]),
        ),
        hostPersonWhatsappDetailProvider('org', 'wa-id').overrideWithValue(
          AsyncData(
            HostWhatsappThreadDetail(
              organizerId: 'org',
              threadId: 'wa-id',
              contactId: 'contact',
              linkedUid: detailUid,
              displayName: 'Same name',
              lastInboundAt: DateTime.now(),
              serviceWindowExpiresAt: DateTime.now().add(
                const Duration(hours: 1),
              ),
              serviceWindowOpen: true,
              messagesTruncated: false,
              messages: [
                HostWhatsappMessage(
                  messageId: 'same',
                  direction: HostWhatsappMessageDirection.inbound,
                  body: 'WhatsApp history',
                  occurredAt: DateTime(2026, 9, 11),
                ),
              ],
            ),
          ),
        ),
      ],
    );
    addTearDown(container.dispose);
    return UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        theme: AppTheme.light,
        home: CatchRoot(
          child: HostConversationScreen(
            request: const HostConversationRequest(
              organizerId: 'org',
              selection: 'source-id',
              scope: HostInboxScope.general(),
            ),
            drafts: drafts,
            onBack: () {},
          ),
        ),
      ),
    );
  }

  Finder route(String label) =>
      find.byWidgetPredicate((w) => w is CatchChip && w.label == label);
  CatchComposerInput composer(WidgetTester tester) =>
      tester.widget<CatchComposerInput>(find.byType(CatchComposerInput));

  testWidgets(
    'person transcript retains source identity and sends on only the selected route',
    (tester) async {
      final conversations = _Conversations();
      final whatsapp = _Whatsapp();
      await tester.pumpWidget(screen(conversations, whatsapp));
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey('catch:source-id/same')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('whatsapp:wa-id/same')), findsOneWidget);
      expect(composer(tester).onSend, isNull);
      await tester.tap(route('Catch'));
      await pumpFeatureUi(tester);
      await tester.enterText(find.byType(EditableText), 'Catch draft');
      await tester.tap(route('WhatsApp'));
      await pumpFeatureUi(tester);
      expect(composer(tester).controller!.text, isEmpty);
      await tester.enterText(find.byType(EditableText), 'WhatsApp draft');
      await tester.tap(route('Catch'));
      await pumpFeatureUi(tester);
      expect(composer(tester).controller!.text, 'Catch draft');
      await tester.tap(find.byTooltip('Send message'));
      await tester.pump();
      expect(conversations.sent.single.endpoint, 'source-id');
      expect(conversations.sent.single.body, 'Catch draft');
      expect(conversations.sent.single.operation, isNotEmpty);
      expect(whatsapp.sent, isEmpty);
      expect(composer(tester).onSend, isNull);
      conversations.completion.complete();
      await pumpFeatureUi(tester);
      expect(composer(tester).controller!.text, isEmpty);
      await tester.tap(route('WhatsApp'));
      await pumpFeatureUi(tester);
      expect(composer(tester).controller!.text, 'WhatsApp draft');
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'revoked membership and a changed identity link cannot leak source history',
    (tester) async {
      await tester.pumpWidget(
        screen(
          _Conversations(),
          _Whatsapp(),
          detailUid: 'another',
          validCatch: false,
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.text('Catch history'), findsNothing);
      expect(find.text('WhatsApp history'), findsNothing);
      expect(route('Catch'), findsNothing);
      expect(route('WhatsApp'), findsNothing);
      expect(composer(tester).onSend, isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
