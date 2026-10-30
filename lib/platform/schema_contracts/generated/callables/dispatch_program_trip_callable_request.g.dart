// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/dispatch_program_trip_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Dispatch a vehicle: snapshot plate, vendor, class and manifest in one transaction that also writes per-leg active assignments and an idempotency receipt.
final class DispatchProgramTripCallableRequest {
  const DispatchProgramTripCallableRequest({
    required this.programId,
    required this.pickupPointId,
    this.destinationHotelId,
    this.destinationLabel,
    required this.vehicleClassId,
    required this.plateDisplay,
    this.vendorId,
    this.kind,
    required this.legIds,
    required this.expectedLegRevisions,
    this.departedAtMillis,
    this.notes,
    required this.clientOperationId,
  });

  final String programId;
  final String pickupPointId;
  final String? destinationHotelId;
  final String? destinationLabel;
  final String vehicleClassId;
  final String plateDisplay;
  final String? vendorId;
  final String? kind;
  final List<String> legIds;
  final List<Map<String, Object?>> expectedLegRevisions;
  final int? departedAtMillis;
  final String? notes;
  final String clientOperationId;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'pickupPointId': pickupPointId,
    'destinationHotelId': ?destinationHotelId,
    'destinationLabel': ?destinationLabel,
    'vehicleClassId': vehicleClassId,
    'plateDisplay': plateDisplay,
    'vendorId': ?vendorId,
    'kind': ?kind,
    'legIds': legIds,
    'expectedLegRevisions': expectedLegRevisions,
    'departedAtMillis': ?departedAtMillis,
    'notes': ?notes,
    'clientOperationId': clientOperationId,
  };
}
