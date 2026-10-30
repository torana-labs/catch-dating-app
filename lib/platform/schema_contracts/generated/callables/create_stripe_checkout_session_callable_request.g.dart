// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_stripe_checkout_session_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by createStripeCheckoutSession. The server derives amount, currency, host account, and booking metadata from Firestore.
final class CreateStripeCheckoutSessionCallableRequest {
  const CreateStripeCheckoutSessionCallableRequest({
    required this.eventId,
    this.inviteCode,
    this.inviteLinkId,
    this.crossPathsPairHoldId,
  });

  final String eventId;
  final String? inviteCode;
  final String? inviteLinkId;
  final String? crossPathsPairHoldId;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'inviteCode': ?inviteCode,
    'inviteLinkId': ?inviteLinkId,
    'crossPathsPairHoldId': ?crossPathsPairHoldId,
  };
}
