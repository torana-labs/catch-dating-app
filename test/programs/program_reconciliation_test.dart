import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_trip_export.dart';
import 'package:flutter_test/flutter_test.dart';

final _now = DateTime(2026, 10, 4, 12);

Map<String, Object?> _trip(
  String tripId,
  String status, {
  String? plate,
  String? destination,
  List<String>? names,
}) => {
  'tripId': tripId,
  'pickupPointId': 'pickup',
  'destinationHotelId': 'hotel',
  'destinationLabel': destination ?? 'Hotel',
  'vehicleClassId': 'sedan',
  'vehicleClassLabel': null,
  'manifestSource': 'currentRecords',
  'plateDisplay': plate ?? tripId,
  'vendorId': null,
  'vendorName': null,
  'kind': 'guestTransfer',
  'status': status,
  'passengerCount': 1,
  'departedAtMillis': _now.millisecondsSinceEpoch,
  'arrivedAtMillis': status == 'arrived' ? _now.millisecondsSinceEpoch : null,
  'estimatedArriveAtMillis': null,
  'voidReason': status == 'voided' ? 'Plate mismatch' : null,
  'guestNames': names ?? ['Guest on $tripId'],
  'revision': 1,
};

void main() {
  test('export serializes the ledger with CSV escaping', () {
    final exported = DateTime.utc(2026, 10, 4, 9, 30);
    final trip = ProgramTripSummary.fromTripMap(
      _trip(
        'trip-1',
        'voided',
        destination: 'Hotel, West "Wing"',
        names: ['Ada Lovelace', 'Grace\nHopper'],
      ),
    );
    final export = buildProgramTripLedgerExport(
      programId: 'program',
      programTitle: 'Reunion Gala',
      trips: [trip],
      exportedAt: exported,
    );
    expect(export.fileName, 'reunion-gala-trip-ledger-2026-10-04.csv');
    expect(
      export.csv,
      startsWith('program_id,program_title,trip_id,pickup_point_id,'),
    );
    expect(export.csv, contains('trip-1'));
    expect(export.csv, contains('"Hotel, West ""Wing"""'));
    expect(export.csv, contains('"Ada Lovelace; Grace\nHopper"'));
    expect(export.csv, contains('Plate mismatch'));
    expect(export.csv, contains('voided'));
    expect(export.csv, contains('2026-10-04T09:30:00.000Z'));
  });
}
