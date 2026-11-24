import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_kernel/read_model_family.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_form_new_response_count.g.dart';

// firestore-index: hostResponseSummaries (organizerId:ASCENDING, formId:ASCENDING, reviewStatus:ASCENDING)

/// How many of one form's answers wait for the host's first look: the
/// applications still `submitted`. Answers with no application (feedback,
/// surveys) carry no review status, so they never count as new. One
/// Firestore count query; null while the response inbox is not ready.
@riverpod
Future<int?> hostFormNewResponseCount(
  Ref ref, {
  required String organizerId,
  required String formId,
}) async {
  final firestore = ref.watch(firebaseFirestoreProvider);
  final reader = ScopedReadModelReader(
    firestore,
    family: hostReadModels,
    actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
  );
  final directory = await reader.readiness(organizerId);
  if (directory?['responseSummaryVersion'] != 1) return null;
  final snapshot = await withBackendErrorContext(
    () => firestore
        .collection('hostResponseSummaries')
        .where('organizerId', isEqualTo: organizerId)
        .where('formId', isEqualTo: formId)
        .where(
          'reviewStatus',
          isEqualTo: HostApplicationReviewStatus.submitted.name,
        )
        .count()
        .get(),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'count new Host responses',
      resource: 'hostResponseSummaries',
    ),
  );
  return snapshot.count ?? 0;
}
