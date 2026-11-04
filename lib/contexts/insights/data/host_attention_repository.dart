import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_attention_repository.g.dart';

abstract interface class HostAttentionRepository {
  /// The organizer's Today attention queue as the server last evaluated it:
  /// its open rows plus the evaluation schedule. Emits on every change.
  Stream<HostAttentionProjection> watch(String organizerId);
}

class FirebaseHostAttentionRepository implements HostAttentionRepository {
  const FirebaseHostAttentionRepository(this._db);

  static const _itemsPath = 'organizerAttentionItems';
  static const _schedulesPath = 'organizerAttentionSchedules';

  final FirebaseFirestore _db;

  // Each listener carries its own error context. The outer context covers
  // combining them; an error a listener already mapped passes through it
  // unchanged (normalizeBackendError returns an AppException as it is).
  @override
  Stream<HostAttentionProjection> watch(String organizerId) =>
      withBackendErrorStream(
        () => combineLatest(
          _openItems(organizerId),
          _schedule(organizerId),
          (items, schedule) => HostAttentionProjection.fromFirestore(
            organizerId: organizerId,
            items: items,
            schedule: schedule,
          ),
        ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch the Host Today attention queue',
          resource: _itemsPath,
        ),
      );

  // The server never keeps more open rows than its 400-row cap.
  // firestore-index: organizerAttentionItems (organizerId:ASCENDING,status:ASCENDING,dueAt:ASCENDING,__name__:ASCENDING)
  Stream<List<HostAttentionItem>> _openItems(String organizerId) =>
      withBackendErrorStream(
        () => _db
            .collection(_itemsPath)
            .where('organizerId', isEqualTo: organizerId)
            .where('status', isEqualTo: 'open')
            .orderBy('dueAt')
            .orderBy(FieldPath.documentId)
            .limit(ReadLimitPolicy.hostAttentionQueue)
            .snapshots()
            .map(
              (snapshot) => [
                for (final doc in snapshot.docs)
                  HostAttentionItem.fromFirestore(doc.id, doc.data()),
              ],
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch the Host Today attention queue',
          resource: _itemsPath,
        ),
      );

  Stream<Map<String, Object?>?> _schedule(String organizerId) =>
      withBackendErrorStream(
        () => _db
            .collection(_schedulesPath)
            .doc(organizerId)
            .snapshots()
            .map((snapshot) => snapshot.data()),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch the Host Today attention schedule',
          resource: _schedulesPath,
        ),
      );
}

@riverpod
HostAttentionRepository hostAttentionRepository(Ref ref) =>
    FirebaseHostAttentionRepository(ref.watch(firebaseFirestoreProvider));

/// The Today attention queue read owner. It is a Firestore listener: it
/// declares no cache tags or lifetime, and writes never invalidate it.
@riverpod
Stream<HostAttentionProjection> hostAttentionProjection(
  Ref ref,
  String organizerId,
) => ref.watch(hostAttentionRepositoryProvider).watch(organizerId);
