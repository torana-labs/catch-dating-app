// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_viewer_state_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Read current account-scoped event facts using an Auth-derived subject; never reserve or grant admission.
final class GetEventViewerStateCallableRequest {
  const GetEventViewerStateCallableRequest({
    required this.eventId,
    this.inviteCode,
    this.publicPaymentId,
    this.surface,
    this.includeHostMembership,
  });

  final String eventId;
  final String? inviteCode;
  final String? publicPaymentId;
  final String? surface;
  final bool? includeHostMembership;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'inviteCode': ?inviteCode,
    'publicPaymentId': ?publicPaymentId,
    'surface': ?surface,
    'includeHostMembership': ?includeHostMembership,
  };
}
