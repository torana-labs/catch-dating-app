// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_assistance_guest_view_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class GetEventAssistanceGuestViewCallableRequest {
  const GetEventAssistanceGuestViewCallableRequest({
    required this.linkId,
    required this.secret,
  });

  final String linkId;
  final String secret;

  Map<String, Object?> toJson() => {
    'linkId': linkId,
    'secret': secret,
  };
}
