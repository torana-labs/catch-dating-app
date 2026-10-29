import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/data/cursor_page.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'payment_history_repository.g.dart';

class PaymentHistoryRepository {
  const PaymentHistoryRepository(this._db);

  static const _collectionPath = 'payments';

  final FirebaseFirestore _db;

  CollectionReference<Payment> get _paymentsRef => _db
      .collection(_collectionPath)
      .withDocumentIdConverter<Payment>(
        idField: 'id',
        fromJson: Payment.fromJson,
        toJson: (payment) => payment.toJson(),
      );

  // ── Read ──────────────────────────────────────────────────────────────────

  Stream<List<Payment>> watchPaymentsForUser(String userId) =>
      withBackendErrorStream(
        // firestore-index: payments (userId:ASCENDING,createdAt:DESCENDING)
        () => _paymentsRef
            .where('userId', isEqualTo: userId)
            .orderBy('createdAt', descending: true)
            .limit(ReadLimitPolicy.historyPage)
            .snapshots()
            .map((snap) => snap.docs.map((d) => d.data()).toList()),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch payment history',
          resource: _collectionPath,
        ),
      );

  Future<List<Payment>> fetchPaymentsForUser(String userId) async =>
      (await fetchPaymentsForUserPage(userId: userId)).items;

  Future<CursorPage<Payment, DocumentSnapshot<Payment>>>
  fetchPaymentsForUserPage({
    required String userId,
    DocumentSnapshot<Payment>? startAfter,
    int limit = ReadLimitPolicy.historyPage,
  }) => withBackendErrorContext(
    () async {
      // firestore-index: payments (userId:ASCENDING,createdAt:DESCENDING)
      final page = await _paymentsRef
          .where('userId', isEqualTo: userId)
          .orderBy('createdAt', descending: true)
          .fetchDocumentCursorPage(
            limit: limit,
            startAfter: startAfter,
            errorContext: const BackendErrorContext(
              service: BackendService.firestore,
              action: 'fetch payment history page',
              resource: _collectionPath,
            ),
          );
      return CursorPage(
        items: List.unmodifiable(page.items.map((document) => document.data())),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'fetch payment history page',
      resource: _collectionPath,
    ),
  );

  Stream<Payment?> watchPayment(String paymentId) => withBackendErrorStream(
    () => _paymentsRef
        .doc(paymentId)
        .snapshots()
        .map((snap) => snap.exists ? snap.data() : null),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch payment',
      resource: _collectionPath,
    ),
  );

  /// Returns the payment record for a specific event, if any.
  Future<Payment?> fetchPaymentForEvent({
    required String userId,
    required String eventId,
  }) => withBackendErrorContext(
    () async {
      // firestore-index: payments (userId:ASCENDING,eventId:ASCENDING,status:ASCENDING,signUpFailed:ASCENDING,createdAt:DESCENDING)
      final snap = await _paymentsRef
          .where('userId', isEqualTo: userId)
          .where('eventId', isEqualTo: eventId)
          .where('status', isEqualTo: PaymentStatus.completed.name)
          .where('signUpFailed', isEqualTo: false)
          .orderBy('createdAt', descending: true)
          .limit(ReadLimitPolicy.lookup)
          .get();
      return selectLatestSuccessfulPayment(snap.docs.map((doc) => doc.data()));
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'fetch event payment',
      resource: _collectionPath,
    ),
  );
}

Payment? selectLatestSuccessfulPayment(Iterable<Payment> payments) {
  final completedPayments =
      payments
          .where(
            (payment) =>
                payment.status == PaymentStatus.completed &&
                !payment.signUpFailed,
          )
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  return completedPayments.firstOrNull;
}

@riverpod
PaymentHistoryRepository paymentHistoryRepository(Ref ref) =>
    PaymentHistoryRepository(ref.watch(firebaseFirestoreProvider));

@riverpod
Stream<List<Payment>> watchPaymentsForUser(Ref ref, String userId) =>
    ref.watch(paymentHistoryRepositoryProvider).watchPaymentsForUser(userId);

@riverpod
Stream<Payment?> watchPayment(Ref ref, String paymentId) =>
    ref.watch(paymentHistoryRepositoryProvider).watchPayment(paymentId);
