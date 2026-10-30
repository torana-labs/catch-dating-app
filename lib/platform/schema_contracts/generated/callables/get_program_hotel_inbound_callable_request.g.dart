// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_program_hotel_inbound_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Hotel-desk scoped inbound view: trips en route and expected guests for one hotel only.
final class GetProgramHotelInboundCallableRequest {
  const GetProgramHotelInboundCallableRequest({
    required this.programId,
    required this.hotelId,
    this.tripCursor,
    this.expectedCursor,
    this.limit,
  });

  final String programId;
  final String hotelId;
  final String? tripCursor;
  final String? expectedCursor;
  final int? limit;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'hotelId': hotelId,
    'tripCursor': ?tripCursor,
    'expectedCursor': ?expectedCursor,
    'limit': ?limit,
  };
}
