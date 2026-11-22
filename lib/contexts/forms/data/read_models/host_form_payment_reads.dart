import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/form_definition_fields.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_form_payment_reads.g.dart';

/// One form's fee payments from `hostFormPaymentViews`, as live pages: a
/// checkout that completes, fails or is refunded moves at once. The view
/// holds only the ledger row; rules authorize every read.
class HostFormPaymentReads {
  const HostFormPaymentReads(this.reader);
  final HostSummaryReader reader;

  static const paymentViews = 'hostFormPaymentViews';

  /// The payments of [formId] in [filter], newest first, [pageSize] at a
  /// time, every row shown kept live.
  // firestore-index: hostFormPaymentViews(organizerId:ASCENDING, formId:ASCENDING, createdAtMillis:DESCENDING, __name__:DESCENDING)
  // firestore-index: hostFormPaymentViews(organizerId:ASCENDING, formId:ASCENDING, status:ASCENDING, createdAtMillis:DESCENDING, __name__:DESCENDING)
  LivePager<HostFormPaymentRecord> watchPages({
    required String organizerId,
    required String formId,
    HostFormPaymentFilter filter = HostFormPaymentFilter.all,
    int pageSize = ReadLimitPolicy.historyPage,
  }) {
    final statuses = filter.statuses.map((status) => status.name).toList()
      ..sort();
    return reader
        .watchPages(
          collection: paymentViews,
          organizerId: organizerId,
          orderField: 'createdAtMillis',
          descending: true,
          pageSize: pageSize,
          equalities: {'formId': formId},
          inFilters: {if (statuses.isNotEmpty) 'status': statuses},
        )
        .map(
          (doc) => HostFormPaymentRecord.fromMap(
            formDefinitionRequiredMap(doc['row'], 'form payment'),
          ),
        );
  }
}

// keepalive: account-free: a stateless repository over account-free SDK
// singletons; the reader checks the signed-in account on every read and rules
// authorize it.
@Riverpod(keepAlive: true)
HostFormPaymentReads hostFormPaymentReads(Ref ref) {
  ref.watch(authenticatedSessionProvider);
  return HostFormPaymentReads(
    HostSummaryReader(
      ref.watch(firebaseFirestoreProvider),
      actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
    ),
  );
}
