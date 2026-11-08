import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/host_summary_reader.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_response_status_counts.g.dart';

// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, reviewStatus:ASCENDING)
// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, offer.status:ASCENDING)

/// How many of one form's answers sit under each Responses filter.
class HostResponseStatusCounts {
  const HostResponseStatusCounts({required this.review, required this.offered});

  final Map<HostApplicationReviewStatus, int> review;

  /// Answers whose application has a live event offer.
  final int offered;
}

/// Counts one form's response summaries per review status and offer, with
/// Firestore count queries. Null while the response inbox is not ready.
class HostResponseStatusCountReads {
  const HostResponseStatusCountReads(this._firestore, this._reader);

  final FirebaseFirestore _firestore;
  final HostSummaryReader _reader;

  Future<HostResponseStatusCounts?> count({
    required String organizerId,
    required String formId,
  }) async {
    final directory = await _reader.directory(organizerId);
    if (directory?['responseSummaryVersion'] != 1) return null;
    final form = _firestore
        .collection('hostResponseSummaries')
        .where('organizerId', isEqualTo: organizerId)
        .where('formId', isEqualTo: formId);
    Future<int> countWhere(String field, String value) async {
      final snapshot = await withBackendErrorContext(
        () => form.where(field, isEqualTo: value).count().get(),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'count Host responses',
          resource: 'hostResponseSummaries',
        ),
      );
      return snapshot.count ?? 0;
    }

    final statuses = [
      for (final status in HostApplicationReviewStatus.values)
        if (status != HostApplicationReviewStatus.withdrawn) status,
    ];
    final counts = await Future.wait([
      for (final status in statuses) countWhere('reviewStatus', status.name),
      countWhere('offer.status', HostFormEntryOfferStatus.offered.name),
    ]);
    return HostResponseStatusCounts(
      review: {
        for (var index = 0; index < statuses.length; index++)
          statuses[index]: counts[index],
      },
      offered: counts.last,
    );
  }
}

/// One form's per-filter counts for Responses; null until the inbox is ready.
@riverpod
Future<HostResponseStatusCounts?> hostResponseStatusCounts(
  Ref ref, {
  required String organizerId,
  required String formId,
}) {
  final firestore = ref.watch(firebaseFirestoreProvider);
  return HostResponseStatusCountReads(
    firestore,
    HostSummaryReader(
      firestore,
      actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
    ),
  ).count(organizerId: organizerId, formId: formId);
}
