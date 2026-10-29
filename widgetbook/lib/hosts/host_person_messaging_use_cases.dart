import 'package:catch_dating_app/chats/presentation/chat_controller.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_communication_plan.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_people.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_person_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_new_message_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_person_conversation_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_person_conversation_menu.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_person_conversation_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_reply_drafts.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

@widgetbook.UseCase(
  name: 'Choose a person',
  type: HostNewMessageScreen,
  path: '[P1 product surfaces]/Host/Inbox/Person',
)
Widget newMessagePersonPreview(BuildContext context) =>
    const _MessageFixture(view: _View.directory);

@widgetbook.UseCase(
  name: 'Explicit available route',
  type: HostNewMessageRouteSection,
  path: '[P1 product surfaces]/Host/Inbox/Person',
)
Widget newMessageRoutePreview(BuildContext context) =>
    const _MessageFixture(view: _View.routes);

@widgetbook.UseCase(
  name: 'Catch and WhatsApp in one history',
  type: HostPersonConversationPageBody,
  path: '[P1 product surfaces]/Host/Inbox/Person',
)
Widget personConversationPreview(BuildContext context) =>
    const _MessageFixture(view: _View.conversation);

@widgetbook.UseCase(
  name: 'Selected person in workspace',
  type: HostInboxPersonPageBody,
  path: '[P1 product surfaces]/Host/Inbox/Person',
)
Widget selectedPersonPreview(BuildContext context) =>
    const _MessageFixture(view: _View.selected);

@widgetbook.UseCase(
  name: 'Authorized conversation actions',
  type: HostPersonConversationMenu,
  path: '[P1 product surfaces]/Host/Inbox/Person',
)
Widget personConversationMenuPreview(BuildContext context) =>
    const _MessageFixture(view: _View.conversation);

enum _View { directory, routes, conversation, selected }

class _MessageFixture extends StatefulWidget {
  const _MessageFixture({required this.view});
  final _View view;
  @override
  State<_MessageFixture> createState() => _MessageFixtureState();
}

