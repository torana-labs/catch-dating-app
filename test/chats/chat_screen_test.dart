// size-exemption: pre-existing; split before it grows further.
import 'dart:async';

import 'package:catch_dating_app/chats/presentation/chat_read_marker_controller.dart';
import 'package:catch_dating_app/chats/presentation/chat_read_marker_state.dart';
import 'package:catch_dating_app/chats/presentation/chat_route_state.dart';
import 'package:catch_dating_app/chats/presentation/chat_route_view_model.dart';
import 'package:catch_dating_app/chats/presentation/chat_screen.dart';
import 'package:catch_dating_app/chats/presentation/chat_scroll_coordinator.dart';
import 'package:catch_dating_app/chats/presentation/chat_thread_action_controller.dart';
import 'package:catch_dating_app/chats/presentation/chat_thread_lookup_state.dart';
import 'package:catch_dating_app/chats/presentation/host_chat_screen_state.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_input.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/messaging/domain/suvbot_action_item.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';
import 'chat_screen_conversation_repository.dart';

part 'chat_screen_suvbot_tests.dart';

class FakeMatchRepository extends Fake implements MatchRepository {
  FakeMatchRepository({this.match, this.matchStream});

  Match? match;
  final Stream<Match?> Function()? matchStream;
  int watchMatchCalls = 0;

  @override
  Future<void> resetUnread({
    required String matchId,
    required String uid,
  }) async {}

  @override
  Stream<Match?> watchMatch({required String matchId}) {
    watchMatchCalls += 1;
    return matchStream?.call() ?? Stream.value(match);
  }

  @override
  Stream<List<Match>> watchMatchesForUser({required String uid}) =>
      const Stream.empty();
}

class FakeSuvbotRepository implements SuvbotRepository {
  final calls = <({String actionId, String? text})>[];
  final actions = const [
    SuvbotActionItem(
      id: 'refreshDemoState',
      label: 'Refresh demo state',
      description: 'Clear demo state and warm it again.',
      icon: 'refresh',
      destructive: true,
    ),
    SuvbotActionItem(
      id: 'checkDemoState',
      label: 'Check setup',
      description: 'Show seeded state.',
      icon: 'check',
    ),
    SuvbotActionItem(
      id: 'help',
      label: 'Help',
      description: 'Explain Suvbot controls.',
      icon: 'help',
    ),
    SuvbotActionItem(
      id: 'warmSignupState',
      label: 'Warm signups',
      description: 'Create signup state.',
      icon: 'event',
    ),
    SuvbotActionItem(
      id: 'warmPostEventState',
      label: 'Warm post-event',
      description: 'Create post-event state.',
      icon: 'flag',
    ),
    SuvbotActionItem(
      id: 'warmChatState',
      label: 'Warm chats',
      description: 'Create chat state.',
      icon: 'chat',
    ),
    SuvbotActionItem(
      id: 'warmPaymentState',
      label: 'Warm payments',
      description: 'Create payment state.',
      icon: 'payment',
    ),
    SuvbotActionItem(
      id: 'matchTesterByPhone',
      label: 'Match tester',
      description: 'Create a tester match.',
      icon: 'personAdd',
      requiresText: true,
    ),
    SuvbotActionItem(
      id: 'resetChats',
      label: 'Reset chats',
      description: 'Delete demo chat state.',
      icon: 'chatReset',
      destructive: true,
    ),
    SuvbotActionItem(
      id: 'resetBookings',
      label: 'Reset bookings',
      description: 'Delete demo bookings.',
      icon: 'eventReset',
      destructive: true,
    ),
    SuvbotActionItem(
      id: 'resetNotifications',
      label: 'Reset alerts',
      description: 'Delete demo alerts.',
      icon: 'notifications',
      destructive: true,
    ),
    SuvbotActionItem(
      id: 'clearDemoState',
      label: 'Fresh start',
      description: 'Delete demo state.',
      icon: 'clean',
      destructive: true,
    ),
  ];

  @override
  Future<List<SuvbotActionItem>> fetchActions() async => actions;

  @override
  Future<void> requestAction({required String actionId, String? text}) async {
    calls.add((actionId: actionId, text: text));
  }
}

class FakeSafetyRepository extends Fake implements SafetyRepository {
  FakeSafetyRepository({this.failReports = false, this.failBlocks = false});

  final bool failReports;
  final bool failBlocks;
  final reportCalls = <({String targetUserId, String? contextId})>[];
  final blockCalls = <String>[];

  @override
  Future<void> reportUser({
    required String targetUserId,
    String source = 'profile',
    String? reasonCode,
    String? contextId,
    String? notes,
  }) async {
    reportCalls.add((targetUserId: targetUserId, contextId: contextId));
    if (failReports) {
      throw StateError('report failed');
    }
  }

  @override
  Future<void> blockUser({
    required String targetUserId,
    String source = 'profile',
  }) async {
    blockCalls.add(targetUserId);
    if (failBlocks) {
      throw StateError('block failed');
    }
  }
}

class FakeChatSafetyActionRunner implements ChatSafetyActionRunner {
  FakeChatSafetyActionRunner({
    this.failReports = false,
    this.failBlocks = false,
  });

  bool failReports;
  bool failBlocks;
  final reportCalls = <String>[];
  final blockCalls = <String>[];

  @override
  Future<void> reportUser({required String targetUserId}) async {
    reportCalls.add(targetUserId);
    if (failReports) {
      throw StateError('report failed');
    }
  }

  @override
  Future<void> blockUser({required String targetUserId}) async {
    blockCalls.add(targetUserId);
    if (failBlocks) {
      throw StateError('block failed');
    }
  }
}

Match buildMatch({
  String id = 'match-1',
  String user1Id = 'runner-1',
  String user2Id = 'runner-2',
  DateTime? createdAt,
  DateTime? lastMessageAt,
  String? lastMessagePreview,
  String? lastMessageSenderId,
  List<String> eventIds = const ['event-1'],
  Map<String, int> unreadCounts = const {},
  MatchStatus status = MatchStatus.active,
  MatchConversationType conversationType = MatchConversationType.match,
  String? organizerId,
  DateTime? eventPlanExpiresAt,
}) {
  return Match(
    id: id,
    user1Id: user1Id,
    user2Id: user2Id,
    eventIds: eventIds,
    createdAt: createdAt ?? DateTime(2026, 4, 23, 9),
    lastMessageAt: lastMessageAt,
    lastMessagePreview: lastMessagePreview,
    lastMessageSenderId: lastMessageSenderId,
    unreadCounts: unreadCounts,
    status: status,
    conversationType: conversationType,
    organizerId: organizerId,
    eventPlanExpiresAt: eventPlanExpiresAt,
  );
}

ChatMessage buildMessage({
  String id = 'msg-1',
  String senderId = 'runner-1',
  String text = 'Hello there',
  DateTime? sentAt,
}) {
  return ChatMessage(
    id: id,
    senderId: senderId,
    text: text,
    sentAt: sentAt ?? DateTime(2026, 4, 23, 10),
  );
}

