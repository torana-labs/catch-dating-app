import 'package:catch_dating_app/contexts/live/live.dart';

/// Presentation-only projection for one dated, immutable lodging proposal.
/// Parsing/authentication stays with the later generated callable adapter.
class ProgramLodgingBoardUnit {
  const ProgramLodgingBoardUnit({
    required this.inventoryId,
    required this.layerId,
    required this.layerLabel,
    required this.layoutUnit,
    required this.partyIds,
    this.provisional = false,
  });

  final String inventoryId;
  final String layerId;
  final String layerLabel;
  final EventSuccessLayoutUnit layoutUnit;
  final List<String> partyIds;
  final bool provisional;
}

class ProgramLodgingBoardParty {
  const ProgramLodgingBoardParty({
    required this.id,
    required this.label,
    this.locked = false,
    this.checkedIn = false,
  });

  final String id;
  final String label;
  final bool locked;
  final bool checkedIn;

  bool get canMove => !locked && !checkedIn;
}

class ProgramLodgingDestination {
  const ProgramLodgingDestination({
    required this.inventoryId,
    required this.allowed,
    required this.explanation,
  });

  final String inventoryId;
  final bool allowed;
  final String explanation;
}

/// Labels come from the owning localized route, not server-controlled copy.
class ProgramLodgingBoardCopy {
  const ProgramLodgingBoardCopy({
    required this.parties,
    required this.rooms,
    required this.list,
    required this.map,
    required this.move,
    required this.locked,
    required this.provisional,
    required this.empty,
  });

  final String parties;
  final String rooms;
  final String list;
  final String map;
  final String move;
  final String locked;
  final String provisional;
  final String empty;
}
