// copy:allow-file(Widgetbook and capture-only deterministic fixture data)
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/messaging/domain/suvbot_action_item.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';

/// Shared deterministic fixtures for Matches List and Match Chat design review.
///
/// Keep this file free of Widgetbook-only widgets so route captures can reuse
/// the same identities, matches, messages, and fake repositories later.
final class MatchesChatSurfaceFixtures {
  const MatchesChatSurfaceFixtures._();

  static const viewerUid = 'design-chat-viewer';
  static const taylorUid = 'design-chat-taylor';
  static const morganUid = 'design-chat-morgan';
  static const hostUid = 'design-chat-host';
  static const guestUid = 'design-chat-guest';
  static const organizerId = 'design-chat-club';
  static const eventId = 'design-chat-event';
  static final now = DateTime(2026, 6, 22, 18);

  static final event = Event(
    id: eventId,
    organizerId: organizerId,
    startTime: DateTime(2026, 6, 24, 18, 30),
    endTime: DateTime(2026, 6, 24, 20),
    meetingPoint: 'Carter Road Jetty',
    meetingLocation: const EventMeetingLocation(
      name: 'Carter Road Jetty',
      latitude: 19.0676,
      longitude: 72.8227,
    ),
    startingPointLat: 19.0676,
    startingPointLng: 72.8227,
    eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.socialRun),
    distanceKm: 5,
    pace: PaceLevel.easy,
    capacityLimit: 12,
    description: 'A relaxed 5K with coffee after.',
    priceInPaise: 0,
    bookedCount: 9,
  );

  static final organizer = Organizer(
    id: organizerId,
    name: 'Sea Face Social',
    description: 'Small social runs and conversation-led evenings.',
    location: 'Bandra',
    area: 'Carter Road',
    hostUserId: hostUid,
    hostName: 'Mira Shah',
    ownerUserId: hostUid,
    hostUserIds: const [hostUid],
    hostProfiles: const [
      OrganizerHostProfile(
        uid: hostUid,
        displayName: 'Mira from Sea Face',
        role: OrganizerHostRole.owner,
      ),
    ],
    createdAt: DateTime(2025, 9),
    tags: const ['social run', 'coffee', 'new members'],
    memberCount: 412,
    rating: 4.9,
    reviewCount: 73,
  );

  static const profiles = <String, PublicProfile>{
    taylorUid: PublicProfile(
      uid: taylorUid,
      name: 'Taylor',
      age: 29,
      gender: Gender.woman,
      city: 'Mumbai',
      occupation: 'Product designer',
      company: 'Studio Sunday',
    ),
    morganUid: PublicProfile(
      uid: morganUid,
      name: 'Morgan',
      age: 31,
      gender: Gender.man,
      city: 'Mumbai',
      occupation: 'Founder',
      company: 'North Pier',
    ),
    guestUid: PublicProfile(
      uid: guestUid,
      name: 'Aarav',
      age: 30,
      gender: Gender.man,
      city: 'Mumbai',
      occupation: 'Chef',
      company: 'Long Table',
    ),
  };

  static final populatedMatches = <Match>[
    activeConversationMatch(),
    newMatch(),
    ownLatestMessageMatch(),
  ];

  static final hostInquiryMatches = <Match>[
    hostInquiryMatch(
      id: 'design-host-inquiry-unread',
      guestUid: guestUid,
      preview: 'Is there parking near the start?',
      unread: true,
      lastMessageAt: now.subtract(const Duration(minutes: 18)),
    ),
    hostInquiryMatch(
      id: 'design-host-inquiry-read',
      guestUid: 'design-chat-guest-2',
      preview: 'Do I need ID at check-in?',
      unread: false,
      lastMessageAt: now.subtract(const Duration(hours: 2)),
    ),
  ];

  static final conversationMessages = <ChatMessage>[
    message(
      id: 'msg-1',
      senderId: taylorUid,
      text: 'That final kilometer was harder than advertised.',
      sentAt: now.subtract(const Duration(minutes: 42)),
    ),
    message(
      id: 'msg-2',
      senderId: viewerUid,
      text: 'Worth it for the sea-facing coffee plan.',
      sentAt: now.subtract(const Duration(minutes: 40)),
    ),
    message(
      id: 'msg-3',
      senderId: taylorUid,
      text: 'Next week same route?',
      sentAt: now.subtract(const Duration(minutes: 33)),
    ),
    message(
      id: 'msg-4',
      senderId: viewerUid,
      text: 'Yes. I will book once the club posts it.',
      sentAt: now.subtract(const Duration(minutes: 30)),
    ),
  ];

  static final imageMessages = <ChatMessage>[
    message(
      id: 'msg-image-1',
      senderId: viewerUid,
      text: 'Route card from tonight.',
      imageUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      sentAt: now.subtract(const Duration(minutes: 12)),
    ),
    message(
      id: 'msg-image-2',
      senderId: taylorUid,
      text: 'Saved. This makes the meeting point obvious.',
      sentAt: now.subtract(const Duration(minutes: 10)),
    ),
  ];

  static const suvbotActions = <SuvbotActionItem>[
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

  static Match activeConversationMatch({
    String id = 'design-match-taylor',
    String otherUid = taylorUid,
    String preview = 'Next week same route?',
    String senderId = taylorUid,
    DateTime? lastMessageAt,
    Map<String, int> unreadCounts = const {viewerUid: 1},
  }) {
    return Match(
      id: id,
      user1Id: viewerUid,
      user2Id: otherUid,
      eventIds: const [eventId],
      createdAt: now.subtract(const Duration(days: 4)),
      lastMessageAt: lastMessageAt ?? now.subtract(const Duration(minutes: 33)),
      lastMessagePreview: preview,
      lastMessageSenderId: senderId,
      unreadCounts: unreadCounts,
    );
  }

  static Match newMatch({
    String id = 'design-match-morgan',
    String otherUid = morganUid,
  }) {
    return Match(
      id: id,
      user1Id: viewerUid,
      user2Id: otherUid,
      eventIds: const [eventId],
      createdAt: now.subtract(const Duration(hours: 5)),
    );
  }

  static Match ownLatestMessageMatch({
    String id = 'design-match-own-latest',
    String otherUid = 'design-chat-isha',
  }) {
    return Match(
      id: id,
      user1Id: viewerUid,
      user2Id: otherUid,
      eventIds: const [eventId],
      createdAt: now.subtract(const Duration(days: 6)),
      lastMessageAt: now.subtract(const Duration(hours: 3)),
      lastMessagePreview: 'Definitely. I liked the last 2 km push.',
      lastMessageSenderId: viewerUid,
      unreadCounts: const {viewerUid: 4},
    );
  }

  static Match blockedMatch() {
    return activeConversationMatch(id: 'design-match-blocked').copyWith(
      status: MatchStatus.blocked,
      blockedBy: taylorUid,
      blockedAt: now.subtract(const Duration(days: 1)),
    );
  }

  static Match hostInquiryMatch({
    required String id,
    required String guestUid,
    required String preview,
    required bool unread,
    required DateTime lastMessageAt,
  }) {
    return Match(
      id: id,
      user1Id: guestUid,
      user2Id: hostUid,
      eventIds: const [eventId],
      createdAt: now.subtract(const Duration(days: 1)),
      lastMessageAt: lastMessageAt,
      lastMessagePreview: preview,
      lastMessageSenderId: guestUid,
      unreadCounts: unread ? const {hostUid: 1} : const {},
      conversationType: MatchConversationType.organizerHostInquiry,
      organizerId: organizerId,
    );
  }

  static Match suvbotMatch() {
    return Match(
      id: '${suvbotUid}_$viewerUid',
      user1Id: suvbotUid,
      user2Id: viewerUid,
      eventIds: const ['suvbot'],
      createdAt: now.subtract(const Duration(days: 1)),
      lastMessageAt: now.subtract(const Duration(minutes: 3)),
      lastMessagePreview: 'I can refresh your seeded demo state.',
      lastMessageSenderId: suvbotUid,
      unreadCounts: const {viewerUid: 1},
    );
  }

  static ChatMessage message({
    required String id,
    required String senderId,
    required String text,
    DateTime? sentAt,
    String? imageUrl,
  }) {
    return ChatMessage(
      id: id,
      senderId: senderId,
      text: text,
      imageUrl: imageUrl,
      sentAt: sentAt,
    );
  }

  static PublicProfile profileFor(String uid) {
    return profiles[uid] ??
        PublicProfile(
          uid: uid,
          name: switch (uid) {
            'design-chat-isha' => 'Isha',
            'design-chat-guest-2' => 'Rhea',
            _ => 'Unknown',
          },
          age: 30,
          gender: Gender.woman,
          city: 'Mumbai',
        );
  }

  static NetworkException offlineException({required String action}) {
    return obviousOfflineException(
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: action,
        resource: 'matches',
      ),
    );
  }

  static Stream<T> loadingStream<T>() => Stream<T>.empty();

  static Stream<T> errorStream<T>(String message) =>
      Stream<T>.error(StateError(message), StackTrace.empty);
}

