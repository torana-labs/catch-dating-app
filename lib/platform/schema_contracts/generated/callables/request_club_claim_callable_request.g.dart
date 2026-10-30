// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/request_club_claim_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by requestClubClaim.
final class RequestClubClaimCallableRequest {
  const RequestClubClaimCallableRequest({
    required this.clubId,
    required this.requesterName,
    required this.requesterRole,
    this.businessEmail,
    this.businessPhone,
    this.proofUrls,
    this.message,
  });

  final String clubId;
  final String requesterName;
  final String requesterRole;
  final String? businessEmail;
  final String? businessPhone;
  final List<String>? proofUrls;
  final String? message;

  Map<String, Object?> toJson() => {
    'clubId': clubId,
    'requesterName': requesterName,
    'requesterRole': requesterRole,
    'businessEmail': ?businessEmail,
    'businessPhone': ?businessPhone,
    'proofUrls': ?proofUrls,
    'message': ?message,
  };
}
