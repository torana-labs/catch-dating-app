// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/submit_event_runtime_profile_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Submits the minimum event-scoped profile required by enabled Event Success modules.
final class SubmitEventRuntimeProfileCallableRequest {
  const SubmitEventRuntimeProfileCallableRequest({
    required this.publicRuntimeId,
    required this.runtimeTermsVersion,
    this.sensitiveDataTermsVersion,
    required this.saveAsCatchPrefill,
    required this.fields,
  });

  final String publicRuntimeId;
  final String runtimeTermsVersion;
  final String? sensitiveDataTermsVersion;
  final bool saveAsCatchPrefill;
  final Map<String, Object?> fields;

  Map<String, Object?> toJson() => {
    'publicRuntimeId': publicRuntimeId,
    'runtimeTermsVersion': runtimeTermsVersion,
    'sensitiveDataTermsVersion': ?sensitiveDataTermsVersion,
    'saveAsCatchPrefill': saveAsCatchPrefill,
    'fields': fields,
  };
}
