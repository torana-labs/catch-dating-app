// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/manage_host_roster_intake_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Starts, resumes, revises, previews or applies one private Host roster intake.
final class ManageHostRosterIntakeCallableRequest {
  const ManageHostRosterIntakeCallableRequest({
    required this.action,
    this.sessionId,
    this.organizerId,
    this.eventId,
    this.fileFingerprint,
    this.fileName,
    this.format,
    this.headers,
    this.mapping,
    this.rows,
    this.expectedRevision,
    this.excludedRowIds,
    this.reviewHash,
  });

  final String action;
  final String? sessionId;
  final String? organizerId;
  final String? eventId;
  final String? fileFingerprint;
  final String? fileName;
  final String? format;
  final List<String>? headers;
  final Map<String, Object?>? mapping;
  final List<Map<String, Object?>>? rows;
  final int? expectedRevision;
  final List<String>? excludedRowIds;
  final String? reviewHash;

  Map<String, Object?> toJson() => {
    'action': action,
    'sessionId': ?sessionId,
    'organizerId': ?organizerId,
    'eventId': ?eventId,
    'fileFingerprint': ?fileFingerprint,
    'fileName': ?fileName,
    'format': ?format,
    'headers': ?headers,
    'mapping': ?mapping,
    'rows': ?rows,
    'expectedRevision': ?expectedRevision,
    'excludedRowIds': ?excludedRowIds,
    'reviewHash': ?reviewHash,
  };
}
