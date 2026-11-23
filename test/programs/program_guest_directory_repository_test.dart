import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_guest_directory_repository.dart';
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
    Map<String, int>? duties,
    Map<String, int>? programAll,
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
    'duties': duties ?? {},
    'pickupAll': <String, int>{},
    'pickupScoped': <String, int>{},
    'hotelAll': <String, int>{},
    'hotelScoped': <String, int>{},
    'functionAll': <String, int>{},
    'functionScoped': <String, int>{},
    'programAll': programAll ?? <String, int>{},
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

  Map<String, Object?> row(
    String kind,
    String id,
    Map<String, Object?> body, {
    String programId = 'p1',
  }) => {
    'programId': programId,
    'organizerId': 'o1',
    'kind': kind,
    'sourceId': id,
    'guest': null,
    'household': null,
    'group': null,
    kind: body,
    'version': 1,
  };

  Map<String, Object?> guest(
    String id,
    String name, {
    String? householdId,
    List<String> groupIds = const [],
    String? contactId,
  }) => row('guest', id, {
    'displayName': name,
    'householdId': householdId,
    'contactId': contactId,
    'phoneE164': '+919900000001',
    'email': null,
    'externalReference': null,
    'groupIds': groupIds,
    'invitationStatus': 'invited',
    'rsvpStatus': 'attending',
    'revision': 3,
    'functions': [
      {
        'functionId': 'fn-1',
        'invited': true,
        'rsvpStatus': 'attending',
        'attendanceStatus': 'expected',
        'partySize': 2,
      },
    ],
  });

  Future<FakeFirebaseFirestore> seeded(Map<String, Object?> view) async {
    final firestore = FakeFirebaseFirestore();
    await firestore.collection('programAccessViews').doc('p1__u1').set(view);
    final rows = <String, Map<String, Object?>>{
      'guest__g-2': guest(
        'g-2',
        'Zoya Khan',
        householdId: 'hh-1',
        groupIds: ['grp-1'],
        contactId: 'contact-2',
      ),
      'guest__g-1': guest('g-1', 'Asha Mehta'),
      'guest__other': guest('other', 'Elsewhere', householdId: 'hh-1'),
      'household__hh-1': row('household', 'hh-1', {
        'label': 'Khan household',
        'memberGuestIds': ['g-2'],
        'revision': 2,
      }),
      'household__hh-empty': row('household', 'hh-empty', {
        'label': 'Nobody yet',
        'memberGuestIds': <String>[],
        'revision': 1,
      }),
      'group__grp-1': row('group', 'grp-1', {
        'label': 'Bride side',
        'dimension': 'side',
        'sortOrder': 1,
        'memberCount': 1,
        'revision': 5,
      }),
    };
    rows['guest__other'] = {...rows['guest__other']!, 'programId': 'p2'};
    for (final entry in rows.entries) {
      await firestore
          .collection('programGuestDirectoryViews')
          .doc(entry.key)
          .set(entry.value);
    }
    return firestore;
  }

  ProgramGuestDirectoryRepository repository(FakeFirebaseFirestore firestore) =>
      ProgramGuestDirectoryRepository(
        firestore,
        ProgramAccessRepository(firestore, AppClock.custom(() => now)),
      );

  test('the owner reads the page with the rows its guests name', () async {
    final firestore = await seeded(access(role: 'manager'));
    final page = await repository(firestore).watchFirstPage('p1', 'u1').first;
    expect(page.programId, 'p1');
    expect(page.guests.map((guest) => guest.guestId), ['g-1', 'g-2']);
    final zoya = page.guests.last;
    expect(zoya.displayName, 'Zoya Khan');
    expect(zoya.householdId, 'hh-1');
    expect(zoya.contactId, 'contact-2');
    expect(zoya.revision, 3);
    // Only the households and groups the page's guests name.
    expect(page.households.single.householdId, 'hh-1');
    expect(page.households.single.memberGuestIds, ['g-2']);
    expect(page.groups.single.groupId, 'grp-1');
    expect(page.groups.single.dimension, 'side');
    expect(page.functionGuests.map((row) => row.guestId), ['g-1', 'g-2']);
    expect(page.functionGuests.first.partySize, 2);
    expect(page.nextCursor, isNull);
  });

  test(
    'a whole-programme guest relations duty reads it; others do not',
    () async {
      final desk = await seeded(
        access(
          duties: {'guestRelations': hour},
          programAll: {'guestRelations': hour},
        ),
      );
      expect(
        (await repository(desk).watchFirstPage('p1', 'u1').first).guests,
        hasLength(2),
      );
      // A guest relations duty scoped to one hotel is not the whole programme.
      final scoped = await seeded(access(duties: {'guestRelations': hour}));
      await expectLater(
        repository(scoped).watchFirstPage('p1', 'u1'),
        emitsError(isA<PermissionException>()),
      );
    },
  );

  test('a guest written elsewhere appears with no new subscription', () async {
    final firestore = await seeded(access(role: 'manager'));
    final seen = <int>[];
    final subscription = repository(
      firestore,
    ).watchFirstPage('p1', 'u1').listen((page) => seen.add(page.guests.length));
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(seen.last, 2);
    await firestore
        .collection('programGuestDirectoryViews')
        .doc('guest__g-3')
        .set(guest('g-3', 'Mira Das'));
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(seen.last, 3);
    await subscription.cancel();
  });

  test('guest pages follow the cursor in name order', () async {
    final firestore = await seeded(access(role: 'manager'));
    final directory = repository(firestore);
    final first = await directory.guestPage('p1', limit: 1);
    expect(first.items.single.guestId, 'g-1');
    expect(first.hasMore, isTrue);
    final second = await directory.guestPage(
      'p1',
      limit: 1,
      cursor: first.nextCursor,
    );
    expect(second.items.single.guestId, 'g-2');
    expect(second.items.single.contactId, 'contact-2');
    expect(second.hasMore, isFalse);
  });
}
