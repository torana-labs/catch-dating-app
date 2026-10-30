// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_event_rehearsal_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Creates an isolated rehearsal from a real event snapshot or the safe sample template.
final class CreateEventRehearsalCallableRequest {
  const CreateEventRehearsalCallableRequest({
    required this.organizerId,
    required this.sourceEventId,
    required this.scenarioId,
    required this.seed,
    required this.actorCount,
    this.setup,
    this.guestSource,
    this.startImmediately,
  });

  final String organizerId;
  final String? sourceEventId;
  final String scenarioId;
  final int seed;
  final int actorCount;
  final Map<String, Object?>? setup;
  final String? guestSource;
  final bool? startImmediately;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'sourceEventId': sourceEventId,
    'scenarioId': scenarioId,
    'seed': seed,
    'actorCount': actorCount,
    'setup': ?setup,
    'guestSource': ?guestSource,
    'startImmediately': ?startImmediately,
  };
}
