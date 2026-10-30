// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_program_travel_leg_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create or update one guest journey. Guest and journey kind are immutable; party membership is owned by upsertProgramTravelParty.
final class UpsertProgramTravelLegCallableRequest {
  const UpsertProgramTravelLegCallableRequest({
    required this.programId,
    this.legId,
    this.expectedRevision,
    required this.guestId,
    required this.kind,
    this.flightNumber,
    this.carrierCode,
    this.originIata,
    this.destinationIata,
    this.scheduledArrivalAtMillis,
    this.international,
    this.pickupPointId,
    this.destinationHotelId,
    this.destinationLabel,
    required this.passengers,
    required this.luggageUnits,
    required this.requiredCapabilities,
    required this.dedicatedVehicle,
  });

  final String programId;
  final String? legId;
  final int? expectedRevision;
  final String guestId;
  final String kind;
  final String? flightNumber;
  final String? carrierCode;
  final String? originIata;
  final String? destinationIata;
  final int? scheduledArrivalAtMillis;
  final bool? international;
  final String? pickupPointId;
  final String? destinationHotelId;
  final String? destinationLabel;
  final int passengers;
  final int luggageUnits;
  final List<String> requiredCapabilities;
  final bool dedicatedVehicle;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'legId': ?legId,
    'expectedRevision': ?expectedRevision,
    'guestId': guestId,
    'kind': kind,
    'flightNumber': ?flightNumber,
    'carrierCode': ?carrierCode,
    'originIata': ?originIata,
    'destinationIata': ?destinationIata,
    'scheduledArrivalAtMillis': ?scheduledArrivalAtMillis,
    'international': ?international,
    'pickupPointId': ?pickupPointId,
    'destinationHotelId': ?destinationHotelId,
    'destinationLabel': ?destinationLabel,
    'passengers': passengers,
    'luggageUnits': luggageUnits,
    'requiredCapabilities': requiredCapabilities,
    'dedicatedVehicle': dedicatedVehicle,
  };
}
