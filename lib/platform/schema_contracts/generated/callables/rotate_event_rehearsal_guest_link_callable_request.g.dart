// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/rotate_event_rehearsal_guest_link_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Revokes prior anonymous viewer tokens and returns a new guest link.
final class RotateEventRehearsalGuestLinkCallableRequest {
  const RotateEventRehearsalGuestLinkCallableRequest({
    required this.sessionId,
  });

  final String sessionId;

  Map<String, Object?> toJson() => {
    'sessionId': sessionId,
  };
}
