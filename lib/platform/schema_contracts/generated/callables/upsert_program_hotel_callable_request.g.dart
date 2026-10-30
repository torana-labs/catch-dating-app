// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_program_hotel_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create or update a program accommodation property.
final class UpsertProgramHotelCallableRequest {
  const UpsertProgramHotelCallableRequest({
    required this.programId,
    this.hotelId,
    this.expectedRevision,
    required this.name,
    required this.address,
    this.latitude,
    this.longitude,
    this.receptionContact,
    this.notes,
    this.active,
  });

  final String programId;
  final String? hotelId;
  final int? expectedRevision;
  final String name;
  final String address;
  final double? latitude;
  final double? longitude;
  final String? receptionContact;
  final String? notes;
  final bool? active;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'hotelId': ?hotelId,
    'expectedRevision': ?expectedRevision,
    'name': name,
    'address': address,
    'latitude': ?latitude,
    'longitude': ?longitude,
    'receptionContact': ?receptionContact,
    'notes': ?notes,
    'active': ?active,
  };
}
