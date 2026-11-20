import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_room_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final now = DateTime.utc(2026, 11, 20, 10);
  int ms(Duration after) => now.add(after).millisecondsSinceEpoch;
  final hour = ms(const Duration(hours: 1));

  Map<String, Object?> access({
    String role = 'staff',
    Map<String, int> duties = const {},
    Map<String, int> hotelScoped = const {},
    Map<String, int> hotelAll = const {},
    int? expiresAt,
  }) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'uid': 'u1',
    'ownerUid': 'owner',
    'role': role,
    'status': 'active',
    'activeFromMillis': 0,
    'expiresAtMillis': role == 'manager' ? null : expiresAt ?? hour,
    'duties': duties,
    'pickupAll': <String, int>{},
    'pickupScoped': <String, int>{},
    'hotelAll': hotelAll,
    'hotelScoped': hotelScoped,
    'functionAll': <String, int>{},
    'functionScoped': <String, int>{},
    'workPickup': <String, int>{},
    'workHotel': <String, int>{},
    'workFunction': <String, int>{},
    'arrivalRoutes': <String, int>{},
    'tripRoutes': <String, int>{},
    'assignments': <Map<String, Object?>>[],
    'grantExpiresAtMillis': role == 'manager' ? null : hour,
    'revision': 1,
    'version': 1,
  };

  Map<String, Object?> board({bool overflow = false, int revision = 4}) => {
    'programId': 'p1',
    'organizerId': 'o1',
    'hotelId': 'h1',
    'hotelName': 'Haveli',
    'overflow': overflow,
    'roomBlocks': overflow
        ? const <Object?>[]
        : [
            {
              'roomBlockId': 'blk_bride',
              'label': 'Bride family',
              'roomType': null,
              'totalRooms': 2,
              'assignedCount': 1,
              'remainingRooms': 1,
              'maxOccupantsPerRoom': 1,
              'heldForGroupIds': ['grp_bride'],
              'startsAtMillis': ms(const Duration(days: 30)),
              'endsAtMillis': ms(const Duration(days: 32)),
            },
          ],
    'stays': overflow
        ? const <Object?>[]
        : [
            {
              'stayId': 'stay_1',
              'guestId': 'g_1',
              'guestDisplayName': 'Nisha Rao',
              'roomBlockId': 'blk_bride',
              'roomLabel': '512',
              'roomOccupancyId': 'stay_1',
              'status': 'confirmed',
              'startsAtMillis': null,
              'endsAtMillis': null,
              'roomReadyAtMillis': null,
              'hotelArrivedAtMillis': null,
              'revision': revision,
            },
          ],
    'unplacedGuests': overflow
        ? const <Object?>[]
        : [
            {
              'guestId': 'g_2',
              'displayName': 'Vikram Rao',
              'suggestedRoomBlockId': 'blk_bride',
            },
          ],
    'version': 1,
  };

  Future<FakeFirebaseFirestore> seeded(
    Map<String, Object?> view, {
    Map<String, Object?>? room,
  }) async {
    final firestore = FakeFirebaseFirestore();
    await firestore.collection('programAccessViews').doc('p1__u1').set(view);
    if (room != null) {
      await firestore
          .collection('programHotelRoomViews')
          .doc('p1__h1')
          .set(room);
    }
    return firestore;
  }

  ProgramRoomViewsRepository repository(FakeFirebaseFirestore firestore) {
    final clock = AppClock.custom(() => now);
    return ProgramRoomViewsRepository(
      firestore,
      ProgramAccessRepository(firestore, clock),
      clock,
    );
  }

  test('the hotel desk reads its board with the stay revisions', () async {
    final firestore = await seeded(
      access(duties: {'hotelDesk': hour}, hotelScoped: {'hotelDesk__h1': hour}),
      room: board(),
    );
    final rooms = await repository(
      firestore,
    ).watchHotelRooms('p1', 'h1', 'u1').first;
    expect(rooms.hotelName, 'Haveli');
    expect(
      rooms.generatedAt.millisecondsSinceEpoch,
      now.millisecondsSinceEpoch,
    );
    expect(rooms.stays.single.revision, 4);
    expect(rooms.stays.single.status, ProgramStayStatus.confirmed);
    expect(rooms.roomBlocks.single.remainingRooms, 1);
    expect(rooms.unplacedGuests.single.suggestedRoomBlockId, 'blk_bride');
  });

  test('a stay written elsewhere arrives with its new revision', () async {
    final firestore = await seeded(access(role: 'manager'), room: board());
    final revisions = <int>[];
    final subscription = repository(firestore)
        .watchHotelRooms('p1', 'h1', 'u1')
        .listen((rooms) => revisions.add(rooms.stays.single.revision));
    await Future<void>.delayed(const Duration(milliseconds: 30));
    await firestore
        .collection('programHotelRoomViews')
        .doc('p1__h1')
        .set(board(revision: 5));
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(revisions, [4, 5]);
    await subscription.cancel();
  });

  test('another hotel, another duty or an expired duty is denied', () async {
    final elsewhere = await seeded(
      access(duties: {'hotelDesk': hour}, hotelScoped: {'hotelDesk__h2': hour}),
      room: board(),
    );
    await expectLater(
      repository(elsewhere).watchHotelRooms('p1', 'h1', 'u1'),
      emitsError(isA<PermissionException>()),
    );
    final dispatcher = await seeded(
      access(duties: {'transportDispatcher': hour}),
      room: board(),
    );
    await expectLater(
      repository(dispatcher).watchHotelRooms('p1', 'h1', 'u1'),
      emitsError(isA<PermissionException>()),
    );
    final gone = ms(const Duration(seconds: -1));
    final expired = await seeded(
      access(
        duties: {'hotelDesk': gone},
        hotelAll: {'hotelDesk': gone},
        expiresAt: gone,
      ),
      room: board(),
    );
    await expectLater(
      repository(expired).watchHotelRooms('p1', 'h1', 'u1'),
      emitsError(isA<PermissionException>()),
    );
  });

  test('a missing or overflowing board is an error', () async {
    final missing = await seeded(access(role: 'manager'));
    await expectLater(
      repository(missing).watchHotelRooms('p1', 'h1', 'u1'),
      emitsError(isA<DocumentNotFoundException>()),
    );
    final overflowing = await seeded(
      access(role: 'manager'),
      room: board(overflow: true),
    );
    await expectLater(
      repository(overflowing).watchHotelRooms('p1', 'h1', 'u1'),
      emitsError(
        isA<BackendOperationException>().having(
          (error) => error.code,
          'code',
          'resource-exhausted',
        ),
      ),
    );
  });
}
