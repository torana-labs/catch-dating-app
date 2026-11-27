import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_applications_controller.g.dart';

@riverpod
HostApplicationsController hostApplicationsController(Ref ref) =>
    HostApplicationsController(ref.watch(hostApplicationRepositoryProvider));

class HostApplicationsController {
  const HostApplicationsController(this._repository);

  final HostApplicationRepository _repository;

  Future<HostApplicationReviewResult> reviewApplication({
    required String organizerId,
    required String applicationId,
    required int expectedRevision,
    required HostApplicationReviewStatus reviewStatus,
    String? reviewNote,
  }) => _repository.reviewApplication(
    organizerId: organizerId,
    applicationId: applicationId,
    expectedRevision: expectedRevision,
    reviewStatus: reviewStatus,
    reviewNote: reviewNote,
  );

  Future<HostCommunityMembershipDecision> decideCommunityMembership({
    required String organizerId,
    required HostApplicationDetail application,
    required HostCommunityMembership membership,
    required HostCommunityMembershipAction action,
    required String reason,
    required String requestId,
  }) => _repository.decideCommunityMembership(
    organizerId: organizerId,
    application: application,
    membership: membership,
    action: action,
    reason: reason,
    requestId: requestId,
  );
}
