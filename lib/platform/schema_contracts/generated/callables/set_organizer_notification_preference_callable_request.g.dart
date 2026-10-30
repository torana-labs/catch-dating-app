// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/set_organizer_notification_preference_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by setOrganizerNotificationPreference.
final class SetOrganizerNotificationPreferenceCallableRequest {
  const SetOrganizerNotificationPreferenceCallableRequest({
    required this.organizerId,
    required this.enabled,
  });

  final String organizerId;
  final bool enabled;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'enabled': enabled,
  };
}
