import 'dart:async';

import 'package:catch_dating_app/chats/presentation/widgets/chat_input.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_people.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_person_conversation_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_person_conversation_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_reply_drafts.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';
import 'host_inbox_test_fixtures.dart';

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
    HostReplyDrafts drafts,
    _Conversations conversations,
    _Whatsapp whatsapp, {
    String detailUid = 'guest',
    bool validCatch = true,
  }) {
    final source = preview('source-id', 'guest');
    final person = composeHostInboxPeople(
      organizerId: 'org',
      scope: const HostInboxScope.general(),
      segment: HostInboxAudienceSegment.booked,
      catchThreads: [source],
      whatsappThreads: [wa('wa-id', 'contact', uid: 'guest')],
      participations: null,
    ).people.single;
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('host')),
        matchStreamProvider('source-id').overrideWithValue(
          AsyncData(
            validCatch ? source.match : source.match.copyWith(clubId: 'other'),
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
        home: Scaffold(
          body: HostPersonConversationPageBody(
            person: person,
            scope: const HostInboxScope.general(),
            drafts: drafts,
          ),
        ),
      ),
    );
  }

  Finder route(String label) =>
      find.byWidgetPredicate((w) => w is CatchButton && w.label == label);

  testWidgets(
    'person transcript retains source identity and sends on only the selected route',
    (tester) async {
      final drafts = HostReplyDrafts();
      addTearDown(drafts.dispose);
      final conversations = _Conversations();
      final whatsapp = _Whatsapp();
      await tester.pumpWidget(screen(drafts, conversations, whatsapp));
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey('catch:source-id/same')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('whatsapp:wa-id/same')), findsOneWidget);
      expect(tester.widget<ChatInput>(find.byType(ChatInput)).onSend, isNull);
      await tester.tap(route('Catch'));
      await pumpFeatureUi(tester);
      await tester.enterText(find.byType(EditableText), 'Catch draft');
      await tester.tap(route('WhatsApp'));
      await pumpFeatureUi(tester);
      expect(
        tester.widget<ChatInput>(find.byType(ChatInput)).controller.text,
        isEmpty,
      );
      await tester.enterText(find.byType(EditableText), 'WhatsApp draft');
      await tester.tap(route('Catch'));
      await pumpFeatureUi(tester);
      expect(
        tester.widget<ChatInput>(find.byType(ChatInput)).controller.text,
        'Catch draft',
      );
      await tester.tap(find.byKey(ChatInput.sendButtonKey));
      await pumpUntilFound(
        tester,
        find.byWidgetPredicate((w) => w is ChatInput && w.sending),
      );
      expect(conversations.sent.single.endpoint, 'source-id');
      expect(conversations.sent.single.body, 'Catch draft');
      expect(conversations.sent.single.operation, isNotEmpty);
      expect(whatsapp.sent, isEmpty);
      expect(tester.widget<ChatInput>(find.byType(ChatInput)).sending, isTrue);
      conversations.completion.complete();
      await pumpFeatureUi(tester);
      expect(
        tester.widget<ChatInput>(find.byType(ChatInput)).controller.text,
        isEmpty,
      );
      await tester.tap(route('WhatsApp'));
      await pumpFeatureUi(tester);
      expect(
        tester.widget<ChatInput>(find.byType(ChatInput)).controller.text,
        'WhatsApp draft',
      );
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'revoked membership and a changed identity link cannot leak source history',
    (tester) async {
      final drafts = HostReplyDrafts();
      addTearDown(drafts.dispose);
      await tester.pumpWidget(
        screen(
          drafts,
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
      expect(tester.widget<ChatInput>(find.byType(ChatInput)).onSend, isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
