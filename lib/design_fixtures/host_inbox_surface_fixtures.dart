// copy:allow-file(Widgetbook and capture-only deterministic fixture data)
import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';

/// Deterministic Host Inbox fixtures shared by Widgetbook and UI captures.
final class HostInboxSurfaceFixtures {
  const HostInboxSurfaceFixtures._();

  static const hostUid = 'host-inbox-host';
  static const clubId = 'host-inbox-club';
  static const eventId = 'host-inbox-trivia';
  static const bookedOneUid = 'host-inbox-booked-1';
  static const bookedTwoUid = 'host-inbox-booked-2';
  static const requestedUid = 'host-inbox-requested-1';
  static const waitlistedUid = 'host-inbox-waitlisted-1';
  static const generalUid = 'host-inbox-general-1';
  static const inquiryOnlyUid = 'host-inbox-inquiry-only-1';

  static final now = DateTime(2026, 7, 14, 18);

  static final club = Club(
    id: clubId,
    name: 'Quiz House Social',
    description: 'Small-team trivia nights for curious people.',
    location: 'Mumbai',
    area: 'Bandra West',
    hostUserId: hostUid,
    hostName: 'Mira Shah',
    ownerUserId: hostUid,
    hostUserIds: const [hostUid],
    hostProfiles: const [
      ClubHostProfile(
        uid: hostUid,
        displayName: 'Mira Shah',
        role: ClubHostRole.owner,
      ),
    ],
    createdAt: DateTime(2025, 9),
    tags: const ['trivia', 'new members', 'small teams'],
    memberCount: 186,
    rating: 4.8,
    reviewCount: 41,
  );

  static final event = Event(
    id: eventId,
    clubId: clubId,
    startTime: DateTime(2026, 7, 14, 20),
    endTime: DateTime(2026, 7, 14, 22),
    meetingPoint: 'The Reading Room, Bandra',
    meetingLocation: const EventMeetingLocation(
      name: 'The Reading Room, Bandra',
      latitude: 19.0596,
      longitude: 72.8295,
      notes: 'Upstairs, beside the blue team board.',
    ),
    startingPointLat: 19.0596,
    startingPointLng: 72.8295,
    locationDetails: 'Upstairs, beside the blue team board.',
    eventFormat: const EventFormatSnapshot(
      activityKind: ActivityKind.pubQuiz,
      interactionModel: EventInteractionModel.teamRotations,
      customActivityLabel: 'Trivia Night',
    ),
    distanceKm: 0,
    pace: PaceLevel.easy,
    capacityLimit: 40,
    description: 'Tuesday trivia with small rotating teams.',
    priceInPaise: 0,
    bookedCount: 24,
    waitlistedCount: 9,
  );

  static final allThreads = ChatsListViewModel(
    newMatches: const [],
    conversations: [
      _thread(
        id: 'host-inbox-thread-booked-1',
        uid: bookedOneUid,
        name: 'Dev Patel',
        preview: 'See you tonight!',
        minutesAgo: 180,
      ),
      _thread(
        id: 'host-inbox-thread-booked-2',
        uid: bookedTwoUid,
        name: "Mira D'Souza",
        preview: 'Can I bring a +1?',
        minutesAgo: 60,
        unreadCount: 1,
      ),
      _thread(
        id: 'host-inbox-thread-requested-1',
        uid: requestedUid,
        name: 'Kabir Sen',
        preview: 'Is there still room for one more teammate?',
        minutesAgo: 52,
        unreadCount: 1,
      ),
      _thread(
        id: 'host-inbox-thread-waitlisted-1',
        uid: waitlistedUid,
        name: 'Naina Shah',
        preview: 'When will the waitlist move?',
        minutesAgo: 91,
      ),
      _thread(
        id: 'host-inbox-thread-general-1',
        uid: generalUid,
        name: 'Devika Bose',
        preview: 'Do you run trivia nights every week?',
        minutesAgo: 140,
        eventScoped: false,
      ),
    ],
    totalThreadCount: 5,
  );

  static const noThreads = ChatsListViewModel(
    newMatches: [],
    conversations: [],
    totalThreadCount: 0,
  );

  static final newInquiryThread = ChatsListViewModel(
    newMatches: [
      _thread(
        id: 'host-inbox-thread-inquiry-only-1',
        uid: inquiryOnlyUid,
        name: 'Rhea Kapoor',
        preview: 'New event question',
        minutesAgo: 4,
        hasConversation: false,
      ),
    ],
    conversations: const [],
    totalThreadCount: 1,
  );

  static final participations = <EventParticipation>[
    for (var index = 0; index < 24; index += 1)
      _participation(
        uid: switch (index) {
          0 => bookedOneUid,
          1 => bookedTwoUid,
          _ => 'host-inbox-booked-${index + 1}',
        },
        status: EventParticipationStatus.signedUp,
      ),
    for (var index = 0; index < 9; index += 1)
      _participation(
        uid: switch (index) {
          0 => requestedUid,
          1 => waitlistedUid,
          _ => 'host-inbox-waitlisted-${index + 1}',
        },
        status: EventParticipationStatus.waitlisted,
        hostApprovalStatus: index == 0 ? EventJoinRequestStatus.pending : null,
      ),
  ];

  static ChatThreadPreview _thread({
    required String id,
    required String uid,
    required String name,
    required String preview,
    required int minutesAgo,
    int unreadCount = 0,
    bool eventScoped = true,
    bool hasConversation = true,
  }) {
    final eventIds = eventScoped ? const [eventId] : const <String>[];
    final timestamp = now.subtract(Duration(minutes: minutesAgo));
    final match = Match(
      id: id,
      user1Id: uid,
      user2Id: hostUid,
      eventIds: eventIds,
      createdAt: now.subtract(const Duration(days: 2)),
      lastMessageAt: hasConversation ? timestamp : null,
      lastMessagePreview: hasConversation ? preview : null,
      lastMessageSenderId: hasConversation ? uid : null,
      unreadCounts: unreadCount == 0 ? const {} : {hostUid: unreadCount},
      conversationType: MatchConversationType.clubHostInquiry,
      clubId: clubId,
    );
    return ChatThreadPreview(
      match: match,
      matchId: match.id,
      otherUid: uid,
      displayName: name,
      photoUrl: null,
      previewText: preview,
      timestamp: timestamp,
      unreadCount: unreadCount,
      hasConversation: hasConversation,
      eventIds: eventIds,
    );
  }

  static EventParticipation _participation({
    required String uid,
    required EventParticipationStatus status,
    EventJoinRequestStatus? hostApprovalStatus,
  }) => EventParticipation(
    id: '${eventId}_$uid',
    eventId: eventId,
    clubId: clubId,
    uid: uid,
    status: status,
    createdAt: now.subtract(const Duration(days: 3)),
    updatedAt: now.subtract(const Duration(hours: 2)),
    signedUpAt: status == EventParticipationStatus.signedUp
        ? now.subtract(const Duration(days: 3))
        : null,
    waitlistedAt: status == EventParticipationStatus.waitlisted
        ? now.subtract(const Duration(days: 2))
        : null,
    hostApprovalStatus: hostApprovalStatus,
  );
}
