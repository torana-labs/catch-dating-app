// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/control_event_rehearsal_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Host lifecycle or virtual-clock control. Assistance additionally requires the reviewed setup generation so a reset cannot reuse an old runtime revision.
final class ControlEventRehearsalCallableRequest {
  const ControlEventRehearsalCallableRequest({
    required this.sessionId,
    required this.expectedRevision,
    required this.clientActionId,
    required this.action,
    this.minutes,
    this.assistance,
    this.expectedSetupRevision,
    this.movement,
    this.staff,
    this.practiceOperatorId,
    this.settings,
    this.requiredData,
    this.outcome,
    this.reveal,
    this.allocation,
    this.roster,
  });

  final String sessionId;
  final int expectedRevision;
  final String clientActionId;
  final String action;
  final int? minutes;
  final Map<String, Object?>? assistance;
  final int? expectedSetupRevision;
  final Map<String, Object?>? movement;
  final Map<String, Object?>? staff;
  final String? practiceOperatorId;
  final Map<String, Object?>? settings;
  final Map<String, Object?>? requiredData;
  final Map<String, Object?>? outcome;
  final Map<String, Object?>? reveal;
  final Map<String, Object?>? allocation;
  final Map<String, Object?>? roster;

  Map<String, Object?> toJson() => {
    'sessionId': sessionId,
    'expectedRevision': expectedRevision,
    'clientActionId': clientActionId,
    'action': action,
    'minutes': ?minutes,
    'assistance': ?assistance,
    'expectedSetupRevision': ?expectedSetupRevision,
    'movement': ?movement,
    'staff': ?staff,
    'practiceOperatorId': ?practiceOperatorId,
    'settings': ?settings,
    'requiredData': ?requiredData,
    'outcome': ?outcome,
    'reveal': ?reveal,
    'allocation': ?allocation,
    'roster': ?roster,
  };
}
