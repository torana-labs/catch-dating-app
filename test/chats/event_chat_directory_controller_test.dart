import 'dart:async';

import 'package:catch_dating_app/chats/presentation/inbox/event_chat_directory_controller.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_directory_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class DirectoryRepository extends Fake implements EventChatDirectoryRepository {
  final rows = <String, StreamController<List<EventChatAccess>>>{};
  @override
  Stream<List<EventChatAccess>> watch(String uid, DateTime Function() now) =>
      (rows[uid] ??= StreamController<List<EventChatAccess>>()).stream;
}

Map<String, Object?> entry({
  String role = 'attendee',
  String roomStatus = 'open',
  int? opensAtMillis,
  int? closesAtMillis,
  String membership = 'joined',
  bool claimed = true,
}) => {
  'schemaVersion': 1,
  'uid': 'person',
  'eventId': 'event-1',
  'organizerId': 'organizer-1',
  'title': 'Demo event',
  'role': role,
  'eventStartAtMillis': 2000,
  'room': {
    'status': roomStatus,
    'revision': 3,
    'opensAtMillis': opensAtMillis,
    'closesAtMillis': closesAtMillis,
  },
  'membership': {
    'status': membership,
    'revision': 2,
    'notificationsMuted': false,
  },
  'profileClaimed': claimed,
  'termsVersion': 'event-chat-v1',
  'updatedAtMillis': 1000,
};

void main() {
  final now = DateTime.fromMillisecondsSinceEpoch(10000);

  group('a directory row derives access as Functions does', () {
    test('a joined, claimed guest in an open room reads and posts', () {
      final access = EventChatAccess.fromDirectoryEntry(entry(), now: now);
      expect(access.roomStatus, 'open');
      expect(access.canReadMessages, isTrue);
      expect(access.canPostMessages, isTrue);
      expect(access.canManage, isFalse);
      expect(access.roomRevision, 3);
      expect(access.membershipRevision, 2);
    });

    test('a scheduled window opens and closes on the clock', () {
      final before = EventChatAccess.fromDirectoryEntry(
        entry(opensAtMillis: 20000, closesAtMillis: 30000),
        now: now,
      );
      expect(before.roomStatus, 'scheduled');
      expect(before.canReadMessages, isFalse);
      expect(before.canJoin, isFalse);
      final after = EventChatAccess.fromDirectoryEntry(
        entry(opensAtMillis: 1000, closesAtMillis: 5000),
        now: now,
      );
      expect(after.roomStatus, 'closed');
    });

    test('announcements-only rooms let only hosts post', () {
      final guest = EventChatAccess.fromDirectoryEntry(
        entry(roomStatus: 'announcementsOnly'),
        now: now,
      );
      expect(guest.canReadMessages, isTrue);
      expect(guest.canPostMessages, isFalse);
      final host = EventChatAccess.fromDirectoryEntry(
        entry(roomStatus: 'announcementsOnly', role: 'host'),
        now: now,
      );
      expect(host.canPostMessages, isTrue);
      expect(host.canManage, isTrue);
    });

    test('an unclaimed or removed person cannot join', () {
      final unclaimed = EventChatAccess.fromDirectoryEntry(
        entry(claimed: false, membership: 'notJoined'),
        now: now,
      );
      expect(unclaimed.profileClaimRequired, isTrue);
      expect(unclaimed.canJoin, isFalse);
      final removed = EventChatAccess.fromDirectoryEntry(
        entry(membership: 'removed'),
        now: now,
      );
      expect(removed.canJoin, isFalse);
      expect(removed.canReadMessages, isFalse);
      final notCreated = EventChatAccess.fromDirectoryEntry(
        entry(roomStatus: 'notCreated', membership: 'notJoined'),
        now: now,
      );
      expect(notCreated.isRoomOpen, isFalse);
      expect(notCreated.canJoin, isFalse);
    });
  });

  test('the directory follows the signed-in account', () async {
    final repository = DirectoryRepository();
    final accounts = StreamController<String?>();
    addTearDown(accounts.close);
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((_) => accounts.stream),
        eventChatDirectoryRepositoryProvider.overrideWithValue(repository),
      ],
    );
    addTearDown(container.dispose);
    container.listen(eventChatDirectoryProvider, (_, _) {});
    accounts.add('person');
    await flushTestEventQueue();
    repository.rows['person']!.add([
      EventChatAccess.fromDirectoryEntry(entry(), now: now),
    ]);
    await flushTestEventQueue();
    expect(
      container.read(eventChatDirectoryProvider).requireValue,
      hasLength(1),
    );
    accounts.add('other');
    await flushTestEventQueue();
    repository.rows['other']!.add(const []);
    await flushTestEventQueue();
    expect(container.read(eventChatDirectoryProvider).requireValue, isEmpty);
    accounts.add(null);
    await flushTestEventQueue();
    expect(
      container.read(eventChatDirectoryProvider).error,
      isA<SignInRequiredException>(),
    );
  });
}
