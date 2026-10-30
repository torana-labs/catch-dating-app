// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_rehearsal_guest_bootstrap_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Redeems or refreshes an anonymous rehearsal guest view.
final class GetEventRehearsalGuestBootstrapCallableRequest {
  const GetEventRehearsalGuestBootstrapCallableRequest({
    required this.publicRehearsalId,
    required this.clientInstanceId,
    required this.viewerToken,
    required this.slotToken,
  });

  final String publicRehearsalId;
  final String clientInstanceId;
  final String? viewerToken;
  final String? slotToken;

  Map<String, Object?> toJson() => {
    'publicRehearsalId': publicRehearsalId,
    'clientInstanceId': clientInstanceId,
    'viewerToken': viewerToken,
    'slotToken': slotToken,
  };
}
