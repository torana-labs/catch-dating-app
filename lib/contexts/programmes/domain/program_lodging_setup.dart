import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// A current, private catalog of canonical identities. Labels and invitation
/// households are display context; neither establishes a sharing party.
class ProgramLodgingCatalog {
  ProgramLodgingCatalog.fromMap(Object? value, {required String programId})
    : json = lodgingJsonMap(value) {
    if (requiredString(json, 'programId') != programId) {
      throw const FormatException(
        'Lodging catalog belongs to another program.',
      );
    }
    requiredString(json, 'organizerId');
    requiredString(json, 'timezone');
    final dates = requiredMap(json['calendarDates'], 'calendar dates');
    if (dates.length > 6000 ||
        dates.entries.any(
          (e) =>
              e.key is! String ||
              !RegExp(r'^[0-9]+$').hasMatch(e.key! as String) ||
              e.value is! String ||
              !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(e.value! as String),
        )) {
      throw const FormatException('Invalid program calendar date labels.');
    }
    for (final key in [
      'guests',
      'groups',
      'hotels',
      'contracts',
      'activeStays',
    ]) {
      final rows = mapList(json[key], key);
      final limit = key == 'activeStays' ? 2000 : 500;
      final ids = <String>{};
      if (rows.length > limit ||
          rows.any((row) => !ids.add(requiredString(row, 'id')))) {
        throw const FormatException('Invalid lodging catalog identities.');
      }
    }
  }

  final Map<String, Object?> json;
  String get programId => requiredString(json, 'programId');
  String get organizerId => requiredString(json, 'organizerId');
  String get timezone => requiredString(json, 'timezone');
  String calendarDate(int millis) => requiredString(
    requiredMap(json['calendarDates'], 'calendar dates'),
    millis.toString(),
  );
  List<Map<Object?, Object?>> rows(String key) =>
      List.unmodifiable(mapList(json[key], key));
  Map<Object?, Object?> row(String key, String id) => rows(key).singleWhere(
    (row) => row['id'] == id,
    orElse: () =>
        throw const FormatException('Canonical lodging item is absent.'),
  );
}

/// Provider-free staged choices. Serialization contains only editable setup
/// fields, never the catalog, contact records, authority or server revisions.
/// The server remains the independent date/capacity/accessibility validator.
class ProgramLodgingDraft {
  ProgramLodgingDraft({
    required this.catalog,
    Map<String, Object?>? configuration,
  }) : expectedRevision = configuration == null
           ? 0
           : requiredInt(configuration, 'revision'),
       setup = lodgingJsonMap({
         for (final key in _fields) key: configuration?[key] ?? <Object?>[],
       }) {
    if (configuration != null &&
        (configuration['programId'] != catalog.programId ||
            configuration['organizerId'] != catalog.organizerId)) {
      throw const FormatException('Lodging setup scope differs.');
    }
  }

  ProgramLodgingDraft._(
    this.catalog,
    this.expectedRevision,
    Map<String, Object?> value,
  ) : setup = lodgingJsonMap(value);

  static const _fields = [
    'demand',
    'parties',
    'groupParents',
    'rooms',
    'inventory',
    'labels',
  ];
  final ProgramLodgingCatalog catalog;
  final int expectedRevision;
  final Map<String, Object?> setup;

  List<Map<Object?, Object?>> rows(String key) =>
      List.unmodifiable(mapList(setup[key], key));

  ProgramLodgingDraft _replace(
    String key,
    String identityKey,
    String id,
    Map<String, Object?>? value,
  ) => ProgramLodgingDraft._(catalog, expectedRevision, {
    ...setup,
    key: [
      for (final row in rows(key))
        if (row[identityKey] != id) row,
      ?value,
    ],
  });

  bool _checkedInGuest(String guestId) => catalog
      .rows('activeStays')
      .any(
        (stay) => stay['guestId'] == guestId && stay['status'] == 'checkedIn',
      );

