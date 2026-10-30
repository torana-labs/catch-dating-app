// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_program_hotel_rooms_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Hotel-scoped accommodation view: room blocks with computed capacity, live stays, and guests routed to the hotel with no live stay. Requires the caller's hotelDesk duty to cover the hotel, or program coordinator/manager access.
final class GetProgramHotelRoomsCallableRequest {
  const GetProgramHotelRoomsCallableRequest({
    required this.programId,
    required this.hotelId,
  });

  final String programId;
  final String hotelId;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'hotelId': hotelId,
  };
}
