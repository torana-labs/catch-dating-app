import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_billing_status.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_organizer_bills_repository.g.dart';

/// Catch's bills to one organizer, newest first, from the owner's
/// `hostOrganizerBillViews`, and its billing status from the owner's
/// `hostOrganizerBillingViews` (#2306) instead of `getOrganizerBillingStatus`.
/// Only the organizer's owner may read either.
class HostOrganizerBillsRepository {
  const HostOrganizerBillsRepository(
    this._firestore, [
    this._clock = const AppClock(),
  ]);

  static const views = 'hostOrganizerBillViews';
  static const billingViews = 'hostOrganizerBillingViews';
  static final _documentId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$');

  final FirebaseFirestore _firestore;
  final AppClock _clock;

  /// The newest [ReadLimitPolicy.historyPage] bills (one a month: years of
  /// billing), updated while listened to, so a bill paid elsewhere loses
  /// its payment link on screen.
  // firestore-index: hostOrganizerBillViews(organizerId:ASCENDING, periodEndMillis:DESCENDING, month:DESCENDING)
  Stream<List<HostOrganizerBill>> watch(String organizerId) {
    if (!_documentId.hasMatch(organizerId)) {
      throw ArgumentError.value(organizerId, 'organizerId');
    }
    return withBackendErrorStream(
      () => _firestore
          .collection(views)
          .where('organizerId', isEqualTo: organizerId)
          .orderBy('periodEndMillis', descending: true)
          .orderBy('month', descending: true)
          .limit(ReadLimitPolicy.historyPage)
          .snapshots()
          .map(
            (snapshot) => [
              for (final doc in snapshot.docs)
                _bill(organizerId, doc.id, doc.data()),
            ],
          ),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch organizer bills',
        resource: views,
      ),
    );
  }

  static HostOrganizerBill _bill(
    String organizerId,
    String billId,
    Map<String, Object?> data,
  ) {
    final bill = data['bill'];
    if (data['version'] != 1 ||
        data['organizerId'] != organizerId ||
        data['billId'] != billId ||
        bill is! Map) {
      throw const FormatException('Organizer bill view changed identity');
    }
    return HostOrganizerBill.fromJson(Map<String, Object?>.from(bill));
  }

  /// The free trial and plan, live. Status only, never prices. The trial
  /// state and days left are worked out from the view's facts and the app
  /// clock, and rebuilt when they change by time alone.
  Stream<HostOrganizerBillingStatus> watchStatus(String organizerId) {
    if (!_documentId.hasMatch(organizerId)) {
      throw ArgumentError.value(organizerId, 'organizerId');
    }
    return withBackendErrorStream(
      () =>
          clockedListener<
                Map<String, Object?>,
                ({HostOrganizerBillingStatus status, DateTime? next})
              >(
                _firestore
                    .collection(billingViews)
                    .doc(organizerId)
                    .snapshots()
                    .map(
                      (snapshot) =>
                          snapshot.data() ??
                          (throw const DocumentNotFoundException(
                            'organizer billing',
                          )),
                    ),
                clock: _clock,
                build: (view, now) {
                  if (view['organizerId'] != organizerId) {
                    throw const FormatException(
                      'Organizer billing view changed identity',
                    );
                  }
                  final status = HostOrganizerBillingStatus.fromView(view, now);
                  return (
                    status: status,
                    next: status.trial.nextChangeAfter(now),
                  );
                },
                nextRebuildAt: (built) => built.next,
              )
              .map((built) => built.status),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch organizer billing status',
        resource: billingViews,
      ),
    );
  }
}

@riverpod
HostOrganizerBillsRepository hostOrganizerBillsRepository(Ref ref) =>
    HostOrganizerBillsRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(appClockProvider),
    );

/// The owner's bills listener. It is a Firestore listener: it declares no
/// cache lifetime, and bill changes arrive on their own.
@riverpod
Stream<List<HostOrganizerBill>> hostOrganizerBills(
  Ref ref,
  String organizerId,
) => ref.watch(hostOrganizerBillsRepositoryProvider).watch(organizerId);

/// The owner's billing status listener.
@riverpod
Stream<HostOrganizerBillingStatus> hostOrganizerBillingStatusStream(
  Ref ref,
  String organizerId,
) => ref.watch(hostOrganizerBillsRepositoryProvider).watchStatus(organizerId);

/// The owner's billing status, following its listener.
@riverpod
Future<HostOrganizerBillingStatus> hostOrganizerBillingStatus(
  Ref ref,
  String organizerId,
) => ref.watch(hostOrganizerBillingStatusStreamProvider(organizerId).future);