  ProgramLodgingDraft withDemand({
    required String guestId,
    required int startsAtMillis,
    required int endsAtMillis,
    required int beds,
    List<String> requiredFeatures = const [],
  }) {
    catalog.row('guests', guestId);
    if (startsAtMillis < 0 || startsAtMillis >= endsAtMillis || beds < 1) {
      throw const FormatException('Choose a valid stay window and bed demand.');
    }
    for (final stay
        in catalog
            .rows('activeStays')
            .where(
              (stay) =>
                  stay['guestId'] == guestId && stay['status'] == 'checkedIn',
            )) {
      if (stay['startsAtMillis'] != startsAtMillis ||
          stay['endsAtMillis'] != endsAtMillis) {
        throw const FormatException(
          'Checked-in guest dates must stay unchanged.',
        );
      }
    }
    return _replace('demand', 'guestId', guestId, {
      'guestId': guestId,
      'startsAtMillis': startsAtMillis,
      'endsAtMillis': endsAtMillis,
      'beds': beds,
      'requiredFeatures': requiredFeatures.toSet().toList(),
    });
  }

  ProgramLodgingDraft withoutDemand(String guestId) {
    if (_checkedInGuest(guestId) ||
        rows(
          'parties',
        ).any((party) => stringList(party['guestIds']).contains(guestId))) {
      throw const FormatException(
        'Remove the guest from their sharing party first.',
      );
    }
    return _replace('demand', 'guestId', guestId, null);
  }

  ProgramLodgingDraft withParty({
    required String id,
    required List<String> guestIds,
    required bool confirmed,
    int priority = 0,
    String? requiredRoomType,
    Map<String, Object?>? pin,
  }) {
    final selected = guestIds.toSet();
    final demand = rows('demand').map((row) => row['guestId']).toSet();
    if (id.isEmpty ||
        selected.isEmpty ||
        selected.length != guestIds.length ||
        !selected.every(demand.contains)) {
      throw const FormatException('Select unique guests with lodging demand.');
    }
    for (final party in rows('parties')) {
      final previous = stringList(party['guestIds']).toSet();
      if (party['id'] != id && previous.any(selected.contains)) {
        throw const FormatException('A guest can belong to one sharing party.');
      }
      if (party['id'] == id &&
          previous.any(_checkedInGuest) &&
          (previous.length != selected.length ||
              !previous.every(selected.contains) ||
              !confirmed)) {
        throw const FormatException(
          'Checked-in sharing choices must stay unchanged.',
        );
      }
    }
    return _replace('parties', 'id', id, {
      'id': id,
      'guestIds': guestIds,
      'confirmed': confirmed,
      'priority': priority,
      'requiredRoomType': requiredRoomType,
      'pin': pin,
    });
  }

  ProgramLodgingDraft withoutParty(String id) {
    final party = rows('parties').singleWhere((row) => row['id'] == id);
    if (stringList(party['guestIds']).any(_checkedInGuest)) {
      throw const FormatException(
        'Checked-in sharing parties cannot be removed.',
      );
    }
    return _replace('parties', 'id', id, null);
  }

  ProgramLodgingDraft withGroupParents(String id, List<String> parentIds) {
    catalog.row('groups', id);
    for (final parent in parentIds) {
      catalog.row('groups', parent);
    }
    final result = _replace('groupParents', 'id', id, {
      'id': id,
      'parentIds': parentIds.toSet().toList(),
    });
    final graph = {
      for (final group in result.rows('groupParents'))
        requiredString(group, 'id'): stringList(group['parentIds']),
    };
    final visiting = <String>{};
    final done = <String>{};
    void visit(String node) {
      if (done.contains(node)) return;
      if (!visiting.add(node)) {
        throw const FormatException('Social group nesting contains a cycle.');
      }
      for (final parent in graph[node] ?? <String>[]) {
        visit(parent);
      }
      visiting.remove(node);
      done.add(node);
    }

    for (final node in graph.keys) {
      visit(node);
    }
    return result;
  }