Future<void> pumpConsumerMatchChat(
  WidgetTester tester, {
  FakeConversationRepository? conversationRepository,
  FakeSafetyRepository? safetyRepository,
  String? initialDraftText,
  ValueChanged<String>? onDraftChanged,
}) async {
  final effectiveConversationRepository =
      conversationRepository ?? FakeConversationRepository();
  final otherProfile = buildPublicProfile(uid: 'runner-2', name: 'Taylor');

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        matchRepositoryProvider.overrideWithValue(
          FakeMatchRepository(match: buildMatch()),
        ),
        conversationRepositoryProvider.overrideWithValue(
          effectiveConversationRepository,
        ),
        if (safetyRepository != null)
          safetyRepositoryProvider.overrideWith((ref) => safetyRepository),
        watchEventProvider('event-1').overrideWith((ref) => Stream.value(null)),
        watchPublicProfileProvider(
          'runner-2',
        ).overrideWith((ref) => Stream.value(otherProfile)),
      ],
      child: CatchNoticeTestApp(
        theme: AppTheme.light,
        home: ChatScreen(
          matchId: 'match-1',
          otherProfile: otherProfile,
          initialDraftText: initialDraftText,
          onDraftChanged: onDraftChanged,
        ),
      ),
    ),
  );

  await pumpFeatureUi(tester);
}

const _emptyMessagesAsync = AsyncData<List<ChatMessage>>(<ChatMessage>[]);
const _emptySuvbotActionsAsync = AsyncData<List<SuvbotActionItem>>(
  <SuvbotActionItem>[],
);

HostChatScreenState _hostChatState({
  required String matchId,
  required String? uid,
  required AsyncValue<Match?> matchAsync,
  required AsyncValue<List<ChatMessage>> messagesAsync,
  required AsyncValue<List<SuvbotActionItem>> suvbotActionsAsync,
  required PublicProfile? profile,
  required OrganizerHostProfile? hostProfile,
  bool reportUserPending = false,
  bool blockUserPending = false,
  DateTime? now,
}) {
  return HostChatScreenState.resolve(
    matchId: matchId,
    uid: uid,
    matchAsync: _catchAsyncState(matchAsync),
    messagesAsync: _catchAsyncState(messagesAsync),
    suvbotActionsAsync: _catchAsyncState(suvbotActionsAsync),
    profile: profile,
    hostProfile: hostProfile,
    reportUserPending: reportUserPending,
    blockUserPending: blockUserPending,
    now: now,
  );
}

CatchAsyncState<T> _catchAsyncState<T>(AsyncValue<T> value) {
  return value.when(
    data: CatchAsyncState<T>.data,
    loading: () => const CatchAsyncState.loading(),
    error: (error, stackTrace) => CatchAsyncState<T>.error(error),
  );
}

