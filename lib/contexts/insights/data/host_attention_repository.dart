import 'dart:async';

import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
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

  @override
  Stream<HostAttentionProjection> watch(String organizerId) =>
      withBackendErrorStream(
        () => _combineLatest(
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
  Stream<List<HostAttentionItem>> _openItems(String organizerId) => _db
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
      );

  Stream<Map<String, Object?>?> _schedule(String organizerId) => _db
      .collection(_schedulesPath)
      .doc(organizerId)
      .snapshots()
      .map((snapshot) => snapshot.data());
}

/// Emits [combine] of the latest value of each stream once both have
/// emitted, and again whenever either emits. Errors pass through.
Stream<R> _combineLatest<A, B, R>(
  Stream<A> first,
  Stream<B> second,
  R Function(A first, B second) combine,
) {
  late final StreamController<R> controller;
  StreamSubscription<A>? firstSubscription;
  StreamSubscription<B>? secondSubscription;
  (A,)? latestFirst;
  (B,)? latestSecond;
  var openStreams = 2;

  void emit() {
    final a = latestFirst;
    final b = latestSecond;
    if (a == null || b == null) return;
    try {
      controller.add(combine(a.$1, b.$1));
    } on Object catch (error, stackTrace) {
      controller.addError(error, stackTrace);
    }
  }

  void done() {
    openStreams -= 1;
    if (openStreams == 0) unawaited(controller.close());
  }

  controller = StreamController<R>(
    onListen: () {
      firstSubscription = first.listen(
        (value) {
          latestFirst = (value,);
          emit();
        },
        onError: controller.addError,
        onDone: done,
      );
      secondSubscription = second.listen(
        (value) {
          latestSecond = (value,);
          emit();
        },
        onError: controller.addError,
        onDone: done,
      );
    },
    onPause: () {
      firstSubscription?.pause();
      secondSubscription?.pause();
    },
    onResume: () {
      firstSubscription?.resume();
      secondSubscription?.resume();
    },
    onCancel: () => Future.wait([
      ?firstSubscription?.cancel(),
      ?secondSubscription?.cancel(),
    ]),
  );
  return controller.stream;
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
