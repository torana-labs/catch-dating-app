// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/request_organizer_claim_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by requestOrganizerClaim.
final class RequestOrganizerClaimCallableRequest {
  const RequestOrganizerClaimCallableRequest({
    required this.organizerId,
    required this.requesterName,
    required this.requesterRole,
    this.businessEmail,
    this.businessPhone,
    this.proofUrls,
    this.message,
  });

  final String organizerId;
  final String requesterName;
  final String requesterRole;
  final String? businessEmail;
  final String? businessPhone;
  final List<String>? proofUrls;
  final String? message;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'requesterName': requesterName,
    'requesterRole': requesterRole,
    'businessEmail': ?businessEmail,
    'businessPhone': ?businessPhone,
    'proofUrls': ?proofUrls,
    'message': ?message,
  };
}