  /// An exact room and a late-release type-only unit share a stable inventory
  /// identity. Verified capacity/features are explicit inputs, never inferred
  /// from the room type or a contracted quota.
  ProgramLodgingDraft withInventory({
    required String id,
    required String contractId,
    required String zoneId,
    required String roomType,
    required int beds,
    required int maxOccupants,
    required List<Map<String, Object?>> availability,
    String? physicalRoomId,
    String? roomLabel,
    String? building,
    String? floor,
    String? wing,
    List<String> verifiedFeatures = const [],
    List<String> resourceIds = const [],
    Map<String, Object?>? position,
  }) {
    final contract = catalog.row('contracts', contractId);
    final hotelId = requiredString(contract, 'hotelId');
    final hotel = catalog.row('hotels', hotelId);
    if (id.isEmpty ||
        zoneId.isEmpty ||
        roomType.isEmpty ||
        beds < 1 ||
        maxOccupants < 1 ||
        maxOccupants > requiredInt(contract, 'maxOccupantsPerRoom') ||
        hotel['active'] != true ||
        availability.isEmpty ||
        (physicalRoomId == null && roomLabel != null) ||
        (physicalRoomId != null &&
            (physicalRoomId.isEmpty ||
                roomLabel == null ||
                roomLabel.isEmpty))) {
      throw const FormatException(
        'Verify the room facts and contracted capacity.',
      );
    }
    final old = rows('inventory').where((row) => row['id'] == id);
    if (old.isNotEmpty &&
        catalog
            .rows('activeStays')
            .any((stay) => stay['lodgingInventoryId'] == id) &&
        (old.single['physicalRoomId'] != physicalRoomId ||
            old.single['contractId'] != contractId)) {
      throw const FormatException('Occupied inventory cannot be repointed.');
    }
    final facts = <String, Object?>{
      'hotelId': hotelId,
      'zoneId': zoneId,
      'building': building,
      'floor': floor,
      'wing': wing,
      'roomType': roomType,
      'beds': beds,
      'maxOccupants': maxOccupants,
      'verifiedFeatures': verifiedFeatures.toSet().toList(),
    };
    var result = this;
    if (physicalRoomId != null) {
      result = result._replace('rooms', 'id', physicalRoomId, {
        'id': physicalRoomId,
        ...facts,
        'resourceIds': {physicalRoomId, ...resourceIds}.toList(),
        'position': position,
      });
    }
    result = result._replace('inventory', 'id', id, {
      'id': id,
      'contractId': contractId,
      'physicalRoomId': physicalRoomId,
      'provisional': physicalRoomId == null ? facts : null,
      'availability': availability,
    });
    return result._replace('labels', 'inventoryId', id, {
      'inventoryId': id,
      'roomLabel': roomLabel,
    });
  }

  ProgramLodgingDraft withoutInventory(String id) {
    if (catalog
            .rows('activeStays')
            .any((stay) => stay['lodgingInventoryId'] == id) ||
        rows('parties').any(
          (party) =>
              party['pin'] is Map &&
              (party['pin']! as Map)['inventoryId'] == id,
        )) {
      throw const FormatException(
        'Occupied or pinned inventory cannot be removed.',
      );
    }
    return _replace(
      'inventory',
      'id',
      id,
      null,
    )._replace('labels', 'inventoryId', id, null);
  }

  /// Verification is explicit per existing stay, never inferred from a room
  /// label. The transaction rechecks the exact revision and unchanged dates.
  Map<String, Object?> adoption({
    required String stayId,
    required String partyId,
    required String inventoryId,
  }) {
    final stay = catalog.row('activeStays', stayId);
    final party = rows('parties').singleWhere((row) => row['id'] == partyId);
    final unit = rows(
      'inventory',
    ).singleWhere((row) => row['id'] == inventoryId);
    final demand = rows(
      'demand',
    ).singleWhere((row) => row['guestId'] == stay['guestId']);
    final label = rows(
      'labels',
    ).singleWhere((row) => row['inventoryId'] == inventoryId);
    if (!stringList(party['guestIds']).contains(stay['guestId']) ||
        unit['contractId'] != stay['roomBlockId'] ||
        label['roomLabel'] != stay['roomLabel'] ||
        demand['startsAtMillis'] != stay['startsAtMillis'] ||
        demand['endsAtMillis'] != stay['endsAtMillis'] ||
        (stay['lodgingPartyId'] != null && stay['lodgingPartyId'] != partyId) ||
        (stay['lodgingInventoryId'] != null &&
            stay['lodgingInventoryId'] != inventoryId)) {
      throw const FormatException('Verify the unchanged stay before adoption.');
    }
    return lodgingJsonMap({
      'stayId': stayId,
      'partyId': partyId,
      'inventoryId': inventoryId,
      'expectedRevision': requiredInt(stay, 'revision'),
    });
  }
}
