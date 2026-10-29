import 'dart:convert';

import 'package:catch_dating_app/contexts/live/live.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_board.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';

/// Immutable server evidence. Editing a placement creates a new proposal;
/// neither labels nor client coordinates can establish room identity.
class ProgramLodgingProposal {
  ProgramLodgingProposal.fromMap(Object? value) : json = lodgingJsonMap(value) {
    id = requiredString(json, 'id');
    if (!RegExp(r'^[a-f0-9]{64}$').hasMatch(id)) {
      throw const FormatException('Invalid lodging proposal identity.');
    }
    scope = lodgingJsonMap(json['scope']);
    requiredString(scope, 'programId');
    requiredString(scope, 'organizerId');
    revisions = lodgingJsonMap(json['revisions']);
    for (final key in ['source', 'inventory', 'layout', 'published']) {
      if (requiredInt(revisions, key) < 0) {
        throw const FormatException('Invalid lodging revision.');
      }
    }
    placements = List.unmodifiable(mapList(json['placements'], 'placements'));
    final parties = <String>{};
    for (final placement in placements) {
      if (!parties.add(requiredString(placement, 'partyId'))) {
        throw const FormatException('Duplicate lodging party placement.');
      }
      requiredString(placement, 'inventoryId');
    }
    unplacedPartyIds = List.unmodifiable(stringList(json['unplacedPartyIds']));
    explanations = List.unmodifiable(stringList(json['explanations']));
    final search = requiredMap(json['search'], 'search');
    if (search['complete'] is! bool || requiredInt(search, 'explored') < 0) {
      throw const FormatException('Invalid lodging search evidence.');
    }
    searchComplete = search['complete']! as bool;
  }

  final Map<String, Object?> json;
  late final String id;
  late final Map<String, Object?> scope;
  late final Map<String, Object?> revisions;
  late final List<Map<Object?, Object?>> placements;
  late final List<String> unplacedPartyIds;
  late final List<String> explanations;
  late final bool searchComplete;

  List<Map<String, Object?>> moving(String partyId, String inventoryId) => [
    for (final placement in placements)
      if (placement['partyId'] != partyId)
        {
          'partyId': placement['partyId'],
          'inventoryId': placement['inventoryId'],
        },
    {'partyId': partyId, 'inventoryId': inventoryId},
  ];
}

class ProgramLodgingReview {
  ProgramLodgingReview.fromCallableData(Object? value) {
    final map = requiredMap(value, 'lodging review');
    if (map['kind'] != 'proposal') {
      throw const FormatException('Invalid lodging review kind.');
    }
    proposal = ProgramLodgingProposal.fromMap(map['proposal']);
    final context = requiredMap(map['context'], 'lodging context');
    snapshot = lodgingJsonMap(context['snapshot']);
    configuration = lodgingJsonMap(context['configuration']);
    workflow = lodgingJsonMap(context['workflow']);
    workflowRevision = requiredInt(workflow, 'revision');
    accessExpiresAt = requiredNullableDateTime(
      context,
      'accessExpiresAtMillis',
    );
    final scope = requiredMap(snapshot['scope'], 'snapshot scope');
    for (final key in ['programId', 'organizerId']) {
      if (scope[key] != proposal.scope[key] ||
          configuration[key] != proposal.scope[key]) {
        throw const FormatException('Lodging review scope differs.');
      }
    }
    final revisions = requiredMap(snapshot['revisions'], 'snapshot revisions');
    final currentPublished = requiredInt(revisions, 'published');
    final proposalPublished = requiredInt(proposal.revisions, 'published');
    String placementKey(Iterable<Map<Object?, Object?>> rows) {
      final keys =
          rows
              .map(
                (row) => jsonEncode([
                  requiredString(row, 'partyId'),
                  requiredString(row, 'inventoryId'),
                ]),
              )
              .toList()
            ..sort();
      return jsonEncode(keys);
    }

    // Preserve immutable approved identity across precisely its own publication.
    // Editing uses current snapshot revisions; arbitrary stale sources fail.
    final ownPublication =
        workflow['approvedProposalId'] == proposal.id &&
        workflow['guestPublishedProposalId'] == proposal.id &&
        currentPublished == proposalPublished + 1 &&
        placementKey(mapList(snapshot['published'], 'published')) ==
            placementKey(proposal.placements);
    for (final key in proposal.revisions.keys) {
      if (revisions[key] != proposal.revisions[key] &&
          !(key == 'published' && ownPublication)) {
        throw const FormatException('Lodging review revisions differ.');
      }
    }
    final labels = requiredMap(context['labels'], 'lodging labels');
    guestLabels = _labels(labels['guests']);
    hotelLabels = _labels(labels['hotels']);
    final published = mapList(snapshot['published'], 'published');
    parties = List.unmodifiable([
      for (final party in mapList(snapshot['parties'], 'parties'))
        ProgramLodgingBoardParty(
          id: requiredString(party, 'id'),
          label: stringList(
            party['guestIds'],
          ).map((id) => guestLabels[id] ?? id).join(', '),
          locked: published.any(
            (p) => p['partyId'] == party['id'] && p['locked'] == true,
          ),
          checkedIn: published.any(
            (p) => p['partyId'] == party['id'] && p['checkedIn'] == true,
          ),
        ),
    ]);
    final rooms = {
      for (final room in mapList(snapshot['rooms'], 'rooms'))
        requiredString(room, 'id'): room,
    };
    final roomLabels = {
      for (final item in mapList(configuration['labels'], 'labels'))
        requiredString(item, 'inventoryId'): requiredNullableString(
          item,
          'roomLabel',
        ),
    };
    final layerCounts = <String, int>{};
    units = List.unmodifiable([
      for (final unit in mapList(snapshot['inventory'], 'inventory'))
        _unit(unit, rooms, roomLabels, layerCounts),
    ]);
    final partyIds = parties.map((p) => p.id).toSet();
    final unitIds = units.map((u) => u.inventoryId).toSet();
    if (partyIds.length != parties.length ||
        unitIds.length != units.length ||
        !proposal.placements.every(
          (p) =>
              partyIds.contains(p['partyId']) &&
              unitIds.contains(p['inventoryId']),
        ) ||
        !proposal.unplacedPartyIds.every(partyIds.contains)) {
      throw const FormatException('Invalid lodging board references.');
    }
  }

