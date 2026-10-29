import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_hotel_desk_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'program_operations_fixture.dart';

Map<String, Object?> _pageData({String? tripCursor, String? expectedCursor}) =>
    {
      'programId': 'program',
      'hotelId': 'hotel',
      'hotelName': 'Hotel',
      'generatedAtMillis': DateTime(2026).millisecondsSinceEpoch,
      'accessExpiresAtMillis': null,
      'nextTripCursor': tripCursor == null ? 'trip-page-2' : null,
      'nextExpectedCursor': expectedCursor == null ? 'guest-page-2' : null,
      'trips': [
        {
          'tripId': tripCursor ?? 'first-trip',
          'vehicleClassId': 'sedan',
          'vehicleClassLabel': 'Sedan',
          'manifestSource': 'dispatchSnapshot',
          'plateDisplay': tripCursor == null ? 'FIRST 1234' : 'SECOND 5678',
          'vendorName': null,
          'status': 'enRoute',
          'passengerCount': 1,
          'departedAtMillis': DateTime(2026).millisecondsSinceEpoch,
          'estimatedArriveAtMillis': null,
          'guestNames': ['Passenger'],
          'revision': 1,
        },
      ],
      'expectedLegs': [
        {
          'legId': expectedCursor ?? 'first-leg',
          'guestDisplayName': expectedCursor == null
              ? 'First Guest'
              : 'Second Guest',
          'partyLabel': null,
          'passengers': 1,
          'curbAtMillis': null,
          'readiness': 'expected',
        },
      ],
    };

class _Repository extends Fake implements ProgramWorkRepository {
  final cursors = <(String?, String?)>[];
  final arrivals = <String>[];
  Completer<ProgramHotelInbound>? pending;
  Object? error;

  @override
  Future<ProgramHotelInbound> getHotelInbound({
    required String programId,
    required String hotelId,
    String? tripCursor,
    String? expectedCursor,
  }) async {
    cursors.add((tripCursor, expectedCursor));
    if (error case final failure?) throw failure;
    if (pending case final request?) return request.future;
    return ProgramHotelInbound.fromCallableData(
      _pageData(tripCursor: tripCursor, expectedCursor: expectedCursor),
    );
  }

  @override
  Future<ProgramMutationResult> markTripArrived({
    required String programId,
    required String tripId,
    required int expectedRevision,
    required String clientOperationId,
  }) async {
    arrivals.add(tripId);
    return ProgramMutationResult(
      entityId: tripId,
      revision: 2,
      alreadyApplied: false,
    );
  }
}

void main() {
  test('hotel pages require both explicit continuation fields', () {
    for (final field in ['nextTripCursor', 'nextExpectedCursor']) {
      final data = _pageData()..remove(field);
      expect(
        () => ProgramHotelInbound.fromCallableData(data),
        throwsFormatException,
      );
    }
  });

  testWidgets('hotel pages remain independent and refresh the mutated page', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1000, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
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
          home: const ProgramHotelDeskScreen(
            programId: 'program',
            hotelId: 'hotel',
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('FIRST 1234'), findsOneWidget);
    expect(find.text('First Guest'), findsOneWidget);
    repository.pending = Completer<ProgramHotelInbound>();
    await tester.tap(find.text('More vehicles'));
    await tester.pump();
    expect(find.text('FIRST 1234'), findsNothing);
    expect(find.text('First Guest'), findsNothing);
    expect(repository.cursors.last, ('trip-page-2', null));
    repository.pending!.complete(
      ProgramHotelInbound.fromCallableData(
        _pageData(tripCursor: 'trip-page-2'),
      ),
    );
    repository.pending = null;
    await pumpFeatureUi(tester);
    expect(find.text('SECOND 5678'), findsOneWidget);
    expect(find.text('First Guest'), findsOneWidget);
    await tester.tap(find.text('More guests'));
    await pumpFeatureUi(tester);
    expect(repository.cursors.last, ('trip-page-2', 'guest-page-2'));
    expect(find.text('SECOND 5678'), findsOneWidget);
    expect(find.text('Second Guest'), findsOneWidget);
    final beforeArrival = repository.cursors.length;
    await tester.tap(find.text('Mark arrived'));
    await pumpFeatureUi(tester);
    expect(repository.arrivals, ['trip-page-2']);
    expect(repository.cursors.length, beforeArrival + 1);
    expect(repository.cursors.last, ('trip-page-2', 'guest-page-2'));
    await tester.tap(find.text('Previous guests'));
    await pumpFeatureUi(tester);
    expect(find.text('SECOND 5678'), findsOneWidget);
    expect(find.text('First Guest'), findsOneWidget);
    await tester.tap(find.text('Previous vehicles'));
    await pumpFeatureUi(tester);
    expect(find.text('FIRST 1234'), findsOneWidget);
    await tester.tap(find.text('More vehicles'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('More guests'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('First vehicles'));
    await pumpFeatureUi(tester);
    expect(find.text('FIRST 1234'), findsOneWidget);
    expect(find.text('Second Guest'), findsOneWidget);
    await tester.tap(find.text('First guests'));
    await pumpFeatureUi(tester);
    expect(find.text('First Guest'), findsOneWidget);
    await tester.tap(find.text('More vehicles'));
    await pumpFeatureUi(tester);
    repository.error = const PermissionException('Revoked');
    await tester.runAsync(() => store.clearProgram('account', 'program'));
    await pumpFeatureUi(tester);
    expect(find.text('SECOND 5678'), findsNothing);
    expect(find.text('First Guest'), findsNothing);
    expect(find.text('More guests'), findsNothing);
    repository.error = null;
    await tester.tap(find.text('Refresh hotel'));
    await pumpFeatureUi(tester);
    expect(repository.cursors.last, (null, null));
    expect(find.text('FIRST 1234'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
