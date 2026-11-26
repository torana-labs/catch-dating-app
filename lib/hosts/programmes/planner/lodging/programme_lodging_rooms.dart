import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_board.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// How the stay planner lays out one floor's rooms.
enum HostProgrammeLodgingRoomsLayout {
  /// Rooms in board order, four to a row.
  list,

  /// Rooms where the hotel recorded them on the floor: one row per
  /// recorded line, one column per recorded position, gaps kept.
  floorMap,
}

/// One floor of the stay planner's room board as tiles: each room's label,
/// the parties in it and whether its exact room is still pending.
///
/// It reads nothing and writes nothing. Before a party is chosen, tapping
/// a room chooses the movable party in it. Once the server has judged the
/// rooms, a room the party could move to takes the attention ring, every
/// judged room is tappable to see why, an empty room shows as vacant, and
/// the picked room is selected.
class HostProgrammeLodgingRooms extends StatelessWidget {
  const HostProgrammeLodgingRooms({
    super.key,
    required this.units,
    required this.parties,
    required this.layout,
    required this.destinations,
    required this.selectedId,
    required this.onPick,
    this.onSelectParty,
  });

  /// The rooms on the floor on show.
  final List<ProgramLodgingBoardUnit> units;
  final List<ProgramLodgingBoardParty> parties;
  final HostProgrammeLodgingRoomsLayout layout;

  /// Every room the server judged for the selected party, allowed or not.
  final List<ProgramLodgingDestination> destinations;

  /// The room picked as the move's destination.
  final String? selectedId;

  /// Picks a judged room; null while a call is on its way.
  final ValueChanged<String>? onPick;

  /// Chooses a room's movable party while no rooms are judged; null while
  /// a call is on its way.
  final ValueChanged<String>? onSelectParty;

  static const _perRow = 4;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (units.isEmpty) {
      return CatchEmptyState(
        icon: CatchIcons.hotel,
        title: l10n.hostProgrammeLodgingEmpty,
      );
    }
    Widget tile(ProgramLodgingBoardUnit unit) {
      final judged = destinations
          .where((d) => d.inventoryId == unit.inventoryId)
          .firstOrNull;
      final names = [
        for (final party in parties)
          if (unit.partyIds.contains(party.id)) party.label,
      ];
      final pick = onPick;
      final select = onSelectParty;
      final movable = parties
          .where((p) => p.canMove && unit.partyIds.contains(p.id))
          .firstOrNull;
      return CatchChoiceTile(
        key: ValueKey<String>(
          'host-programme-lodging-room-${unit.inventoryId}',
        ),
        variant: CatchChoiceTileVariant.tile,
        contractExemption: 'A room on the stay planner board.',
        title: unit.layoutUnit.label,
        subtitle: names.isEmpty
            ? l10n.hostProgrammeRoomsFree
            : names.join(', '),
        meta: unit.provisional ? l10n.hostProgrammeLodgingProvisional : null,
        selected: selectedId == unit.inventoryId,
        emphasis: judged?.allowed ?? false
            ? CatchChoiceTileEmphasis.attention
            : names.isEmpty
            ? CatchChoiceTileEmphasis.vacant
            : CatchChoiceTileEmphasis.regular,
        onTap: judged != null && pick != null
            ? () => pick(unit.inventoryId)
            : destinations.isEmpty && movable != null && select != null
            ? () => select(movable.id)
            : null,
      );
    }

    final rows =
        switch (layout) {
          HostProgrammeLodgingRoomsLayout.floorMap => _floorRows(units),
          HostProgrammeLodgingRoomsLayout.list => null,
        } ??
        [
          for (var start = 0; start < units.length; start += _perRow)
            [
              for (var index = start; index < start + _perRow; index++)
                index < units.length ? units[index] : null,
            ],
        ];
    return CatchStack(
      key: ValueKey<String>('host-programme-lodging-rooms-${layout.name}'),
      gap: CatchStackGap.g8,
      children: [
        for (final row in rows)
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            gap: CatchStackGap.g8,
            children: [
              for (final unit in row)
                if (unit == null) const SizedBox.shrink() else tile(unit),
            ],
          ),
      ],
    );
  }

  /// The floor's recorded positions as a grid: the rows and columns the
  /// rooms use, in order, with a gap where a position holds no room. Null
  /// when two rooms share a position, so neither is hidden; the list shows.
  static List<List<ProgramLodgingBoardUnit?>>? _floorRows(
    List<ProgramLodgingBoardUnit> units,
  ) {
    final cells = {
      for (final u in units) (u.layoutUnit.gridX, u.layoutUnit.gridY),
    };
    if (cells.length != units.length) return null;
    final columns = units.map((u) => u.layoutUnit.gridX).toSet().toList()
      ..sort();
    final lines = units.map((u) => u.layoutUnit.gridY).toSet().toList()..sort();
    return [
      for (final line in lines)
        [
          for (final column in columns)
            units
                .where(
                  (u) =>
                      u.layoutUnit.gridY == line &&
                      u.layoutUnit.gridX == column,
                )
                .firstOrNull,
        ],
    ];
  }
}