  late final ProgramLodgingProposal proposal;
  late final Map<String, Object?> snapshot;
  late final Map<String, Object?> configuration;
  late final Map<String, Object?> workflow;
  late final int workflowRevision;
  late final DateTime? accessExpiresAt;
  late final Map<String, String> guestLabels;
  late final Map<String, String> hotelLabels;
  late final List<ProgramLodgingBoardParty> parties;
  late final List<ProgramLodgingBoardUnit> units;
  final _inventoryHotels = <String, String>{};

  List<String> get allocatedHotelIds => List.unmodifiable(
    proposal.placements
        .map((p) => _inventoryHotels[requiredString(p, 'inventoryId')]!)
        .toSet()
        .toList()
      ..sort(),
  );

  bool isHotelConfirmed(String hotelId) =>
      workflow['approvedProposalId'] == proposal.id &&
      stringList(workflow['confirmedHotelIds']).contains(hotelId);

  ProgramLodgingBoardUnit _unit(
    Map<Object?, Object?> unit,
    Map<String, Map<Object?, Object?>> rooms,
    Map<String, String?> labels,
    Map<String, int> counts,
  ) {
    final id = requiredString(unit, 'id');
    final provisional = unit['physicalRoomId'] == null;
    final facts = provisional
        ? requiredMap(unit['provisional'], 'provisional')
        : rooms[requiredString(unit, 'physicalRoomId')];
    if (facts == null) {
      throw const FormatException('Missing lodging room facts.');
    }
    final hotelId = requiredString(facts, 'hotelId');
    _inventoryHotels[id] = hotelId;
    final zoneId = requiredString(facts, 'zoneId');
    final layer = [
      hotelId,
      facts['building'],
      facts['floor'],
      facts['wing'],
      zoneId,
    ];
    // Length-prefixed identities avoid collisions from arbitrary labels.
    final layerId = layer
        .map((v) => '${v?.toString().length ?? 0}:${v ?? ''}')
        .join('|');
    final index = counts.update(layerId, (n) => n + 1, ifAbsent: () => 0);
    final position = facts['position'];
    int coordinate(String key, int fallback) {
      if (position == null) return fallback;
      final number = requiredMap(position, 'room position')[key];
      if (number is! num || !number.isFinite || number < 0 || number > 1) {
        throw const FormatException('Invalid room position.');
      }
      return (number * 19).round();
    }

    return ProgramLodgingBoardUnit(
      inventoryId: id,
      layerId: layerId,
      layerLabel: [
        hotelLabels[hotelId] ?? hotelId,
        ...layer.skip(1),
      ].whereType<String>().join(' · '),
      provisional: provisional,
      partyIds: List.unmodifiable(
        proposal.placements
            .where((p) => p['inventoryId'] == id)
            .map((p) => requiredString(p, 'partyId')),
      ),
      layoutUnit: EventSuccessLayoutUnit(
        id: id,
        label: labels[id] ?? id,
        shape: EventSuccessLayoutShape.rect,
        capacity: requiredInt(facts, 'maxOccupants'),
        gridX: coordinate('x', index % 5),
        gridY: coordinate('y', index ~/ 5),
        order: index,
      ),
    );
  }
}

Map<String, String> _labels(Object? value) {
  final result = <String, String>{};
  for (final entry in requiredMap(value, 'labels').entries) {
    if (entry.key is! String || entry.value is! String) {
      throw const FormatException('Invalid lodging label.');
    }
    result[entry.key! as String] = entry.value! as String;
  }
  return Map.unmodifiable(result);
}

/// Defensive deep copy retains immutable proposal bytes without exposing
/// mutable nested maps to editors or retaining a callable SDK result object.
Map<String, Object?> lodgingJsonMap(Object? value) {
  Object? freeze(Object? item) {
    if (item is Map) {
      final result = <String, Object?>{};
      for (final entry in item.entries) {
        if (entry.key is! String) {
          throw const FormatException('Invalid lodging JSON key.');
        }
        result[entry.key as String] = freeze(entry.value);
      }
      return Map<String, Object?>.unmodifiable(result);
    }
    if (item is List) return List<Object?>.unmodifiable(item.map(freeze));
    return switch (item) {
      null => null,
      String value => value,
      bool value => value,
      num value when value.isFinite => value,
      _ => throw const FormatException('Invalid lodging JSON value.'),
    };
  }

  final frozen = freeze(value);
  if (frozen is! Map<String, Object?>) {
    throw const FormatException('Invalid lodging object.');
  }
  return frozen;
}