class MatchesChatFixtureMatchRepository implements MatchRepository {
  MatchesChatFixtureMatchRepository({
    required this.matches,
    Map<String, Match?>? matchById,
    this.matchesError,
    this.matchError,
  }) : matchById = matchById ?? {for (final match in matches) match.id: match};

  final List<Match> matches;
  final Map<String, Match?> matchById;
  final Object? matchesError;
  final Object? matchError;
  final markReadCalls = <({String matchId, String uid})>[];

  @override
  Stream<List<Match>> watchMatchesForUser({required String uid}) {
    final error = matchesError;
    if (error != null) {
      return Stream<List<Match>>.error(error, StackTrace.empty);
    }
    return Stream<List<Match>>.value(matches);
  }

  @override
  Future<CursorPage<Match, MatchPageCursor>> fetchMatchesForUserPage({
    required String uid,
    MatchPageCursor? startAfter,
    int limit = ReadLimitPolicy.historyPage,
  }) async {
    final error = matchesError;
    if (error != null) throw error;
    return CursorPage(items: matches.take(limit).toList(), hasMore: false);
  }

  @override
  Stream<Match?> watchMatch({required String matchId}) {
    final error = matchError;
    if (error != null) {
      return Stream<Match?>.error(error, StackTrace.empty);
    }
    return Stream<Match?>.value(matchById[matchId]);
  }