void main() {
  group('ChatReadMarkerState', () {
    test('marks a uid once and exposes the last known uid for dispose', () {
      final state = ChatReadMarkerState();

      expect(state.markForUid(null), isNull);
      expect(state.markForUid('runner-1'), 'runner-1');
      expect(state.markForUid('runner-1'), isNull);
      expect(state.disposeMarkUid, 'runner-1');
      expect(state.markForUid('runner-1', force: true), 'runner-1');
    });

    test('marks read for incoming latest messages only', () {
      final state = ChatReadMarkerState();

      expect(
        state.markForIncomingLatest(uid: 'runner-1', messages: const []),
        isNull,
      );
      expect(
        state.markForIncomingLatest(
          uid: 'runner-1',
          messages: [buildMessage()],
        ),
        isNull,
      );
      expect(
        state.markForIncomingLatest(
          uid: 'runner-1',
          messages: [buildMessage(senderId: 'runner-2')],
        ),
        'runner-1',
      );
    });
  });

  group('ChatReadMarkerController', () {
    test('executes mark-read decisions through the repository', () {
      final repository = FakeConversationRepository();
      final controller = ChatReadMarkerController(
        conversationId: 'match-1',
        repository: repository,
      );

      expect(controller.markForUid(null), isFalse);
      expect(controller.markForUid('runner-1'), isTrue);
      expect(controller.markForUid('runner-1'), isFalse);
      expect(repository.markReadCalls, [('match-1', 'runner-1')]);

      expect(controller.markForUid('runner-1', force: true), isTrue);
      expect(repository.markReadCalls, [
        ('match-1', 'runner-1'),
        ('match-1', 'runner-1'),
      ]);
    });

    test('marks incoming latest messages and disposes with last known uid', () {
      final repository = FakeConversationRepository();
      final controller = ChatReadMarkerController(
        conversationId: 'match-1',
        repository: repository,
      );

      expect(
        controller.markForIncomingLatest(
          uid: 'runner-1',
          messages: [buildMessage()],
        ),
        isFalse,
      );
      expect(
        controller.markForIncomingLatest(
          uid: 'runner-1',
          messages: [buildMessage(senderId: 'runner-2')],
        ),
        isTrue,
      );
      expect(controller.markOnDispose(), isTrue);

      expect(repository.markReadCalls, [
        ('match-1', 'runner-1'),
        ('match-1', 'runner-1'),
      ]);
    });
  });

  group('ChatScrollCoordinator', () {
    testWidgets('tracks initial and appended message batches', (tester) async {
      final coordinator = ChatScrollCoordinator(isMounted: () => true);
      addTearDown(coordinator.dispose);

      coordinator.syncWithMessages(messages: const []);

      expect(coordinator.didScrollToLatestMessage, isFalse);
      expect(coordinator.lastMessageCount, 0);

      final firstBatch = [
        buildMessage(),
        buildMessage(id: 'msg-2', senderId: 'runner-2'),
      ];
      coordinator.syncWithMessages(messages: firstBatch);
      await tester.pump();

      expect(coordinator.didScrollToLatestMessage, isTrue);
      expect(coordinator.lastMessageCount, 2);

      final appendedBatch = [
        ...firstBatch,
        buildMessage(id: 'msg-3', senderId: 'runner-2'),
      ];
      coordinator.syncWithMessages(
        messages: appendedBatch,
        previousMessages: firstBatch,
      );
      await tester.pump();

      expect(coordinator.lastMessageCount, 3);
    });

    test('ignores send-success scroll when unattached', () {
      final coordinator = ChatScrollCoordinator(isMounted: () => true);
      addTearDown(coordinator.dispose);

      coordinator.scrollAfterSendSuccess();

      expect(coordinator.lastMessageCount, 0);
    });
  });

  group('ChatThreadActionController', () {
    test('resolves profile navigation requests from chat state', () {
      final runner = FakeChatSafetyActionRunner();
      final controller = ChatThreadActionController(safetyRunner: runner);
      final profile = buildPublicProfile(uid: 'runner-2', name: 'Taylor');

      final state = _hostChatState(
        matchId: 'match-1',
        uid: 'runner-1',
        matchAsync: AsyncData<Match?>(buildMatch()),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: profile,
        hostProfile: null,
      );
      final hostInquiryState = _hostChatState(
        matchId: 'host-inquiry-1',
        uid: 'host-1',
        matchAsync: AsyncData<Match?>(
          buildMatch(
            id: 'host-inquiry-1',
            user1Id: 'guest-1',
            user2Id: 'host-1',
            conversationType: MatchConversationType.organizerHostInquiry,
          ),
        ),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: buildPublicProfile(uid: 'guest-1', name: 'Aarav'),
        hostProfile: null,
      );

      final request = controller.profileNavigationRequest(state);

      expect(request?.uid, 'runner-2');
      expect(request?.profile, same(profile));
      expect(controller.profileNavigationRequest(hostInquiryState), isNull);
    });

    test(
      'runs share report and block intents through injected effects',
      () async {
        final runner = FakeChatSafetyActionRunner();
        final controller = ChatThreadActionController(safetyRunner: runner);
        final state = _hostChatState(
          matchId: 'match-1',
          uid: 'runner-1',
          matchAsync: AsyncData<Match?>(buildMatch()),
          messagesAsync: _emptyMessagesAsync,
          suvbotActionsAsync: _emptySuvbotActionsAsync,
          profile: buildPublicProfile(uid: 'runner-2', name: 'Taylor'),
          hostProfile: null,
        );
        final share = ExternalShareController((_) async {});
        final feedback = <String>[];
        final confirmedBlocks = <String>[];
        ChatShareCardRequest? shareRequest;
        var closedAfterBlock = false;
        final ui = ChatThreadActionUi(
          showFeedback: feedback.add,
          showShareCard: (request) => shareRequest = request,
          confirmBlock: (targetName) async {
            confirmedBlocks.add(targetName);
            return true;
          },
          closeAfterBlock: () => closedAfterBlock = true,
        );

        await controller.runThreadAction(
          action: ChatThreadAction.shareCard,
          chatState: state,
          messages: const [],
          uid: 'runner-1',
          event: null,
          share: share,
          ui: ui,
        );
        expect(feedback, ['Send a message before sharing a card.']);

        await controller.runThreadAction(
          action: ChatThreadAction.shareCard,
          chatState: state,
          messages: [buildMessage()],
          uid: 'runner-1',
          event: null,
          share: share,
          ui: ui,
        );
        expect(shareRequest?.currentUid, 'runner-1');
        expect(shareRequest?.messages, hasLength(1));

        await controller.runThreadAction(
          action: ChatThreadAction.report,
          chatState: state,
          messages: const [],
          uid: 'runner-1',
          event: null,
          share: share,
          ui: ui,
        );
        expect(runner.reportCalls, ['runner-2']);
        expect(feedback.last, 'Report submitted for Taylor.');

        await controller.runThreadAction(
          action: ChatThreadAction.block,
          chatState: state,
          messages: const [],
          uid: 'runner-1',
          event: null,
          share: share,
          ui: ui,
        );
        expect(confirmedBlocks, ['Taylor']);
        expect(runner.blockCalls, ['runner-2']);
        expect(closedAfterBlock, isTrue);
      },
    );

    test('suppresses success effects when safety actions fail', () async {
      final runner = FakeChatSafetyActionRunner(
        failReports: true,
        failBlocks: true,
      );
      final controller = ChatThreadActionController(safetyRunner: runner);
      final state = _hostChatState(
        matchId: 'match-1',
        uid: 'runner-1',
        matchAsync: AsyncData<Match?>(buildMatch()),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: buildPublicProfile(uid: 'runner-2', name: 'Taylor'),
        hostProfile: null,
      );
      final share = ExternalShareController((_) async {});
      final feedback = <String>[];
      var closedAfterBlock = false;
      final ui = ChatThreadActionUi(
        showFeedback: feedback.add,
        showShareCard: (_) {},
        confirmBlock: (_) async => true,
        closeAfterBlock: () => closedAfterBlock = true,
      );

      await controller.runThreadAction(
        action: ChatThreadAction.report,
        chatState: state,
        messages: const [],
        uid: 'runner-1',
        event: null,
        share: share,
        ui: ui,
      );
      await controller.runThreadAction(
        action: ChatThreadAction.block,
        chatState: state,
        messages: const [],
        uid: 'runner-1',
        event: null,
        share: share,
        ui: ui,
      );

      expect(runner.reportCalls, ['runner-2']);
      expect(runner.blockCalls, ['runner-2']);
      expect(feedback, isEmpty);
      expect(closedAfterBlock, isFalse);
    });
  });

  group('ChatThreadLookupState', () {
    test('derives consumer chat profile and event lookup keys', () {
      final routeProfile = buildPublicProfile(uid: 'runner-2', name: 'Taylor');
      final match = buildMatch();

      final state = ChatThreadLookupState.resolve(
        matchId: match.id,
        uid: 'runner-1',
        match: match,
        routeProfile: routeProfile,
      );

      expect(state.otherUid, 'runner-2');
      expect(state.isSuvbot, isFalse);
      expect(state.isHostInquiry, isFalse);
      expect(state.hostInquiryOrganizerId, isNull);
      expect(state.hostProfile, isNull);
      expect(state.publicProfileUid, 'runner-2');
      expect(state.initialProfile, same(routeProfile));
      expect(state.latestEventId, 'event-1');
    });

    test(
      'waits for host inquiry club context before reading attendee profile',
      () {
        final routeProfile = buildPublicProfile(uid: 'guest-1', name: 'Aarav');
        final match = buildMatch(
          id: 'host-inquiry-1',
          user1Id: 'guest-1',
          user2Id: 'host-1',
          conversationType: MatchConversationType.organizerHostInquiry,
          organizerId: 'club-1',
        );
        final organizer = Organizer(
          id: 'club-1',
          name: 'Sea Face Social',
          description: 'Small social runs and conversation-led evenings.',
          location: 'Mumbai',
          area: 'Bandra',
          hostUserId: 'host-1',
          ownerUserId: 'host-1',
          hostUserIds: const ['host-1'],
          createdAt: DateTime(2026),
        );

        final withoutOrganizer = ChatThreadLookupState.resolve(
          matchId: match.id,
          uid: 'host-1',
          match: match,
          routeProfile: routeProfile,
        );
        final withOrganizer = ChatThreadLookupState.resolve(
          matchId: match.id,
          uid: 'host-1',
          match: match,
          routeProfile: routeProfile,
          hostInquiryOrganizer: organizer,
        );

        expect(withoutOrganizer.hostInquiryOrganizerId, 'club-1');
        expect(withoutOrganizer.publicProfileUid, isNull);
        expect(withoutOrganizer.initialProfile, isNull);
        expect(withOrganizer.otherUid, 'guest-1');
        expect(withOrganizer.publicProfileUid, 'guest-1');
        expect(withOrganizer.initialProfile, isNull);
      },
    );

    test('uses club host profile instead of public profile for host peer', () {
      final match = buildMatch(
        id: 'host-inquiry-1',
        user1Id: 'guest-1',
        user2Id: 'host-1',
        conversationType: MatchConversationType.organizerHostInquiry,
        organizerId: 'club-1',
      );
      final organizer = Organizer(
        id: 'club-1',
        name: 'Sea Face Social',
        description: 'Small social runs and conversation-led evenings.',
        location: 'Mumbai',
        area: 'Bandra',
        hostUserId: 'host-1',
        ownerUserId: 'host-1',
        hostUserIds: const ['host-1'],
        hostProfiles: const [
          OrganizerHostProfile(
            uid: 'host-1',
            displayName: 'Mira from Sea Face',
            role: OrganizerHostRole.owner,
          ),
        ],
        createdAt: DateTime(2026),
      );

      final state = ChatThreadLookupState.resolve(
        matchId: match.id,
        uid: 'guest-1',
        match: match,
        routeProfile: null,
        hostInquiryOrganizer: organizer,
      );

      expect(state.otherUid, 'host-1');
      expect(state.hostProfile?.displayName, 'Mira from Sea Face');
      expect(state.publicProfileUid, isNull);
    });

    test('suppresses profile and event lookups for Suvbot', () {
      final routeProfile = buildPublicProfile(uid: suvbotUid, name: 'Suvbot');
      final match = buildMatch(
        id: 'suvbot_runner-1',
        user1Id: suvbotUid,
        user2Id: 'runner-1',
      );

      final state = ChatThreadLookupState.resolve(
        matchId: match.id,
        uid: 'runner-1',
        match: match,
        routeProfile: routeProfile,
      );

      expect(state.isSuvbot, isTrue);
      expect(state.otherUid, isNull);
      expect(state.publicProfileUid, isNull);
      expect(state.latestEventId, isNull);
    });
  });

  group('HostChatScreenState', () {
    test('maps host inquiry identity and action availability', () {
      final match = buildMatch(
        user1Id: 'guest-1',
        user2Id: 'host-1',
        conversationType: MatchConversationType.organizerHostInquiry,
        organizerId: 'club-1',
      );
      final profile = buildPublicProfile(uid: 'guest-1', name: 'Aarav');

      final state = _hostChatState(
        matchId: match.id,
        uid: 'host-1',
        matchAsync: AsyncData<Match?>(match),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: profile,
        hostProfile: null,
      );

      expect(state.routeError, isNull);
      expect(state.isHostInquiry, isTrue);
      expect(state.name, 'Aarav');
      expect(state.otherUid, 'guest-1');
      expect(state.profileNavigationEnabled, isFalse);
      expect(state.shareCardEnabled, isFalse);
      expect(state.safetyActionsEnabled, isTrue);
      expect(state.threadActions, [
        ChatThreadAction.report,
        ChatThreadAction.block,
      ]);
      expect(state.disabledThreadActions, isEmpty);
      expect(state.safetyTargetName, 'Aarav');
      expect(state.messageOtherName, 'Aarav');
      expect(state.messagesRetryIntent, isNull);
      expect(state.suvbotActionsRetryIntent, isNull);
      expect(state.composerDisabledReason, isNull);
    });

    test('names host fallback and disabled composer states', () {
      final hostInquiry = buildMatch(
        user1Id: 'guest-1',
        user2Id: 'host-1',
        conversationType: MatchConversationType.organizerHostInquiry,
        organizerId: 'club-1',
      );

      final fallback = _hostChatState(
        matchId: hostInquiry.id,
        uid: 'host-1',
        matchAsync: AsyncData<Match?>(hostInquiry),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: null,
        hostProfile: null,
      );
      final loading = _hostChatState(
        matchId: hostInquiry.id,
        uid: 'host-1',
        matchAsync: const AsyncLoading<Match?>(),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: null,
        hostProfile: null,
      );
      final blocked = _hostChatState(
        matchId: hostInquiry.id,
        uid: 'host-1',
        matchAsync: AsyncData<Match?>(
          hostInquiry.copyWith(status: MatchStatus.blocked),
        ),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: null,
        hostProfile: null,
      );

      expect(fallback.name, 'Host conversation');
      expect(fallback.safetyTargetName, 'this person');
      expect(loading.composerDisabledReason, 'Loading chat...');
      expect(blocked.composerDisabledReason, 'This chat is closed.');
    });

    test('scopes Cross Paths plans and closes the composer after expiry', () {
      final now = DateTime.utc(2026, 8, 5, 12);
      final plan = buildMatch(
        conversationType: MatchConversationType.crossPathsEventPlan,
        eventPlanExpiresAt: now.subtract(const Duration(minutes: 1)),
      );
      final state = _hostChatState(
        matchId: plan.id,
        uid: 'runner-1',
        matchAsync: AsyncData<Match?>(plan),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: buildPublicProfile(uid: 'runner-2', name: 'Rhea'),
        hostProfile: null,
        now: now,
      );

      expect(state.shareCardEnabled, isFalse);
      expect(state.profileNavigationEnabled, isTrue);
      expect(state.safetyActionsEnabled, isTrue);
      expect(state.composerDisabledReason, 'This chat is closed.');
    });

    test('marks safety actions disabled while their mutations are pending', () {
      final match = buildMatch(
        user1Id: 'guest-1',
        user2Id: 'host-1',
        conversationType: MatchConversationType.organizerHostInquiry,
        organizerId: 'club-1',
      );

      final state = _hostChatState(
        matchId: match.id,
        uid: 'host-1',
        matchAsync: AsyncData<Match?>(match),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: buildPublicProfile(uid: 'guest-1', name: 'Aarav'),
        hostProfile: null,
        reportUserPending: true,
        blockUserPending: true,
      );

      expect(state.disabledThreadActions, {
        ChatThreadAction.report,
        ChatThreadAction.block,
      });
    });

    test('resolves typed top-bar action intents', () {
      final match = buildMatch();
      final profile = buildPublicProfile(uid: 'runner-2', name: 'Taylor');

      final state = _hostChatState(
        matchId: match.id,
        uid: 'runner-1',
        matchAsync: AsyncData<Match?>(match),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: profile,
        hostProfile: null,
      );
      final disabledReport = _hostChatState(
        matchId: match.id,
        uid: 'runner-1',
        matchAsync: AsyncData<Match?>(match),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: profile,
        hostProfile: null,
        reportUserPending: true,
      );

      expect(
        state.intentForThreadAction(ChatThreadAction.shareCard)?.type,
        HostChatActionIntentType.shareCard,
      );
      final reportIntent = state.intentForThreadAction(ChatThreadAction.report);
      expect(reportIntent?.type, HostChatActionIntentType.reportUser);
      expect(reportIntent?.targetUserId, 'runner-2');
      expect(reportIntent?.targetName, 'Taylor');
      final blockIntent = state.intentForThreadAction(ChatThreadAction.block);
      expect(blockIntent?.type, HostChatActionIntentType.blockUser);
      expect(blockIntent?.targetUserId, 'runner-2');
      expect(blockIntent?.targetName, 'Taylor');
      expect(
        disabledReport.intentForThreadAction(ChatThreadAction.report),
        isNull,
      );
      expect(
        disabledReport.intentForThreadAction(ChatThreadAction.block)?.type,
        HostChatActionIntentType.blockUser,
      );
    });

    test(
      'does not resolve unavailable host inquiry or Suvbot action intents',
      () {
        final hostInquiry = buildMatch(
          id: 'host-inquiry-1',
          user1Id: 'guest-1',
          user2Id: 'host-1',
          conversationType: MatchConversationType.organizerHostInquiry,
          organizerId: 'club-1',
        );
        final suvbotMatch = buildMatch(
          id: 'suvbot_runner-1',
          user1Id: suvbotUid,
          user2Id: 'runner-1',
        );

        final hostState = _hostChatState(
          matchId: hostInquiry.id,
          uid: 'host-1',
          matchAsync: AsyncData<Match?>(hostInquiry),
          messagesAsync: _emptyMessagesAsync,
          suvbotActionsAsync: _emptySuvbotActionsAsync,
          profile: buildPublicProfile(uid: 'guest-1', name: 'Aarav'),
          hostProfile: null,
        );
        final suvbotState = _hostChatState(
          matchId: suvbotMatch.id,
          uid: 'runner-1',
          matchAsync: AsyncData<Match?>(suvbotMatch),
          messagesAsync: _emptyMessagesAsync,
          suvbotActionsAsync: _emptySuvbotActionsAsync,
          profile: null,
          hostProfile: null,
        );

        expect(
          hostState.intentForThreadAction(ChatThreadAction.shareCard),
          isNull,
        );
        expect(
          hostState.intentForThreadAction(ChatThreadAction.report)?.type,
          HostChatActionIntentType.reportUser,
        );
        expect(
          hostState.intentForThreadAction(ChatThreadAction.block)?.type,
          HostChatActionIntentType.blockUser,
        );
        expect(
          suvbotState.intentForThreadAction(ChatThreadAction.shareCard),
          isNull,
        );
        expect(
          suvbotState.intentForThreadAction(ChatThreadAction.report),
          isNull,
        );
        expect(
          suvbotState.intentForThreadAction(ChatThreadAction.block),
          isNull,
        );
      },
    );

    test('names retry targets for route, message, and Suvbot failures', () {
      final match = buildMatch();
      final routeError = StateError('match failed');
      final messageError = StateError('messages failed');
      final suvbotError = StateError('controls failed');

      final failedRoute = _hostChatState(
        matchId: match.id,
        uid: 'runner-1',
        matchAsync: AsyncError<Match?>(routeError, StackTrace.empty),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: null,
        hostProfile: null,
      );
      expect(failedRoute.routeError?.error, same(routeError));
      expect(
        failedRoute.routeError?.retryIntent,
        HostChatRetryIntent.reloadMatch,
      );

      final failedMessages = _hostChatState(
        matchId: match.id,
        uid: 'runner-1',
        matchAsync: AsyncData<Match?>(match),
        messagesAsync: AsyncError<List<ChatMessage>>(
          messageError,
          StackTrace.empty,
        ),
        suvbotActionsAsync: _emptySuvbotActionsAsync,
        profile: null,
        hostProfile: null,
      );
      expect(
        failedMessages.messagesRetryIntent,
        HostChatRetryIntent.reloadMessages,
      );

      final suvbotMatch = buildMatch(
        id: 'suvbot_runner-1',
        user1Id: suvbotUid,
        user2Id: 'runner-1',
      );
      final failedSuvbotActions = _hostChatState(
        matchId: suvbotMatch.id,
        uid: 'runner-1',
        matchAsync: AsyncData<Match?>(suvbotMatch),
        messagesAsync: _emptyMessagesAsync,
        suvbotActionsAsync: AsyncError<List<SuvbotActionItem>>(
          suvbotError,
          StackTrace.empty,
        ),
        profile: null,
        hostProfile: null,
      );
      expect(
        failedSuvbotActions.suvbotActionsRetryIntent,
        HostChatRetryIntent.reloadSuvbotActions,
      );
    });
  });

  group('ChatRouteState', () {
    testWidgets('keeps thread UI loading while uid resolves', (tester) async {
      ChatRouteState? state;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWithValue(const AsyncLoading<String?>()),
            matchRepositoryProvider.overrideWithValue(
              FakeMatchRepository(match: buildMatch()),
            ),
            conversationRepositoryProvider.overrideWithValue(
              FakeConversationRepository(),
            ),
          ],
          child: CatchNoticeTestApp(
            home: Consumer(
              builder: (context, ref, child) {
                state = ref.watch(
                  chatRouteStateProvider(
                    const ChatRouteStateArgs(
                      matchId: 'match-1',
                      initialProfile: null,
                    ),
                  ),
                );
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);

      expect(state?.uidAsync.isLoading, isTrue);
      expect(state?.displayMessagesAsync.isLoading, isTrue);
      expect(state?.showEventContextHeader, isFalse);
      expect(state?.showSuvbotActionBar, isFalse);
      expect(state?.showComposer, isFalse);
    });

    testWidgets('centralizes host inquiry provider lookups for the route', (
      tester,
    ) async {
      final match = buildMatch(
        id: 'host-inquiry-1',
        user1Id: 'guest-1',
        user2Id: 'host-1',
        conversationType: MatchConversationType.organizerHostInquiry,
        organizerId: 'club-1',
      );
      final organizer = Organizer(
        id: 'club-1',
        name: 'Sea Face Social',
        description: 'Small social runs and conversation-led evenings.',
        location: 'Mumbai',
        area: 'Bandra',
        hostUserId: 'host-1',
        ownerUserId: 'host-1',
        hostUserIds: const ['host-1'],
        createdAt: DateTime(2026),
      );
      final profile = buildPublicProfile(uid: 'guest-1', name: 'Aarav');
      ChatRouteState? state;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
            matchRepositoryProvider.overrideWithValue(
              FakeMatchRepository(match: match),
            ),
            conversationRepositoryProvider.overrideWithValue(
              FakeConversationRepository(),
            ),
            watchOrganizerProvider(
              'club-1',
            ).overrideWith((ref) => Stream.value(organizer)),
            watchPublicProfileProvider(
              'guest-1',
            ).overrideWith((ref) => Stream.value(profile)),
          ],
          child: CatchNoticeTestApp(
            home: Consumer(
              builder: (context, ref, child) {
                state = ref.watch(
                  chatRouteStateProvider(
                    const ChatRouteStateArgs(
                      matchId: 'host-inquiry-1',
                      initialProfile: null,
                    ),
                  ),
                );
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);

      expect(state?.uid, 'host-1');
      expect(state?.lookupState.publicProfileUid, 'guest-1');
      expect(state?.chatState.name, 'Aarav');
      expect(state?.chatState.shareCardEnabled, isFalse);
      expect(state?.showEventContextHeader, isTrue);
      expect(state?.showComposer, isTrue);
    });
  });

  group('ChatScreen', () {
    testWidgets('hydrates the other profile without route extra', (
      tester,
    ) async {
      final matchRepository = FakeMatchRepository(match: buildMatch());
      final conversationRepository = FakeConversationRepository();

      await tester.pumpWidget(
        ProviderScope(
          retry: (_, _) => null,
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            watchEventProvider(
              'event-1',
            ).overrideWith((ref) => Stream.value(null)),
            watchPublicProfileProvider('runner-2').overrideWith(
              (ref) => Stream.value(
                buildPublicProfile(uid: 'runner-2', name: 'Taylor'),
              ),
            ),
          ],
          child: CatchNoticeTestApp(
            theme: AppTheme.light,
            home: const ChatScreen(matchId: 'match-1'),
          ),
        ),
      );

      await pumpFeatureUi(tester);
      expect(find.text('Taylor'), findsOneWidget);
      expect(find.text('Say hi to Taylor!'), findsOneWidget);
    });

    testWidgets('empty match thread grounds the prompt in the shared event', (
      tester,
    ) async {
      final event = buildEvent(startTime: DateTime(2026, 5, 29, 19));
      final matchRepository = FakeMatchRepository(match: buildMatch());
      final conversationRepository = FakeConversationRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            watchEventProvider(
              'event-1',
            ).overrideWith((ref) => Stream.value(event)),
            watchPublicProfileProvider('runner-2').overrideWith(
              (ref) => Stream.value(
                buildPublicProfile(uid: 'runner-2', name: 'Taylor'),
              ),
            ),
          ],
          child: CatchNoticeTestApp(
            theme: AppTheme.light,
            home: const ChatScreen(matchId: 'match-1'),
          ),
        ),
      );

      await pumpFeatureUi(tester);

      expect(
        find.text('You both ran ${event.title}. Say hi to Taylor!'),
        findsOneWidget,
      );
    });

    testWidgets('seeds an initial draft for deterministic route captures', (
      tester,
    ) async {
      final matchRepository = FakeMatchRepository(match: buildMatch());
      final conversationRepository = FakeConversationRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            watchEventProvider(
              'event-1',
            ).overrideWith((ref) => Stream.value(null)),
            watchPublicProfileProvider('runner-2').overrideWith(
              (ref) => Stream.value(
                buildPublicProfile(uid: 'runner-2', name: 'Taylor'),
              ),
            ),
          ],
          child: CatchNoticeTestApp(
            theme: AppTheme.light,
            home: const ChatScreen(
              matchId: 'match-1',
              initialDraftText: 'Holding this draft for review.',
            ),
          ),
        ),
      );

      await pumpFeatureUi(tester);

      expect(
        tester.widget<TextField>(find.byType(TextField)).controller?.text,
        'Holding this draft for review.',
      );
    });

    testWidgets('reports draft changes to an adaptive workspace owner', (
      tester,
    ) async {
      final drafts = <String>[];
      await pumpConsumerMatchChat(
        tester,
        initialDraftText: 'Earlier draft',
        onDraftChanged: drafts.add,
      );

      await tester.enterText(find.byType(TextField), 'Draft after resize');
      await tester.pump();

      expect(drafts, isNotEmpty);
      expect(drafts.last, 'Draft after resize');
    });

    testWidgets('resets unread once the uid becomes available after mount', (
      tester,
    ) async {
      final uidController = StreamController<String?>.broadcast();
      addTearDown(uidController.close);

      final matchRepository = FakeMatchRepository(match: buildMatch());
      final conversationRepository = FakeConversationRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => uidController.stream),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            watchEventProvider(
              'event-1',
            ).overrideWith((ref) => Stream.value(null)),
          ],
          child: CatchNoticeTestApp(
            theme: AppTheme.light,
            home: const ChatScreen(matchId: 'match-1'),
          ),
        ),
      );

      await tester.pump();
      expect(conversationRepository.markReadCalls, isEmpty);

      uidController.add('runner-1');
      await tester.pump();
      await tester.pump();

      expect(conversationRepository.markReadCalls, [('match-1', 'runner-1')]);
    });

    testWidgets('sends trimmed messages and clears the input', (tester) async {
      final matchRepository = FakeMatchRepository(match: buildMatch());
      final conversationRepository = FakeConversationRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            watchEventProvider(
              'event-1',
            ).overrideWith((ref) => Stream.value(null)),
          ],
          child: CatchNoticeTestApp(
            theme: AppTheme.light,
            home: ChatScreen(
              matchId: 'match-1',
              otherProfile: buildPublicProfile(uid: 'runner-2', name: 'Taylor'),
            ),
          ),
        ),
      );

      await pumpFeatureUi(tester);

      await tester.enterText(find.byType(TextField), '  Hello Taylor  ');
      await tester.pump();
      await tester.tap(find.byIcon(CatchIcons.send));
      await pumpFeatureUi(tester);

      expect(conversationRepository.sendCalls, hasLength(1));
      expect(conversationRepository.sendCalls.single.$1, 'match-1');
      expect(conversationRepository.sendCalls.single.$2, 'runner-1');
      expect(conversationRepository.sendCalls.single.$3, 'Hello Taylor');
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller?.text,
        isEmpty,
      );
    });

    testWidgets(
      'keeps composer usable while sending and retains a newer draft on failure',
      (tester) async {
        final sendCompleter = Completer<void>();
        final conversationRepository = FakeConversationRepository(
          failSends: true,
          sendCompleter: sendCompleter,
        );
        addTearDown(() {
          if (!sendCompleter.isCompleted) sendCompleter.complete();
        });

        await pumpConsumerMatchChat(
          tester,
          conversationRepository: conversationRepository,
        );

        await tester.enterText(find.byType(TextField), '  Still here  ');
        await tester.pump();
        await tester.tap(find.byIcon(CatchIcons.send));
        await tester.pump();

        expect(conversationRepository.sendCalls, hasLength(1));
        expect(find.byIcon(CatchIcons.send), findsNothing);
        expect(find.byType(CatchLoadingIndicator), findsOneWidget);
        expect(
          tester.widget<TextField>(find.byType(TextField)).enabled,
          isTrue,
        );
        expect(find.byTooltip('Send an image'), findsOneWidget);

        await tester.enterText(find.byType(TextField), 'Next thought');
        await tester.pump();

        await tester.tap(find.byKey(ChatInput.sendButtonKey));
        await tester.pump();

        expect(conversationRepository.sendCalls, hasLength(1));

        sendCompleter.complete();
        await pumpFeatureUi(tester);

        expect(
          tester.widget<TextField>(find.byType(TextField)).controller?.text,
          'Next thought',
        );
        expect(
          tester.widget<TextField>(find.byType(TextField)).enabled,
          isTrue,
        );
        expect(find.byIcon(CatchIcons.send), findsOneWidget);
        expect(
          find.text('Something went wrong. Please try again.'),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      'keeps multiline composer visible and capped when keyboard is open',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(390, 844);
        tester.view.viewInsets = const FakeViewPadding(bottom: 318);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetViewInsets);

        await pumpConsumerMatchChat(
          tester,
          initialDraftText:
              'First gallery idea\nSecond coffee stop\nThird Thursday run\n'
              'Fourth plan to compare',
        );

        final input = tester.widget<TextField>(find.byType(TextField));

        expect(input.controller?.text, contains('\n'));
        expect(input.minLines, 1);
        expect(input.maxLines, 4);
        expect(find.byIcon(CatchIcons.send), findsOneWidget);
        expect(
          tester.getBottomLeft(find.byIcon(CatchIcons.send)).dy,
          lessThanOrEqualTo(844 - 318),
        );
      },
    );

    testWidgets('consumer chat reports show success feedback', (tester) async {
      final safetyRepository = FakeSafetyRepository();

      await pumpConsumerMatchChat(tester, safetyRepository: safetyRepository);

      await tester.tap(find.byTooltip('Chat actions'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Report'));
      await pumpFeatureUi(tester);

      expect(safetyRepository.reportCalls, [
        (targetUserId: 'runner-2', contextId: 'match-1'),
      ]);
      expect(find.text('Report submitted for Taylor.'), findsOneWidget);
    });

    testWidgets('consumer chat report failures surface snackbar feedback', (
      tester,
    ) async {
      final safetyRepository = FakeSafetyRepository(failReports: true);

      await pumpConsumerMatchChat(tester, safetyRepository: safetyRepository);

      await tester.tap(find.byTooltip('Chat actions'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Report'));
      await pumpFeatureUi(tester);

      expect(safetyRepository.reportCalls, [
        (targetUserId: 'runner-2', contextId: 'match-1'),
      ]);
      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
      expect(find.text('Report submitted for Taylor.'), findsNothing);
    });

    testWidgets('consumer chat block action requires confirmation', (
      tester,
    ) async {
      final safetyRepository = FakeSafetyRepository();

      await pumpConsumerMatchChat(tester, safetyRepository: safetyRepository);

      await tester.tap(find.byTooltip('Chat actions'));
      await pumpFeatureUi(tester);
      await tester.tap(
        find.ancestor(of: find.text('Block'), matching: find.byType(InkWell)),
      );
      await pumpFeatureUi(tester);

      expect(find.text('Block Taylor?'), findsOneWidget);
      expect(
        find.textContaining('You will stop seeing each other'),
        findsOneWidget,
      );

      await tester.tap(find.widgetWithText(CatchButton, 'Cancel'));
      await pumpFeatureUi(tester);

      expect(safetyRepository.blockCalls, isEmpty);
    });

    testWidgets('resets unread again for incoming messages while open', (
      tester,
    ) async {
      final messageController = StreamController<List<ChatMessage>>.broadcast();
      addTearDown(messageController.close);
      final matchRepository = FakeMatchRepository(match: buildMatch());
      final conversationRepository = FakeConversationRepository(
        messageStream: messageController.stream,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            watchEventProvider(
              'event-1',
            ).overrideWith((ref) => Stream.value(null)),
          ],
          child: CatchNoticeTestApp(
            theme: AppTheme.light,
            home: ChatScreen(
              matchId: 'match-1',
              otherProfile: buildPublicProfile(uid: 'runner-2', name: 'Taylor'),
            ),
          ),
        ),
      );

      await tester.pump();
      expect(conversationRepository.markReadCalls, [('match-1', 'runner-1')]);

      messageController.add([
        buildMessage(senderId: 'runner-2', text: 'Incoming'),
      ]);
      await tester.pump();
      await tester.pump();

      expect(conversationRepository.markReadCalls, [
        ('match-1', 'runner-1'),
        ('match-1', 'runner-1'),
      ]);
    });

    testWidgets('shows a friendly error and retry when messages fail to load', (
      tester,
    ) async {
      final matchRepository = FakeMatchRepository(match: buildMatch());
      final conversationRepository = FakeConversationRepository();
      var messageProviderBuilds = 0;
      await tester.pumpWidget(
        ProviderScope(
          retry: (_, _) => null,
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            watchEventProvider(
              'event-1',
            ).overrideWith((ref) => Stream.value(null)),
            watchConversationMessagesProvider('match-1').overrideWith((ref) {
              messageProviderBuilds += 1;
              return Stream<List<ChatMessage>>.error(
                Exception('messages failed'),
                StackTrace.empty,
              );
            }),
          ],
          child: CatchNoticeTestApp(
            theme: AppTheme.light,
            home: ChatScreen(
              matchId: 'match-1',
              otherProfile: buildPublicProfile(uid: 'runner-2', name: 'Taylor'),
            ),
          ),
        ),
      );

      await pumpFeatureUi(tester);

      expect(find.text('Unable to load messages.'), findsOneWidget);
      final buildsBeforeRetry = messageProviderBuilds;

      await tester.tap(find.widgetWithText(CatchButton, 'Try again'));
      await pumpFeatureUi(tester);

      expect(messageProviderBuilds, greaterThan(buildsBeforeRetry));
    });

    testWidgets('routes match load errors through a retryable chat state', (
      tester,
    ) async {
      final matchController = StreamController<Match?>();
      matchController.addError(Exception('match failed'), StackTrace.empty);
      addTearDown(matchController.close);
      final matchRepository = FakeMatchRepository(
        matchStream: () => matchController.stream,
      );
      final conversationRepository = FakeConversationRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
          ],
          child: CatchNoticeTestApp(
            theme: AppTheme.light,
            home: ChatScreen(
              matchId: 'match-1',
              otherProfile: buildPublicProfile(uid: 'runner-2', name: 'Taylor'),
            ),
          ),
        ),
      );

      await pumpFeatureUi(tester);

      expect(find.text('Messages unavailable'), findsOneWidget);
      final callsBeforeRetry = matchRepository.watchMatchCalls;

      await tester.tap(find.widgetWithText(CatchButton, 'Reload messages'));
      await pumpFeatureUi(tester);

      expect(matchRepository.watchMatchCalls, greaterThan(callsBeforeRetry));
    });

    testWidgets(
      'host inquiry disables profile navigation and share card actions',
      (tester) async {
        final match = buildMatch(
          id: 'host-inquiry-1',
          user1Id: 'guest-1',
          user2Id: 'host-1',
          conversationType: MatchConversationType.organizerHostInquiry,
          organizerId: 'club-1',
        );
        final matchRepository = FakeMatchRepository(match: match);
        final conversationRepository = FakeConversationRepository();
        final safetyRepository = FakeSafetyRepository();
        final organizer = Organizer(
          id: 'club-1',
          name: 'Sea Face Social',
          description: 'Small social runs and conversation-led evenings.',
          location: 'Mumbai',
          area: 'Bandra',
          hostUserId: 'host-1',
          hostName: 'Mira Shah',
          ownerUserId: 'host-1',
          hostUserIds: const ['host-1'],
          hostProfiles: const [
            OrganizerHostProfile(
              uid: 'host-1',
              displayName: 'Mira from Sea Face',
              role: OrganizerHostRole.owner,
            ),
          ],
          createdAt: DateTime(2026),
        );

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              uidProvider.overrideWith((ref) => Stream.value('host-1')),
              matchRepositoryProvider.overrideWithValue(matchRepository),
              conversationRepositoryProvider.overrideWithValue(
                conversationRepository,
              ),
              safetyRepositoryProvider.overrideWith((ref) => safetyRepository),
              watchOrganizerProvider(
                'club-1',
              ).overrideWith((ref) => Stream.value(organizer)),
              watchEventProvider(
                'event-1',
              ).overrideWith((ref) => Stream.value(null)),
              watchPublicProfileProvider('guest-1').overrideWith(
                (ref) => Stream.value(
                  buildPublicProfile(uid: 'guest-1', name: 'Aarav'),
                ),
              ),
            ],
            child: CatchNoticeTestApp(
              theme: AppTheme.light,
              home: const ChatScreen(matchId: 'host-inquiry-1'),
            ),
          ),
        );

        await pumpFeatureUi(tester);

        await tester.tap(find.text('Aarav'));
        await pumpFeatureUi(tester);
        expect(tester.takeException(), isNull);

        await tester.tap(find.byTooltip('Chat actions'));
        await pumpFeatureUi(tester);

        expect(find.text('Share card'), findsNothing);
        expect(find.text('Report'), findsOneWidget);
        expect(find.text('Block'), findsOneWidget);

        await tester.tap(find.text('Report'));
        await pumpFeatureUi(tester);

        expect(safetyRepository.reportCalls, [
          (targetUserId: 'guest-1', contextId: 'host-inquiry-1'),
        ]);
        expect(find.text('Report submitted for Aarav.'), findsOneWidget);

        await tester.tap(find.byTooltip('Chat actions'));
        await pumpFeatureUi(tester);
        await tester.tap(
          find.ancestor(of: find.text('Block'), matching: find.byType(InkWell)),
        );
        await pumpFeatureUi(tester);

        expect(find.text('Block Aarav?'), findsOneWidget);

        await tester.tap(find.widgetWithText(CatchButton, 'Block'));
        await pumpFeatureUi(tester);

        expect(safetyRepository.blockCalls, ['guest-1']);
      },
    );

    testWidgets('prompts before sharing an empty consumer thread', (
      tester,
    ) async {
      final matchRepository = FakeMatchRepository(match: buildMatch());
      final conversationRepository = FakeConversationRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('runner-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            watchEventProvider(
              'event-1',
            ).overrideWith((ref) => Stream.value(null)),
          ],
          child: CatchNoticeTestApp(
            theme: AppTheme.light,
            home: ChatScreen(
              matchId: 'match-1',
              otherProfile: buildPublicProfile(uid: 'runner-2', name: 'Taylor'),
            ),
          ),
        ),
      );

      await pumpFeatureUi(tester);
      await tester.tap(find.byTooltip('Chat actions'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Share card'));
      await pumpFeatureUi(tester);

      expect(
        find.text('Send a message before sharing a card.'),
        findsOneWidget,
      );
    });

    testWidgets('disables the composer for blocked host inquiry chats', (
      tester,
    ) async {
      final matchRepository = FakeMatchRepository(
        match: buildMatch(
          id: 'host-inquiry-1',
          user1Id: 'guest-1',
          user2Id: 'host-1',
          conversationType: MatchConversationType.organizerHostInquiry,
          status: MatchStatus.blocked,
          organizerId: 'club-1',
        ),
      );
      final conversationRepository = FakeConversationRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            watchOrganizerProvider('club-1').overrideWith(
              (ref) => Stream.value(
                Organizer(
                  id: 'club-1',
                  name: 'Sea Face Social',
                  description:
                      'Small social runs and conversation-led evenings.',
                  location: 'Mumbai',
                  area: 'Bandra',
                  hostUserId: 'host-1',
                  ownerUserId: 'host-1',
                  hostUserIds: const ['host-1'],
                  createdAt: DateTime(2026),
                ),
              ),
            ),
            watchPublicProfileProvider('guest-1').overrideWith(
              (ref) => Stream.value(
                buildPublicProfile(uid: 'guest-1', name: 'Aarav'),
              ),
            ),
          ],
          child: CatchNoticeTestApp(
            theme: AppTheme.light,
            home: const ChatScreen(matchId: 'host-inquiry-1'),
          ),
        ),
      );

      await pumpFeatureUi(tester);

      expect(find.text('This chat is closed.'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'Should not send');
      await tester.tap(find.byIcon(CatchIcons.send));
      await pumpFeatureUi(tester);

      expect(conversationRepository.sendCalls, isEmpty);
    });

    testWidgets('surfaces failed report mutations through chat feedback', (
      tester,
    ) async {
      final match = buildMatch(
        id: 'host-inquiry-1',
        user1Id: 'guest-1',
        user2Id: 'host-1',
        conversationType: MatchConversationType.organizerHostInquiry,
        organizerId: 'club-1',
      );
      final matchRepository = FakeMatchRepository(match: match);
      final conversationRepository = FakeConversationRepository();
      final safetyRepository = FakeSafetyRepository(failReports: true);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            safetyRepositoryProvider.overrideWith((ref) => safetyRepository),
            watchOrganizerProvider('club-1').overrideWith(
              (ref) => Stream.value(
                Organizer(
                  id: 'club-1',
                  name: 'Sea Face Social',
                  description:
                      'Small social runs and conversation-led evenings.',
                  location: 'Mumbai',
                  area: 'Bandra',
                  hostUserId: 'host-1',
                  ownerUserId: 'host-1',
                  hostUserIds: const ['host-1'],
                  createdAt: DateTime(2026),
                ),
              ),
            ),
            watchPublicProfileProvider('guest-1').overrideWith(
              (ref) => Stream.value(
                buildPublicProfile(uid: 'guest-1', name: 'Aarav'),
              ),
            ),
          ],
          child: CatchNoticeTestApp(
            theme: AppTheme.light,
            home: const ChatScreen(matchId: 'host-inquiry-1'),
          ),
        ),
      );

      await pumpFeatureUi(tester);
      await tester.tap(find.byTooltip('Chat actions'));
      await pumpFeatureUi(tester);
      await tester.tap(find.text('Report'));
      await pumpFeatureUi(tester);

      expect(safetyRepository.reportCalls, [
        (targetUserId: 'guest-1', contextId: 'host-inquiry-1'),
      ]);
      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
    });

    testWidgets('surfaces failed block mutations through chat feedback', (
      tester,
    ) async {
      final match = buildMatch(
        id: 'host-inquiry-1',
        user1Id: 'guest-1',
        user2Id: 'host-1',
        conversationType: MatchConversationType.organizerHostInquiry,
        organizerId: 'club-1',
      );
      final matchRepository = FakeMatchRepository(match: match);
      final conversationRepository = FakeConversationRepository();
      final safetyRepository = FakeSafetyRepository(failBlocks: true);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
            matchRepositoryProvider.overrideWithValue(matchRepository),
            conversationRepositoryProvider.overrideWithValue(
              conversationRepository,
            ),
            safetyRepositoryProvider.overrideWith((ref) => safetyRepository),
            watchOrganizerProvider('club-1').overrideWith(
              (ref) => Stream.value(
                Organizer(
                  id: 'club-1',
                  name: 'Sea Face Social',
                  description:
                      'Small social runs and conversation-led evenings.',
                  location: 'Mumbai',
                  area: 'Bandra',
                  hostUserId: 'host-1',
                  ownerUserId: 'host-1',
                  hostUserIds: const ['host-1'],
                  createdAt: DateTime(2026),
                ),
              ),
            ),
            watchPublicProfileProvider('guest-1').overrideWith(
              (ref) => Stream.value(
                buildPublicProfile(uid: 'guest-1', name: 'Aarav'),
              ),
            ),
          ],
          child: CatchNoticeTestApp(
            theme: AppTheme.light,
            home: const ChatScreen(matchId: 'host-inquiry-1'),
          ),
        ),
      );

      await pumpFeatureUi(tester);
      await tester.tap(find.byTooltip('Chat actions'));
      await pumpFeatureUi(tester);
      await tester.tap(
        find.ancestor(of: find.text('Block'), matching: find.byType(InkWell)),
      );
      await pumpFeatureUi(tester);
      await tester.tap(find.widgetWithText(CatchButton, 'Block'));
      await pumpFeatureUi(tester);

      expect(safetyRepository.blockCalls, ['guest-1']);
      expect(
        find.text('Something went wrong. Please try again.'),
        findsOneWidget,
      );
    });
  });

  _registerChatScreenSuvbotTests();
}
