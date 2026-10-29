import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ActivityNotificationRepository', () {
    late FakeFirebaseFirestore firestore;
    late ActivityNotificationRepository repository;

    setUp(() {
      firestore = FakeFirebaseFirestore();
      repository = ActivityNotificationRepository(firestore);
    });

    test(
      'watchActivity returns newest user-scoped notifications first',
      () async {
        final older = _notification(id: 'older', createdAt: DateTime(2026, 5));
        final newer = _notification(
          id: 'newer',
          createdAt: DateTime(2026, 5, 2),
        );
        await _seedNotification(firestore, older);
        await _seedNotification(firestore, newer);
        await _seedNotification(
          firestore,
          _notification(
            id: 'other-user',
            uid: 'runner-2',
            createdAt: DateTime(2026, 5, 3),
          ),
        );

        await expectLater(
          repository.watchActivity(uid: 'runner-1'),
          emits([newer, older]),
        );
      },
    );

    test('watchActivity filters chat message notifications', () async {
      final match = _notification(id: 'match');
      final message = _notification(
        id: 'message',
        type: ActivityNotificationType.message,
      );
      await _seedNotification(firestore, match);
      await _seedNotification(firestore, message);

      await expectLater(
        repository.watchActivity(uid: 'runner-1'),
        emits([match]),
      );
    });

    test('markAllRead updates only unread notification docs', () async {
      final unread = _notification(id: 'unread');
      final readAt = DateTime(2026, 5, 2);
      final alreadyRead = _notification(id: 'read', readAt: readAt);
      await _seedNotification(firestore, unread);
      await _seedNotification(firestore, alreadyRead);

      await repository.markAllRead(
        uid: 'runner-1',
        notifications: [unread, alreadyRead],
      );

      final unreadDoc = await firestore
          .collection('notifications')
          .doc('runner-1')
          .collection('items')
          .doc('unread')
          .get();
      final readDoc = await firestore
          .collection('notifications')
          .doc('runner-1')
          .collection('items')
          .doc('read')
          .get();

      expect(unreadDoc.data()?['readAt'], isNotNull);
      expect((readDoc.data()?['readAt'] as Timestamp).toDate(), readAt);
    });
  });

  test('watchActivityNotificationsProvider uses repository seam', () async {
    final fakeRepository = _FakeActivityNotificationRepository([
      _notification(id: 'notification-1'),
    ]);
    final container = ProviderContainer(
      overrides: [
        activityNotificationRepositoryProvider.overrideWithValue(
          fakeRepository,
        ),
      ],
    );
    addTearDown(container.dispose);

    final provider = watchActivityNotificationsProvider('runner-1');
    final subscription = container
        .listen<AsyncValue<List<ActivityNotification>>>(provider, (_, _) {});
    addTearDown(subscription.close);

    final notifications = await container.read(provider.future);

    expect(notifications.map((notification) => notification.id), [
      'notification-1',
    ]);
  });
}

class _FakeActivityNotificationRepository extends Fake
    implements ActivityNotificationRepository {
  _FakeActivityNotificationRepository(this.notifications);

  final List<ActivityNotification> notifications;

  @override
  Stream<List<ActivityNotification>> watchActivity({
    required String uid,
    int limit = 50,
  }) => Stream.value(notifications);

  @override
  Future<void> markAllRead({
    required String uid,
    required Iterable<ActivityNotification> notifications,
  }) async {}
}

ActivityNotification _notification({
  required String id,
  String uid = 'runner-1',
  ActivityNotificationType type = ActivityNotificationType.match,
  DateTime? createdAt,
  DateTime? readAt,
}) {
  return ActivityNotification(
    id: id,
    uid: uid,
    type: type,
    title: "It's a catch",
    body: 'You and Runner Two matched. Say hi!',
    createdAt: createdAt ?? DateTime(2026, 5, 1, 10),
    readAt: readAt,
    matchId: 'match-1',
    eventId: 'event-1',
    actorUid: 'runner-2',
    actorName: 'Runner Two',
  );
}

Future<void> _seedNotification(
  FakeFirebaseFirestore firestore,
  ActivityNotification notification,
) {
  return firestore
      .collection('notifications')
      .doc(notification.uid)
      .collection('items')
      .doc(notification.id)
      .set(notification.toJson());
}
