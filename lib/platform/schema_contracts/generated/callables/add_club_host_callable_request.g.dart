// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/add_club_host_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by addClubHost.
final class AddClubHostCallableRequest {
  const AddClubHostCallableRequest({
    required this.clubId,
    this.uid,
    this.phoneNumber,
  });

  final String clubId;
  final String? uid;
  final String? phoneNumber;

  Map<String, Object?> toJson() => {
    'clubId': clubId,
    'uid': ?uid,
    'phoneNumber': ?phoneNumber,
  };
}
