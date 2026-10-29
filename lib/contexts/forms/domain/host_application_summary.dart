import 'package:catch_dating_app/contexts/forms/domain/forms/form_operation_fields.dart';

enum HostApplicationReviewStatus {
  submitted,
  inReview,
  approved,
  waitlisted,
  declined,
  withdrawn,
}

enum HostApplicationSourceKind { native, tabularImport, connector }

class HostApplicationSummary {
  const HostApplicationSummary({
    required this.applicationId,
    required this.formId,
    required this.formVersionId,
    required this.targetKind,
    required this.targetId,
    required this.applicantDisplayName,
    required this.reviewStatus,
    required this.sourceKind,
    required this.providerId,
    required this.submittedAt,
    required this.revision,
  });

  factory HostApplicationSummary.fromMap(Map<Object?, Object?> map) =>
      HostApplicationSummary(
        applicationId: formOperationRequiredString(map, 'applicationId'),
        formId: formOperationRequiredString(map, 'formId'),
        formVersionId: formOperationRequiredString(map, 'formVersionId'),
        targetKind: formOperationRequiredString(map, 'targetKind'),
        targetId: formOperationNullableString(map['targetId']),
        applicantDisplayName: formOperationRequiredString(
          map,
          'applicantDisplayName',
        ),
        reviewStatus: formOperationEnumByName(
          HostApplicationReviewStatus.values,
          formOperationRequiredString(map, 'reviewStatus'),
          'application review status',
        ),
        sourceKind: formOperationEnumByName(
          HostApplicationSourceKind.values,
          formOperationRequiredString(map, 'sourceKind'),
          'application source',
        ),
        providerId: formOperationNullableString(map['providerId']),
        submittedAt: formOperationDateTime(map, 'submittedAtMillis'),
        revision: formOperationRequiredInt(map, 'revision'),
      );

  final String applicationId;
  final String formId;
  final String formVersionId;
  final String targetKind;
  final String? targetId;
  final String applicantDisplayName;
  final HostApplicationReviewStatus reviewStatus;
  final HostApplicationSourceKind sourceKind;
  final String? providerId;
  final DateTime submittedAt;
  final int revision;
}
