// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_set_supply_nominator_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// Adds or updates someone who may nominate organizers by sending links to Catch's WhatsApp number or Instagram account. Exactly one of phoneE164 and instagramHandle names them. Their messages become Supply Intake nominations credited to the uid. The uid must hold a sales role (associate) or a current partner membership (partner). Setting active to false stops new messages counting; nothing is deleted.
final class AdminSetSupplyNominatorCallableRequest {
  const AdminSetSupplyNominatorCallableRequest({
    this.phoneE164,
    this.instagramHandle,
    required this.uid,
    required this.role,
    required this.displayName,
    required this.defaultMarket,
    required this.active,
  });

  final String? phoneE164;
  final String? instagramHandle;
  final String uid;
  final String role;
  final String displayName;
  final String? defaultMarket;
  final bool active;

  Map<String, Object?> toJson() => {
    'phoneE164': ?phoneE164,
    'instagramHandle': ?instagramHandle,
    'uid': uid,
    'role': role,
    'displayName': displayName,
    'defaultMarket': defaultMarket,
    'active': active,
  };
}
