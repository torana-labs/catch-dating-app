import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_read_snapshots.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/programs/presentation/program_hotel_rooms_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../test_pump_helpers.dart';
import 'program_operations_fixture.dart';

Map<String, Object?> _roomsData() => {
  'programId': 'program',
  'hotelId': 'hotel',
  'hotelName': 'Taj Palace',
  'generatedAtMillis': DateTime(2026).millisecondsSinceEpoch,
  'accessExpiresAtMillis': null,
  'roomBlocks': [
    {
      'roomBlockId': 'blk_bride',
      'label': 'Bride family',
      'roomType': 'Suite',
      'totalRooms': 2,
      'assignedCount': 1,
      'remainingRooms': 1,
      'heldForGroupIds': ['grp_bride'],
      'startsAtMillis': DateTime(2026, 2, 14).millisecondsSinceEpoch,
      'endsAtMillis': DateTime(2026, 2, 16).millisecondsSinceEpoch,
    },
  ],
  'stays': [
    {
      'stayId': 'stay_1',
      'guestId': 'g_1',
      'guestDisplayName': 'Nisha Rao',
      'roomBlockId': 'blk_bride',
      'roomLabel': '512',
      'status': 'confirmed',
      'startsAtMillis': DateTime(2026, 2, 14).millisecondsSinceEpoch,
      'endsAtMillis': DateTime(2026, 2, 16).millisecondsSinceEpoch,
      'roomReadyAtMillis': null,
      'hotelArrivedAtMillis': null,
      'revision': 1,
    },
  ],
  'unplacedGuests': [
    {
      'guestId': 'g_2',
      'displayName': 'Vikram Rao',
      'suggestedRoomBlockId': 'blk_bride',
    },
  ],
};

class _Repository extends Fake implements ProgramWorkRepository {
  Map<String, Object?> data = _roomsData();
  final stays = <String>[];
  (String?, String?, ProgramStayStatus?) lastAssignment = (null, null, null);

  @override
  Future<ProgramHotelRooms> getHotelRooms({
    required String programId,
    required String hotelId,
  }) async => ProgramHotelRooms.fromCallableData(data);

  @override
  Future<ProgramMutationResult> upsertStay({
    required String programId,
    required String guestId,
    required String hotelId,
    String? stayId,
    int? expectedRevision,
    String? roomBlockId,
    String? roomLabel,
    ProgramStayStatus? status,
    DateTime? startsAt,
    DateTime? endsAt,
    String? notes,
    bool? markRoomReady,
    bool? markHotelArrived,
  }) async {
    stays.add(stayId ?? 'new-stay');
    lastAssignment = (roomBlockId, roomLabel, status);
    return const ProgramMutationResult(
      entityId: 'stay_new',
      revision: 1,
      alreadyApplied: false,
    );
  }
}

Future<void> _pumpSubject(WidgetTester tester, _Repository repository) async {
  await tester.pumpWidget(
    ProviderScope(
      retry: (_, _) => null,
      overrides: [
        uidProvider.overrideWithValue(const AsyncData('account')),
        programReadSnapshotStoreProvider.overrideWithValue(
          emptyProgramSnapshots(),
        ),
        programWorkRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const ProgramHotelRoomsScreen(
          programId: 'program',
          hotelId: 'hotel',
        ),
      ),
    ),
  );
}

void main() {
  test('room board payload requires its explicit collections', () {
    for (final field in ['roomBlocks', 'stays', 'unplacedGuests']) {
      final data = _roomsData()..remove(field);
      expect(
        () => ProgramHotelRooms.fromCallableData(data),
        throwsFormatException,
      );
    }
  });

  testWidgets('room board renders blocks, stays, and the unplaced queue', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1000, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = _Repository();
    await _pumpSubject(tester, repository);
    await pumpFeatureUi(tester);
    expect(find.text('Needs a room'), findsOneWidget);
    expect(find.text('Vikram Rao'), findsOneWidget);
    expect(find.text('Suggested block: Bride family'), findsOneWidget);
    expect(find.text('Nisha Rao'), findsOneWidget);
    expect(find.text('Room 512 · Bride family'), findsOneWidget);
    expect(find.text('CONFIRMED'), findsOneWidget);
    expect(find.text('Bride family · Suite'), findsOneWidget);
    expect(find.text('1 OF 2 LEFT'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('assigning an unplaced guest writes a stay on the block', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1000, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = _Repository();
    await _pumpSubject(tester, repository);
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Vikram Rao'));
    await pumpFeatureUi(tester);
    await tester.enterText(find.byType(TextField), '514');
    await tester.tap(find.text('Assign room'));
    await pumpFeatureUi(tester);
    expect(repository.stays, ['new-stay']);
    expect(repository.lastAssignment, (
      'blk_bride',
      '514',
      ProgramStayStatus.held,
    ));
    expect(tester.takeException(), isNull);
  });

  testWidgets('checked-in stays lock placement and permit checkout', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1000, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = _Repository();
    final stays = repository.data['stays']! as List;
    (stays.single as Map)['status'] = 'checkedIn';
    await _pumpSubject(tester, repository);
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Nisha Rao'));
    await pumpFeatureUi(tester);
    expect(tester.widget<TextField>(find.byType(TextField)).readOnly, isTrue);
    expect(find.text('Held'), findsNothing);
    expect(find.text('Confirmed'), findsNothing);
    expect(find.text('Cancelled'), findsNothing);
    await tester.tap(find.text('Checked out'));
    await tester.tap(find.text('Save stay'));
    await pumpFeatureUi(tester);
    expect(repository.lastAssignment, (
      'blk_bride',
      '512',
      ProgramStayStatus.checkedOut,
    ));
    expect(tester.takeException(), isNull);
  });

  testWidgets('empty board renders inline empty states', (tester) async {
    tester.view.physicalSize = const Size(1000, 1800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repository = _Repository()
      ..data = (_roomsData()
        ..['roomBlocks'] = const []
        ..['stays'] = const []
        ..['unplacedGuests'] = const []);
    await _pumpSubject(tester, repository);
    await pumpFeatureUi(tester);
    expect(
      find.text('Everyone routed here already has a stay.'),
      findsOneWidget,
    );
    expect(find.text('No stays recorded at this hotel yet.'), findsOneWidget);
    expect(
      find.text('No blocks reserved — stays assign ad-hoc.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });
}
