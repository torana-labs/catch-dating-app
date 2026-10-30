// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/record_program_function_rsvp_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Staff-recorded RSVP for one guest on one program function. The server derives the program-level guest rollup and function counters; last response wins per join key.
final class RecordProgramFunctionRsvpCallableRequest {
  const RecordProgramFunctionRsvpCallableRequest({
    required this.programId,
    required this.functionId,
    required this.guestId,
    required this.rsvpStatus,
    this.partySize,
    this.responseNote,
    this.allowUninvited,
  });

  final String programId;
  final String functionId;
  final String guestId;
  final String rsvpStatus;
  final int? partySize;
  final String? responseNote;
  final bool? allowUninvited;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'functionId': functionId,
    'guestId': guestId,
    'rsvpStatus': rsvpStatus,
    'partySize': ?partySize,
    'responseNote': ?responseNote,
    'allowUninvited': ?allowUninvited,
  };
}
