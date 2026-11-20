import 'package:catch_dating_app/contexts/payments/domain/host_organizer_bill.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_organizer_billing_status.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_organizer_bills_repository.g.dart';

/// Catch's bills to one organizer, newest first, from the owner's
/// `hostOrganizerBillViews`, which only the organizer's owner may read. The
/// billing status stays an owner-authorized callable.
class HostOrganizerBillsRepository {
  const HostOrganizerBillsRepository(this._functions, this._firestore);

  static const views = 'hostOrganizerBillViews';
  static final _documentId = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$');

  final FirebaseFunctions _functions;
  final FirebaseFirestore _firestore;

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

  /// The free trial and other billing status. Status only, never prices.
  Future<HostOrganizerBillingStatus> status(String organizerId) =>
      withBackendErrorContext(
        () async {
          final result = await _functions
              .httpsCallable('getOrganizerBillingStatus')
              .call<Object?>(
                GetOrganizerBillingStatusCallableRequest(
                  organizerId: organizerId,
                ).toJson(),
              );
          return HostOrganizerBillingStatus.fromJson(
            Map<String, Object?>.from(result.data! as Map),
          );
        },
        context: const BackendErrorContext(
          service: BackendService.functions,
          action: 'read organizer billing status',
          resource: 'getOrganizerBillingStatus',
        ),
      );
}

@riverpod
HostOrganizerBillsRepository hostOrganizerBillsRepository(Ref ref) =>
    HostOrganizerBillsRepository(
      ref.watch(firebaseFunctionsProvider),
      ref.watch(firebaseFirestoreProvider),
    );

/// The owner's bills listener. It is a Firestore listener: it declares no
/// cache lifetime, and bill changes arrive on their own.
@riverpod
Stream<List<HostOrganizerBill>> hostOrganizerBills(
  Ref ref,
  String organizerId,
) => ref.watch(hostOrganizerBillsRepositoryProvider).watch(organizerId);

@riverpod
Future<HostOrganizerBillingStatus> hostOrganizerBillingStatus(
  Ref ref,
  String organizerId,
) => ref.watch(hostOrganizerBillsRepositoryProvider).status(organizerId);