  @override
  Future<void> resetUnread({
    required String matchId,
    required String uid,
  }) async {
    markReadCalls.add((matchId: matchId, uid: uid));
  }
}

class MatchesChatFixtureConversationRepository
    implements ConversationRepository {
  MatchesChatFixtureConversationRepository({
    required this.messagesByConversationId,
    this.messagesError,
    this.loading = false,
    this.failSends = false,
  });

  final Map<String, List<ChatMessage>> messagesByConversationId;
  final Object? messagesError;
  final bool loading;
  final bool failSends;
  final sendCalls = <({String conversationId, String senderId, String text})>[];
  final imageCalls =
      <({String conversationId, String senderId, String messageId})>[];
  final markReadCalls = <({String conversationId, String uid})>[];

  @override
  Stream<List<ChatMessage>> watchMessages({required String conversationId}) {
    if (loading) return MatchesChatSurfaceFixtures.loadingStream();
    final error = messagesError;
    if (error != null) {
      return Stream<List<ChatMessage>>.error(error, StackTrace.empty);
    }
    return Stream<List<ChatMessage>>.value(
      messagesByConversationId[conversationId] ?? const [],
    );
  }

  @override
  Future<String> createMessageId({required String conversationId}) =>
      Future.value('$conversationId-design-message');

  @override
  Future<ConversationMessagePage> fetchMessagesPage({
    required String conversationId,
    ConversationMessageCursor? cursor,
  }) async => const ConversationMessagePage(messages: []);

  @override
  Future<void> sendTextMessage({
    required String conversationId,
    required String senderId,
    required String text,
    String? messageId,
  }) async {
    sendCalls.add((
      conversationId: conversationId,
      senderId: senderId,
      text: text,
    ));
    if (failSends) throw StateError('Design fixture send failed');
  }

  @override
  Future<void> sendImageMessage({
    required String conversationId,
    required String senderId,
    required String messageId,
    required String imageUrl,
  }) async {
    imageCalls.add((
      conversationId: conversationId,
      senderId: senderId,
      messageId: messageId,
    ));
    if (failSends) throw StateError('Design fixture image send failed');
  }

  @override
  Future<void> markRead({
    required String conversationId,
    required String uid,
  }) async {
    markReadCalls.add((conversationId: conversationId, uid: uid));
  }
}

class MatchesChatFixtureSuvbotRepository implements SuvbotRepository {
  const MatchesChatFixtureSuvbotRepository({
    this.actions = MatchesChatSurfaceFixtures.suvbotActions,
    this.loading = false,
    this.error,
  });

  final List<SuvbotActionItem> actions;
  final bool loading;
  final Object? error;

  @override
  Future<List<SuvbotActionItem>> fetchActions() async {
    if (loading) {
      return Future<List<SuvbotActionItem>>.delayed(const Duration(days: 1));
    }
    final error = this.error;
    if (error != null) throw error;
    return actions;
  }

  @override
  Future<void> requestAction({required String actionId, String? text}) async {}
}

class MatchesChatFixtureSafetyRepository implements SafetyRepository {
  const MatchesChatFixtureSafetyRepository();

  @override
  Stream<List<BlockedUser>> watchBlockedUsers({required String uid}) =>
      const Stream<List<BlockedUser>>.empty();

  @override
  Future<Set<String>> fetchBlockedUserIds({required String uid}) async =>
      const <String>{};

  @override
  Future<void> blockUser({
    required String targetUserId,
    String source = 'profile',
  }) async {}

  @override
  Future<void> unblockUser({required String targetUserId}) async {}

  @override
  Future<void> reportUser({
    required String targetUserId,
    String source = 'profile',
    String? reasonCode,
    String? contextId,
    String? notes,
  }) async {}

  @override
  Future<void> requestAccountDeletion() async {}
}
