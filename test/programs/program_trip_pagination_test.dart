import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/programs/presentation/program_trips_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'program_operations_fixture.dart';

ProgramTripList _page(String plate, {String? nextCursor}) =>
    ProgramTripList.fromCallableData({
      'programId': 'program',
      'accessExpiresAtMillis': null,
      'nextCursor': nextCursor,
      'trips': [
        {
          'tripId': plate,
          'pickupPointId': 'pickup',
          'destinationHotelId': 'hotel',
          'destinationLabel': 'Hotel',
          'vehicleClassId': 'sedan',
          'vehicleClassLabel': null,
          'manifestSource': 'currentRecords',
          'plateDisplay': plate,
          'vendorId': null,
          'vendorName': null,
          'kind': 'guestTransfer',
          'status': 'arrived',
          'passengerCount': 1,
          'departedAtMillis': DateTime(2026).millisecondsSinceEpoch,
          'arrivedAtMillis': DateTime(2026).millisecondsSinceEpoch,
          'voidReason': null,
          'guestNames': ['Guest on $plate'],
          'revision': 1,
        },
      ],
    });

class _Repository extends Fake implements ProgramWorkRepository {
  final cursors = <String?>[];
  final older = Completer<ProgramTripList>();
  Object? error;

  @override
  Future<ProgramTripList> listTrips(String programId, {String? cursor}) async {
    cursors.add(cursor);
    if (error case final failure?) throw failure;
    return cursor == null
        ? _page('NEW 1234', nextCursor: 'next-trip')
        : older.future;
  }
}

void main() {
  test('trip pages require explicit continuation metadata', () {
    expect(
      () => ProgramTripList.fromCallableData({
        'programId': 'program',
        'accessExpiresAtMillis': null,
        'trips': [],
      }),
      throwsFormatException,
    );
  });

  testWidgets('ledger navigates pages and clears a page on learned revocation', (
    tester,
  ) async {
    final store = emptyProgramSnapshots();
    final repository = _Repository();
    await tester.pumpWidget(
      ProviderScope(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData('account')),
          programReadSnapshotStoreProvider.overrideWithValue(store),
          programWorkRepositoryProvider.overrideWithValue(repository),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const ProgramTripsScreen(programId: 'program'),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('NEW 1234'), findsOneWidget);
    expect(
      find.text(
        'Guest names reflect current records; no dispatch snapshot was saved.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('Older trips'));
    await tester.pump();
    expect(find.text('NEW 1234'), findsNothing);
    expect(repository.cursors, [null, 'next-trip']);
    repository.older.complete(_page('OLD 5678'));
    await pumpFeatureUi(tester);
    expect(find.text('OLD 5678'), findsOneWidget);
    expect(find.text('Older trips'), findsNothing);
    await tester.tap(find.text('Newer trips'));
    await pumpFeatureUi(tester);
    expect(find.text('NEW 1234'), findsOneWidget);
    await tester.tap(find.text('Older trips'));
    await pumpFeatureUi(tester);
    expect(find.text('OLD 5678'), findsOneWidget);
    await tester.tap(find.text('Latest trips'));
    await pumpFeatureUi(tester);
    expect(find.text('NEW 1234'), findsOneWidget);
    await tester.tap(find.text('Older trips'));
    await pumpFeatureUi(tester);
    repository.error = const PermissionException('Revoked');
    await tester.runAsync(() => store.clearProgram('account', 'program'));
    await pumpFeatureUi(tester);
    expect(find.text('OLD 5678'), findsNothing);
    expect(find.text('NEW 1234'), findsNothing);
    expect(find.text('Older trips'), findsNothing);
    repository.error = null;
    await tester.tap(find.text('Latest trips'));
    await pumpFeatureUi(tester);
    expect(repository.cursors.last, isNull);
    expect(find.text('NEW 1234'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