class _MessageFixtureState extends State<_MessageFixture> {
  final drafts = HostReplyDrafts();
  @override
  void dispose() {
    drafts.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final match = Match(
      id: 'catch-person',
      user1Id: 'host',
      user2Id: 'person',
      clubId: 'org',
      conversationType: MatchConversationType.clubHostInquiry,
      createdAt: now,
      eventIds: const [],
    );
    final thread = ChatThreadPreview(
      match: match,
      matchId: match.id,
      otherUid: 'person',
      displayName: 'Riya Mehta',
      photoUrl: null,
      previewText: 'See you on Sunday!',
      timestamp: now,
      unreadCount: 0,
      hasConversation: true,
      eventIds: const [],
    );
    final whatsapp = HostWhatsappThreadSummary(
      threadId: 'wa-person',
      contactId: 'contact',
      linkedUid: 'person',
      displayName: 'Riya Mehta',
      eventIds: const [],
      lastMessageBody: 'Is there parking nearby?',
      lastMessageDirection: HostWhatsappMessageDirection.inbound,
      lastMessageAt: now,
      lastInboundAt: now,
      serviceWindowExpiresAt: now.add(const Duration(hours: 1)),
      serviceWindowOpen: true,
    );
    final person = composeHostInboxPeople(
      organizerId: 'org',
      scope: const HostInboxScope.general(),
      segment: HostInboxAudienceSegment.booked,
      catchThreads: [thread],
      whatsappThreads: [whatsapp],
      participations: null,
    ).people.single;
    return ProviderScope(
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('host')),
        watchEventsForClubProvider(
          'org',
        ).overrideWithValue(const AsyncData([])),
        chatsListViewModelProvider.overrideWithValue(
          AsyncData(
            ChatsListViewModel(
              newMatches: const [],
              conversations: [thread],
              totalThreadCount: 1,
            ),
          ),
        ),
        matchStreamProvider(match.id).overrideWithValue(AsyncData(match)),
        conversationRepositoryProvider.overrideWithValue(
          _PreviewConversations(),
        ),
        chatControllerProvider.overrideWith(() => _PreviewChatController()),
        hostWhatsappRepositoryProvider.overrideWithValue(_PreviewWhatsapp()),
        watchConversationMessagesProvider(match.id).overrideWithValue(
          AsyncData([
            ChatMessage(
              id: 'catch-message',
              senderId: 'person',
              text: 'See you on Sunday!',
              sentAt: now.subtract(const Duration(minutes: 10)),
            ),
          ]),
        ),
        hostWhatsappThreadsProvider('org').overrideWithValue(
          AsyncData(
            HostWhatsappThreadPage(
              organizerId: 'org',
              threads: [whatsapp],
              nextCursor: null,
            ),
          ),
        ),
        hostPersonWhatsappDetailProvider('org', 'wa-person').overrideWithValue(
          AsyncData(
            HostWhatsappThreadDetail(
              organizerId: 'org',
              threadId: 'wa-person',
              contactId: 'contact',
              linkedUid: 'person',
              displayName: 'Riya Mehta',
              lastInboundAt: now,
              serviceWindowExpiresAt: now.add(const Duration(hours: 1)),
              serviceWindowOpen: true,
              messagesTruncated: false,
              messages: [
                HostWhatsappMessage(
                  messageId: 'wa-message',
                  direction: HostWhatsappMessageDirection.inbound,
                  body: 'Is there parking nearby?',
                  occurredAt: now.subtract(const Duration(minutes: 2)),
                ),
              ],
            ),
          ),
        ),
        hostCustomersDirectoryControllerProvider.overrideWith2(
          (_) => _PreviewDirectory(),
        ),
        hostCustomersControllerProvider.overrideWithValue(
          _PreviewCustomerActions(),
        ),
        hostCommunicationPlanProvider('org', 'contact').overrideWithValue(
          AsyncData(
            HostCommunicationPlan(
              organizerId: 'org',
              intent: HostCommunicationIntent.individualConversation,
              capabilityVersion: 1,
              resolvedAt: now,
              recipients: [
                HostCommunicationRecipientPlan(
                  contactId: 'contact',
                  displayName: 'Riya Mehta',
                  outcome: HostCommunicationOutcome.inCatch,
                  recommendedRouteId: HostCommunicationRouteId.catchChat,
                  routes: const [
                    HostCommunicationRouteOption(
                      blocker: null,
                      routeId: HostCommunicationRouteId.catchChat,
                      executionMode:
                          HostCommunicationExecutionMode.managedDelivery,
                      availability:
                          HostCommunicationRouteAvailability.available,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
      child: SizedBox(
        width: 402,
        height: 874,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: AppTheme.dark,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: switch (widget.view) {
            _View.directory => const HostNewMessageScreen(organizerId: 'org'),
            _View.routes => Scaffold(
              body: SafeArea(
                child: HostNewMessageRouteSection(
                  organizerId: 'org',
                  contactId: 'contact',
                  name: 'Riya Mehta',
                  opening: false,
                  onStartCatch: () {},
                ),
              ),
            ),
            _View.conversation => Scaffold(
              body: SafeArea(
                child: HostPersonConversationPageBody(
                  person: person,
                  scope: const HostInboxScope.general(),
                  drafts: drafts,
                ),
              ),
            ),
            _View.selected => Scaffold(
              body: SafeArea(
                child: HostInboxPersonPageBody(
                  organizerId: 'org',
                  selection: 'catch-person',
                  scope: const HostInboxScope.general(),
                  now: now,
                  segment: HostInboxAudienceSegment.booked,
                  drafts: drafts,
                  onBack: () {},
                ),
              ),
            ),
          },
        ),
      ),
    );
  }
}

class _PreviewDirectory extends HostCustomersDirectoryController {
  @override
  Future<HostCustomersDirectoryState> build(
    HostCustomersDirectoryRequest request,
  ) async => HostCustomersDirectoryState(
    contacts: 'riya mehta'.contains((request.search ?? '').toLowerCase())
        ? const [
            HostCustomerDirectoryContact(
              contactId: 'contact',
              displayName: 'Riya Mehta',
              attendedEventCount: 2,
              lastAttendedAt: null,
              tags: {},
              hasAmbiguousIdentity: false,
              whatsappOptedIn: false,
              whatsappAdminSuppressed: false,
            ),
          ]
        : const [],
    nextCursor: null,
    matchCount: 1,
    matchCountCoverage: HostCustomerMatchCountCoverage.exact,
    sourceCoverage: HostCustomerDirectoryCoverage.exact,
    projectionVersion: 1,
  );
}

class _PreviewCustomerActions implements HostCustomersController {
  @override
  Future<String> startConversation({
    required String organizerId,
    required String contactId,
  }) async => 'catch-person';
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnsupportedError('Offline preview');
}

class _PreviewConversations implements ConversationRepository {
  @override
  Future<void> markRead({
    required String conversationId,
    required String uid,
  }) async {}
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnsupportedError('Offline preview: no delivery');
}

class _PreviewWhatsapp implements HostWhatsappRepository {
  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnsupportedError('Offline preview: no delivery');
}

class _PreviewChatController extends ChatController {
  @override
  Future<void> blockUser({required String targetUserId}) async {}
  @override
  Future<void> reportUser({
    required String targetUserId,
    required String matchId,
  }) async {}
}
