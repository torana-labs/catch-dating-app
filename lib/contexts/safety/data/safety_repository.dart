import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/safety/domain/blocked_user.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show
        BlockUserCallableRequest,
        ReportUserCallableRequest,
        UnblockUserCallableRequest;
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/safety/domain/blocked_user.dart';

part 'safety_repository.g.dart';

class SafetyRepository {
  const SafetyRepository(this._db, this._functions, this._auth);

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;
  final FirebaseAuth _auth;

  // ── Read ──────────────────────────────────────────────────────────────────

  Stream<List<BlockedUser>> watchBlockedUsers({required String uid}) =>
      withBackendErrorStream(
        () => _db
            .collection('blocks')
            .where('blockerUserId', isEqualTo: uid)
            .orderBy('createdAt', descending: true)
            .limit(ReadLimitPolicy.boundedWorkingSet)
            .snapshots()
            .map(
              (snap) => snap.docs
                  .map((doc) => BlockedUser.fromFirestore(doc.data()))
                  .toList(),
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch blocked users',
          resource: 'blocks',
        ),
      );

  Future<Set<String>> fetchBlockedUserIds({
    required String uid,
  }) => withBackendErrorContext(
    () async {
      final outgoing = await _db
          .collection('blocks')
          .where('blockerUserId', isEqualTo: uid)
          .limit(ReadLimitPolicy.boundedWorkingSet)
          .get();
      final incoming = await _db
          .collection('blocks')
          .where('blockedUserId', isEqualTo: uid)
          .limit(ReadLimitPolicy.boundedWorkingSet)
          .get();

      return {
        ...outgoing.docs.map((doc) => doc.data()['blockedUserId'] as String),
        ...incoming.docs.map((doc) => doc.data()['blockerUserId'] as String),
      };
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'fetch blocked users',
      resource: 'blocks',
    ),
  );

  // ── Write ─────────────────────────────────────────────────────────────────

  Future<void> blockUser({
    required String targetUserId,
    String source = 'profile',
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('blockUser')
        .call(
          BlockUserCallableRequest(
            targetUserId: targetUserId,
            source: source,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'block user',
      resource: 'blocks',
    ),
  );

  Future<void> unblockUser({required String targetUserId}) =>
      withBackendErrorContext(
        () => _functions
            .httpsCallable('unblockUser')
            .call(
              UnblockUserCallableRequest(targetUserId: targetUserId).toJson(),
            ),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'unblock user',
          resource: 'blocks',
        ),
      );

  Future<void> reportUser({
    required String targetUserId,
    String source = 'profile',
    String? reasonCode,
    String? contextId,
    String? notes,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('reportUser')
        .call(
          ReportUserCallableRequest(
            targetUserId: targetUserId,
            source: source,
            reasonCode: reasonCode,
            contextId: contextId,
            notes: notes,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'report user',
      resource: 'reports',
    ),
  );

  Future<void> requestAccountDeletion() => withBackendErrorContext(
    () async {
      await _functions.httpsCallable('requestAccountDeletion').call<void>();
      await _auth.signOut();
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'request account deletion',
      resource: 'users',
    ),
  );
}

@riverpod
SafetyRepository safetyRepository(Ref ref) => SafetyRepository(
  ref.watch(firebaseFirestoreProvider),
  ref.watch(firebaseFunctionsProvider),
  ref.watch(firebaseAuthProvider),
);

@riverpod
Stream<List<BlockedUser>> watchBlockedUsers(Ref ref) {
  final uidAsync = ref.watch(uidProvider);
  return switch (uidAsync) {
    AsyncData(:final value) =>
      value == null
          ? const Stream<List<BlockedUser>>.empty()
          : ref.watch(safetyRepositoryProvider).watchBlockedUsers(uid: value),
    AsyncError(:final error, :final stackTrace) =>
      Stream<List<BlockedUser>>.error(error, stackTrace),
    _ => const Stream<List<BlockedUser>>.empty(),
  };
}
