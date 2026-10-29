import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'activity_notification_repository.g.dart';

class ActivityNotificationRepository {
  const ActivityNotificationRepository(this._db);

  static const _rootCollectionPath = 'notifications';
  static const _itemsCollectionPath = 'items';

  final FirebaseFirestore _db;

  CollectionReference<ActivityNotification> _itemsRef(String uid) => _db
      .collection(_rootCollectionPath)
      .doc(uid)
      .collection(_itemsCollectionPath)
      .withDocumentIdConverter<ActivityNotification>(
        idField: 'id',
        fromJson: ActivityNotification.fromJson,
        toJson: (notification) => notification.toJson(),
      );

  Stream<List<ActivityNotification>> watchActivity({
    required String uid,
    int limit = ReadLimitPolicy.historyPage,
  }) => withBackendErrorStream(
    () => _itemsRef(uid)
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .snapshots()
        .map(
          (snap) => snap.docs
              .map((doc) => doc.data())
              .where((notification) => notification.isVisibleInActivity)
              .toList(),
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch activity notifications',
      resource: _rootCollectionPath,
    ),
  );

  Future<
    CursorPage<ActivityNotification, DocumentSnapshot<ActivityNotification>>
  >
  fetchActivityPage({
    required String uid,
    DocumentSnapshot<ActivityNotification>? startAfter,
    int limit = ReadLimitPolicy.historyPage,
  }) => withBackendErrorContext(
    () async {
      final page = await _itemsRef(uid)
          .orderBy('createdAt', descending: true)
          .fetchDocumentCursorPage(
            limit: limit,
            startAfter: startAfter,
            errorContext: const BackendErrorContext(
              service: BackendService.firestore,
              action: 'fetch activity notification page',
              resource: _rootCollectionPath,
            ),
          );
      return CursorPage(
        items: List.unmodifiable(
          page.items
              .map((document) => document.data())
              .where((notification) => notification.isVisibleInActivity),
        ),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'fetch activity notification page',
      resource: _rootCollectionPath,
    ),
  );

  Future<void> markAllRead({
    required String uid,
    required Iterable<ActivityNotification> notifications,
  }) => withBackendErrorContext(
    () async {
      final unread = notifications
          .where((notification) => notification.isUnread)
          .toList(growable: false);
      if (unread.isEmpty) return;
      // Mark every unread item read in one atomic batch instead of N
      // independent best-effort updates that can partially fail.
      final batch = _db.batch();
      final items = _itemsRef(uid);
      for (final notification in unread) {
        batch.update(items.doc(notification.id), {
          'readAt': FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'mark activity read',
      resource: _rootCollectionPath,
    ),
  );
}

@riverpod
ActivityNotificationRepository activityNotificationRepository(Ref ref) =>
    ActivityNotificationRepository(ref.watch(firebaseFirestoreProvider));

@riverpod
Stream<List<ActivityNotification>> watchActivityNotifications(
  Ref ref,
  String uid,
) => ref.watch(activityNotificationRepositoryProvider).watchActivity(uid: uid);
