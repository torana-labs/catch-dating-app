// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_program_stay_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create or update one guest's stay at a hotel. hotelDesk callers may only touch stays at hotels their duty covers; program coordinators and managers are unscoped. Null fields clear the stored value; omitted fields keep it. Room-block capacity is re-counted from live stays server-side, so a stale client never overbooks.
final class UpsertProgramStayCallableRequest {
  const UpsertProgramStayCallableRequest({
    required this.programId,
    this.stayId,
    this.expectedRevision,
    required this.guestId,
    required this.hotelId,
    this.roomBlockId,
    this.roomLabel,
    this.status,
    this.startsAtMillis,
    this.endsAtMillis,
    this.notes,
    this.markRoomReady,
    this.markHotelArrived,
    this.shareWithStayId,
    this.shareWithStayRevision,
    this.separateRoom,
  });

  final String programId;
  final String? stayId;
  final int? expectedRevision;
  final String guestId;
  final String hotelId;
  final String? roomBlockId;
  final String? roomLabel;
  final String? status;
  final int? startsAtMillis;
  final int? endsAtMillis;
  final String? notes;
  final bool? markRoomReady;
  final bool? markHotelArrived;
  final String? shareWithStayId;
  final int? shareWithStayRevision;
  final bool? separateRoom;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'stayId': ?stayId,
    'expectedRevision': ?expectedRevision,
    'guestId': guestId,
    'hotelId': hotelId,
    'roomBlockId': ?roomBlockId,
    'roomLabel': ?roomLabel,
    'status': ?status,
    'startsAtMillis': ?startsAtMillis,
    'endsAtMillis': ?endsAtMillis,
    'notes': ?notes,
    'markRoomReady': ?markRoomReady,
    'markHotelArrived': ?markHotelArrived,
    'shareWithStayId': ?shareWithStayId,
    'shareWithStayRevision': ?shareWithStayRevision,
    'separateRoom': ?separateRoom,
  };
}
