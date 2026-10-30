// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/set_club_notification_preference_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by setClubNotificationPreference.
final class SetClubNotificationPreferenceCallableRequest {
  const SetClubNotificationPreferenceCallableRequest({
    required this.clubId,
    required this.enabled,
  });

  final String clubId;
  final bool enabled;

  Map<String, Object?> toJson() => {
    'clubId': clubId,
    'enabled': enabled,
  };
}
