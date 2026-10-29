import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> setupCatalogJson() => {
  'programId': 'program',
  'organizerId': 'organizer',
  'timezone': 'Asia/Kolkata',
  'calendarDates': {'100': '2026-10-01', '300': '2026-10-03'},
  'guests': [
    for (final id in ['a', 'b'])
      {
        'id': id,
        'label': id,
        'householdId': 'household',
        'groupIds': ['friends'],
      },
  ],
  'groups': [
    {'id': 'friends', 'label': 'Friends'},
    {'id': 'family', 'label': 'Family'},
  ],
  'hotels': [
    {'id': 'hotel', 'label': 'Hotel', 'active': true},
  ],
  'contracts': [
    {
      'id': 'block',
      'hotelId': 'hotel',
      'label': 'Block',
      'roomType': null,
      'totalRooms': 10,
      'maxOccupantsPerRoom': 2,
      'startsAtMillis': 100,
      'endsAtMillis': 300,
    },
  ],
  'activeStays': <Object?>[],
};

ProgramLodgingDraft draft([Map<String, Object?>? catalog]) =>
    ProgramLodgingDraft(
      catalog: ProgramLodgingCatalog.fromMap(
        catalog ?? setupCatalogJson(),
        programId: 'program',
      ),
    );

ProgramLodgingDraft demand(ProgramLodgingDraft value, String id) => value
    .withDemand(guestId: id, startsAtMillis: 100, endsAtMillis: 300, beds: 1);

ProgramLodgingDraft inventory(
  ProgramLodgingDraft value, {
  String? physicalRoomId,
  String? label,
}) => value.withInventory(
  id: 'unit',
  contractId: 'block',
  zoneId: 'wing-a',
  roomType: 'standard',
  beds: 2,
  maxOccupants: 2,
  physicalRoomId: physicalRoomId,
  roomLabel: label,
  availability: [
    {'arrival': '2026-10-01', 'departure': '2026-10-03'},
  ],
);

void main() {
  test('catalog scope and duplicate canonical identities fail closed', () {
    expect(
      () =>
          ProgramLodgingCatalog.fromMap(setupCatalogJson(), programId: 'other'),
      throwsFormatException,
    );
    final json = setupCatalogJson();
    json['groups'] = [
      {'id': 'same', 'label': 'One'},
      {'id': 'same', 'label': 'Two'},
    ];
    expect(() => draft(json), throwsFormatException);
  });

  test('household and overlapping groups never create demand or sharing', () {
    final initial = draft();
    expect(initial.rows('demand'), isEmpty);
    expect(initial.rows('parties'), isEmpty);
    final changed = demand(initial, 'a');
    expect(changed.rows('demand'), hasLength(1));
    expect(changed.rows('parties'), isEmpty);
    expect(initial.rows('demand'), isEmpty);
    expect(() => changed.setup['demand'] = [], throwsUnsupportedError);
    expect(
      () => changed.rows('demand').single['beds'] = 9,
      throwsUnsupportedError,
    );
  });

  test('explicit sharing cannot duplicate demand across parties', () {
    final value = demand(
      demand(draft(), 'a'),
      'b',
    ).withParty(id: 'party', guestIds: ['a', 'b'], confirmed: true);
    expect(
      () => value.withParty(id: 'second', guestIds: ['b'], confirmed: true),
      throwsFormatException,
    );
    expect(() => value.withoutDemand('a'), throwsFormatException);
    expect(value.setup.keys, isNot(contains('guests')));
    expect(value.setup.keys, isNot(contains('programId')));
  });

  test('nesting cycles fail including paths through multiple groups', () {
    final value = draft().withGroupParents('friends', ['family']);
    expect(
      () => value.withGroupParents('family', ['friends']),
      throwsFormatException,
    );
    expect(
      () => value.withGroupParents('friends', ['friends']),
      throwsFormatException,
    );
    expect(value.rows('groupParents'), hasLength(1));
  });

  test('type-only inventory keeps null physical identity and label', () {
    final value = inventory(draft());
    expect(value.rows('inventory').single['physicalRoomId'], isNull);
    expect(value.rows('labels').single['roomLabel'], isNull);
    expect(value.rows('rooms'), isEmpty);
    expect(() => inventory(draft(), label: '101'), throwsFormatException);
    final exact = inventory(value, physicalRoomId: 'room-id', label: '101');
    expect(exact.rows('inventory').single['id'], 'unit');
    expect(exact.rows('rooms').single['resourceIds'], ['room-id']);
    expect(value.rows('labels').single['roomLabel'], isNull);
  });

  test('checked-in dates and confirmed sharing membership stay unchanged', () {
    final json = setupCatalogJson();
    json['activeStays'] = [
      {
        'id': 'stay',
        'guestId': 'a',
        'hotelId': 'hotel',
        'roomBlockId': 'block',
        'roomLabel': '101',
        'roomOccupancyId': 'occupancy',
        'lodgingPartyId': 'party',
        'lodgingInventoryId': 'unit',
        'startsAtMillis': 100,
        'endsAtMillis': 300,
        'status': 'checkedIn',
        'revision': 2,
      },
    ];
    final value = demand(
      draft(json),
      'a',
    ).withParty(id: 'party', guestIds: ['a'], confirmed: true);
    expect(
      () => value.withDemand(
        guestId: 'a',
        startsAtMillis: 101,
        endsAtMillis: 300,
        beds: 1,
      ),
      throwsFormatException,
    );
    expect(() => value.withoutParty('party'), throwsFormatException);
    expect(
      () => value.withParty(id: 'party', guestIds: ['a'], confirmed: false),
      throwsFormatException,
    );
  });

  test(
    'adoption retains exact stay revision and explicit unchanged binding',
    () {
      final json = setupCatalogJson();
      json['activeStays'] = [
        {
          'id': 'stay',
          'guestId': 'a',
          'hotelId': 'hotel',
          'roomBlockId': 'block',
          'roomLabel': '101',
          'roomOccupancyId': 'occupancy',
          'lodgingPartyId': null,
          'lodgingInventoryId': null,
          'startsAtMillis': 100,
          'endsAtMillis': 300,
          'status': 'confirmed',
          'revision': 7,
        },
      ];
      final value = inventory(
        demand(
          draft(json),
          'a',
        ).withParty(id: 'party', guestIds: ['a'], confirmed: true),
        physicalRoomId: 'room',
        label: '101',
      );
      expect(
        value.adoption(stayId: 'stay', partyId: 'party', inventoryId: 'unit'),
        {
          'stayId': 'stay',
          'partyId': 'party',
          'inventoryId': 'unit',
          'expectedRevision': 7,
        },
      );
      expect(
        () => demand(
          value,
          'b',
        ).adoption(stayId: 'stay', partyId: 'party', inventoryId: 'missing'),
        throwsStateError,
      );
    },
  );
}
