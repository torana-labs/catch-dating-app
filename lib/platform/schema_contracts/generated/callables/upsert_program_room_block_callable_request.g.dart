// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_program_room_block_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create or update reserved room inventory at a program hotel. Coordinator/manager only — hotelDesk consumes inventory but cannot define it. totalRooms may not be lowered below the block's live consuming stays.
final class UpsertProgramRoomBlockCallableRequest {
  const UpsertProgramRoomBlockCallableRequest({
    required this.programId,
    this.roomBlockId,
    this.expectedRevision,
    required this.hotelId,
    required this.label,
    this.roomType,
    required this.totalRooms,
    required this.heldForGroupIds,
    this.startsAtMillis,
    this.endsAtMillis,
    this.notes,
    this.maxOccupantsPerRoom,
  });

  final String programId;
  final String? roomBlockId;
  final int? expectedRevision;
  final String hotelId;
  final String label;
  final String? roomType;
  final int totalRooms;
  final List<String> heldForGroupIds;
  final int? startsAtMillis;
  final int? endsAtMillis;
  final String? notes;
  final int? maxOccupantsPerRoom;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'roomBlockId': ?roomBlockId,
    'expectedRevision': ?expectedRevision,
    'hotelId': hotelId,
    'label': label,
    'roomType': ?roomType,
    'totalRooms': totalRooms,
    'heldForGroupIds': heldForGroupIds,
    'startsAtMillis': ?startsAtMillis,
    'endsAtMillis': ?endsAtMillis,
    'notes': ?notes,
    'maxOccupantsPerRoom': ?maxOccupantsPerRoom,
  };
}
