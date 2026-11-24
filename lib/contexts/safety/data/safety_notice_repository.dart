import 'package:catch_dating_app/contexts/safety/domain/safety_notice.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show SubmitSafetyAppealCallableRequest;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/contexts/safety/domain/safety_notice.dart';

part 'safety_notice_repository.g.dart';

/// The safety notices Catch writes to an account, and the appeal of the
/// decision one of them is about.
class SafetyNoticeRepository {
  const SafetyNoticeRepository(this._db, this._functions);

  static const _rootCollectionPath = 'accountSafetyNotices';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  /// The account newest notices first, as many as one history page.
  Stream<List<SafetyNotice>> watchNotices({
    required String uid,
    int limit = ReadLimitPolicy.historyPage,
  }) => withBackendErrorStream(
    () => _db
        .collection(_rootCollectionPath)
        .doc(uid)
        .collection('items')
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .snapshots()
        .map(
          (snap) => List<SafetyNotice>.unmodifiable(
            snap.docs
                .map((doc) => SafetyNotice.fromFirestore(doc.id, doc.data()))
                .nonNulls,
          ),
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch safety notices',
      resource: _rootCollectionPath,
    ),
  );

  /// Appeals the decision [actionId] names, once. The server refuses with
  /// failed-precondition when it was already appealed or is no longer in
  /// force.
  Future<void> submitAppeal({required String actionId, required String text}) =>
      withBackendErrorContext(
        () => _functions
            .httpsCallable('submitSafetyAppeal')
            .call<Object?>(
              SubmitSafetyAppealCallableRequest(
                actionId: actionId,
                text: text,
              ).toJson(),
            ),
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'send appeal',
          resource: 'accountSafetyActions',
        ),
      );
}

@riverpod
SafetyNoticeRepository safetyNoticeRepository(Ref ref) =>
    SafetyNoticeRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(firebaseFunctionsProvider),
    );

@riverpod
Stream<List<SafetyNotice>> watchSafetyNotices(Ref ref, String uid) =>
    ref.watch(safetyNoticeRepositoryProvider).watchNotices(uid: uid);
