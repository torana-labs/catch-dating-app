import 'dart:convert';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_trip_export.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/programs/presentation/program_trips_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:share_plus/share_plus.dart';

import '../test_pump_helpers.dart';
import 'program_operations_fixture.dart';

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

Map<String, Object?> _work(String duty) => {
  'programId': 'program',
  'organizerId': 'org',
  'title': 'Reunion program',
  'kind': 'wedding',
  'status': 'active',
  'timezone': 'Asia/Kolkata',
  'actorRole': 'staff',
  'duties': [
    {
      'duty': duty,
      'pickupPointIds': <String>[],
      'hotelIds': <String>[],
      'functionIds': <String>[],
      'expiresAtMillis': _now
          .add(const Duration(hours: 6))
          .millisecondsSinceEpoch,
    },
  ],
  'grantExpiresAtMillis': _now
      .add(const Duration(hours: 6))
      .millisecondsSinceEpoch,
  'capabilities': ['arrivalsTransport'],
  'pickupPoints': <Map<String, Object?>>[],
  'functions': <Map<String, Object?>>[],
  'hotels': <Map<String, Object?>>[],
  'vehicleClasses': <Map<String, Object?>>[],
};

class _Repository extends Fake implements ProgramWorkRepository {
  _Repository({required this.duty, required this.pages});

  final String duty;
  final List<List<Map<String, Object?>>> pages;
  final cursors = <String?>[];

  @override
  Future<ProgramWorkAccess> getWorkAccess(
    String programId, {
    String? snapshotAccountId,
  }) async => ProgramWorkAccess.fromCallableData(_work(duty));

  @override
  Future<ProgramTripList> listTrips(String programId, {String? cursor}) async {
    cursors.add(cursor);
    final index = cursor == null ? 0 : int.parse(cursor);
    final last = index >= pages.length - 1;
    return ProgramTripList.fromCallableData({
      'programId': 'program',
      'accessExpiresAtMillis': null,
      'nextCursor': last ? null : '${index + 1}',
      'trips': index < pages.length ? pages[index] : const [],
    });
  }
}

Future<void> _pumpLedger(
  WidgetTester tester,
  _Repository repository, {
  List<ShareParams> shares = const [],
}) {
  return tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('account')),
        programProjectionClockProvider.overrideWithValue(() => _now),
        programReadSnapshotStoreProvider.overrideWithValue(
          emptyProgramSnapshots(),
        ),
        programWorkRepositoryProvider.overrideWithValue(repository),
        externalShareLauncherProvider.overrideWithValue(
          (params) async => shares.add(params),
        ),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: ProgramTripsScreen(programId: 'program', now: () => _now),
      ),
    ),
  );
}

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

  testWidgets('a reconciliation viewer reviews exceptions read-only', (
    tester,
  ) async {
    final repository = _Repository(
      duty: 'reconciliationViewer',
      pages: [
        [
          _trip('EN 1', 'enRoute', plate: 'ENROUTE 1'),
          _trip('AR 1', 'arrived', plate: 'ARRIVED 1'),
          _trip('VD 1', 'voided', plate: 'VOIDED 1'),
        ],
      ],
    );
    await _pumpLedger(tester, repository);
    await pumpFeatureUi(tester);
    expect(find.text('Needs review'), findsOneWidget);
    expect(find.text('Void this trip'), findsNothing);
    expect(find.text('ARRIVED 1'), findsOneWidget);
    await tester.tap(find.text('Review only'));
    await pumpFeatureUi(tester);
    expect(find.text('ARRIVED 1'), findsNothing);
    expect(find.text('ENROUTE 1'), findsOneWidget);
    expect(find.text('VOIDED 1'), findsOneWidget);
    await tester.tap(find.text('Show all'));
    await pumpFeatureUi(tester);
    expect(find.text('ARRIVED 1'), findsOneWidget);
  });

  testWidgets('a dispatcher still sees the void affordance', (tester) async {
    final repository = _Repository(
      duty: 'transportDispatcher',
      pages: [
        [_trip('EN 1', 'enRoute', plate: 'ENROUTE 1')],
      ],
    );
    await _pumpLedger(tester, repository);
    await pumpFeatureUi(tester);
    expect(find.text('Void this trip'), findsOneWidget);
  });

  testWidgets('export walks the ledger pages and shares a CSV file', (
    tester,
  ) async {
    final shares = <ShareParams>[];
    final repository = _Repository(
      duty: 'reconciliationViewer',
      pages: [
        [_trip('P1', 'arrived', plate: 'PAGE 1')],
        [_trip('P2', 'voided', plate: 'PAGE 2')],
      ],
    );
    await _pumpLedger(tester, repository, shares: shares);
    await pumpFeatureUi(tester);
    expect(find.text('Needs review'), findsNothing);
    await tester.tap(find.text('Export CSV'));
    await pumpFeatureUi(tester);
    expect(shares, hasLength(1));
    final params = shares.single;
    expect(params.fileNameOverrides?.single, endsWith('.csv'));
    expect(repository.cursors.sublist(1), [null, '1']);
    final csv = utf8.decode(await params.files!.single.readAsBytes());
    expect(csv, contains('void_reason'));
    expect(csv, contains('PAGE 1'));
    expect(csv, contains('PAGE 2'));
  });
}
