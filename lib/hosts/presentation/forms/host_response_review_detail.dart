import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_response_review_detail.g.dart';

typedef HostResponseReviewKey = ({
  String organizerId,
  String? responseId,
  String? applicationId,
});

/// Joins authorized projections without manufacturing a response for imports.
/// A failed linked projection fails the detail closed instead of dropping actions.
@riverpod
Future<HostResponseReviewDetail> hostResponseReviewDetail(
  Ref ref,
  HostResponseReviewKey key,
) async {
  HostApplicationDetail? application;
  HostFormResponseDetail? response;
  if (key.applicationId case final id?) {
    final loadedApplication = await ref.watch(
      hostApplicationDetailProvider(key.organizerId, id).future,
    );
    application = loadedApplication;
    if (loadedApplication.sourceResponseId case final responseId?
        when loadedApplication.dataAccessState != 'revokedParticipantGrant') {
      response = await ref.watch(
        hostFormResponseDetailProvider(
          organizerId: key.organizerId,
          responseId: responseId,
        ).future,
      );
    }
  } else if (key.responseId case final id?) {
    final loadedResponse = await ref.watch(
      hostFormResponseDetailProvider(
        organizerId: key.organizerId,
        responseId: id,
      ).future,
    );
    response = loadedResponse;
    if (loadedResponse.applicationId case final applicationId?) {
      application = await ref.watch(
        hostApplicationDetailProvider(key.organizerId, applicationId).future,
      );
    }
  } else {
    throw ArgumentError('A response or application identity is required.');
  }
  return HostResponseReviewDetail(response: response, application: application);
}

class HostResponseReviewDetail {
  const HostResponseReviewDetail({this.response, this.application});
  final HostFormResponseDetail? response;
  final HostApplicationDetail? application;
  bool get revoked => application?.dataAccessState == 'revokedParticipantGrant';
  bool get withdrawn =>
      application?.reviewStatus == HostApplicationReviewStatus.withdrawn ||
      response?.response.status == HostFormResponseStatus.withdrawn;
  bool get canReview => application != null && !withdrawn && !revoked;
  bool get canConvert => response != null && !withdrawn && !revoked;
  bool get canChooseEvent => canConvert;
  bool get canOfferEvent =>
      canConvert &&
      contactId != null &&
      (application == null ||
          application!.reviewStatus == HostApplicationReviewStatus.approved);
  String? get displayName =>
      application?.applicantDisplayName ??
      response?.response.identity.primaryLabel;
  String? get contactId => application?.contactId ?? response?.contactId;
}
