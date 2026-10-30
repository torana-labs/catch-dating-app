// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/approve_event_runtime_claim_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Host decision for one pending Event Success runtime claim.
final class ApproveEventRuntimeClaimCallableRequest {
  const ApproveEventRuntimeClaimCallableRequest({
    required this.eventId,
    required this.uid,
    required this.decision,
    this.attendeeId,
    this.reason,
  });

  final String eventId;
  final String uid;
  final String decision;
  final String? attendeeId;
  final String? reason;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'uid': uid,
    'decision': decision,
    'attendeeId': ?attendeeId,
    'reason': ?reason,
  };
}
