import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

class ProgramTripLedgerExport {
  const ProgramTripLedgerExport({required this.fileName, required this.csv});

  final String fileName;
  final String csv;
}

/// Vendor-reconciliation export: one row per ledger trip, in ledger order,
/// with the same fields the reconciliation viewer can already read on
/// screen. Machine-formatted (ISO times, enum names) so it can be checked
/// line by line against a vendor invoice.
ProgramTripLedgerExport buildProgramTripLedgerExport({
  required String programId,
  required String programTitle,
  required List<ProgramTripSummary> trips,
  required DateTime exportedAt,
}) {
  final rows = <List<Object?>>[
    const [
      'program_id',
      'program_title',
      'trip_id',
      'pickup_point_id',
      'destination_hotel_id',
      'destination_label',
      'vehicle_class_id',
      'vehicle_class_label',
      'plate_display',
      'vendor_id',
      'vendor_name',
      'status',
      'passenger_count',
      'departed_at',
      'estimated_arrive_at',
      'arrived_at',
      'void_reason',
      'manifest_source',
      'guest_names',
      'revision',
      'exported_at',
    ],
    for (final trip in trips)
      [
        programId,
        programTitle,
        trip.tripId,
        trip.pickupPointId,
        trip.destinationHotelId ?? '',
        trip.destinationLabel,
        trip.vehicleClassId,
        trip.vehicleClassLabel ?? '',
        trip.plateDisplay,
        trip.vendorId ?? '',
        trip.vendorName ?? '',
        trip.status.name,
        trip.passengerCount,
        _iso(trip.departedAt),
        _iso(trip.estimatedArriveAt),
        _iso(trip.arrivedAt),
        trip.voidReason ?? '',
        trip.manifestSource.name,
        trip.guestNames.join('; '),
        trip.revision,
        _iso(exportedAt),
      ],
  ];

  final slug = programTitle
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  final date = exportedAt.toUtc().toIso8601String().split('T').first;
  return ProgramTripLedgerExport(
    fileName: '${slug.isEmpty ? 'program' : slug}-trip-ledger-$date.csv',
    csv: _csv(rows),
  );
}

String _iso(DateTime? value) => value?.toUtc().toIso8601String() ?? '';

String _csv(List<List<Object?>> rows) {
  return '${rows.map((row) => row.map(_csvCell).join(',')).join('\n')}\n';
}

String _csvCell(Object? value) {
  final text = value?.toString() ?? '';
  if (!text.contains(',') &&
      !text.contains('"') &&
      !text.contains('\n') &&
      !text.contains('\r')) {
    return text;
  }
  return '"${text.replaceAll('"', '""')}"';
}
