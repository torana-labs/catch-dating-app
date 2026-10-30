// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_link_organizer_intake_to_sales_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Links an employee-reviewed Supply Intake canonical organizer decision to its private Sales account; no organizer, publication or ownership mutation.
final class AdminLinkOrganizerIntakeToSalesRequest {
  const AdminLinkOrganizerIntakeToSalesRequest({
    required this.workItemId,
    required this.candidateId,
    required this.expectedWorkItemRevision,
    required this.expectedCandidateHash,
    required this.organizerId,
    required this.curationPath,
    required this.requestId,
  });

  final String workItemId;
  final String candidateId;
  final int expectedWorkItemRevision;
  final String expectedCandidateHash;
  final String organizerId;
  final String curationPath;
  final String requestId;

  Map<String, Object?> toJson() => {
    'workItemId': workItemId,
    'candidateId': candidateId,
    'expectedWorkItemRevision': expectedWorkItemRevision,
    'expectedCandidateHash': expectedCandidateHash,
    'organizerId': organizerId,
    'curationPath': curationPath,
    'requestId': requestId,
  };
}
