// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_record_organizer_curation_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by adminRecordOrganizerCuration. This records one durable low-volume manual organizer-intake curation operation in Firestore.
final class AdminRecordOrganizerCurationCallableRequest {
  const AdminRecordOrganizerCurationCallableRequest({
    this.operationId,
    required this.operationType,
    this.entityId,
    this.sourceEntityId,
    this.targetEntityId,
    this.surfaceId,
    this.newEntityId,
    this.sourceCandidateId,
    this.decision,
    this.surface,
    required this.reason,
  });

  final String? operationId;
  final String operationType;
  final String? entityId;
  final String? sourceEntityId;
  final String? targetEntityId;
  final String? surfaceId;
  final String? newEntityId;
  final String? sourceCandidateId;
  final String? decision;
  final Map<String, Object?>? surface;
  final String reason;

  Map<String, Object?> toJson() => {
    'operationId': ?operationId,
    'operationType': operationType,
    'entityId': ?entityId,
    'sourceEntityId': ?sourceEntityId,
    'targetEntityId': ?targetEntityId,
    'surfaceId': ?surfaceId,
    'newEntityId': ?newEntityId,
    'sourceCandidateId': ?sourceCandidateId,
    'decision': ?decision,
    'surface': ?surface,
    'reason': reason,
  };
}
