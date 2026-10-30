// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/set_cross_paths_event_consent_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by setCrossPathsEventConsent.
final class SetCrossPathsEventConsentCallableRequest {
  const SetCrossPathsEventConsentCallableRequest({
    required this.eventId,
    required this.enabled,
    required this.termsVersion,
    required this.source,
  });

  final String eventId;
  final bool enabled;
  final int termsVersion;
  final String source;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'enabled': enabled,
    'termsVersion': termsVersion,
    'source': source,
  };
}
