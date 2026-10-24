import 'dart:async';
import 'dart:math' as math;

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/event_success/domain/event_success_layout.dart';
import 'package:catch_dating_app/programs/domain/program_lodging_board.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Reuses EventSuccess's 2D grid normalization only, never its pair/rotation
/// semantics. No write occurs without an injected authoritative callback.
class ProgramLodgingLayout extends StatefulWidget {
  const ProgramLodgingLayout({
    super.key,
    required this.proposalId,
    required this.units,
    required this.parties,
    required this.copy,
    this.onPreview,
    this.onMove,
  });

  final String proposalId;
  final List<ProgramLodgingBoardUnit> units;
  final List<ProgramLodgingBoardParty> parties;
  final ProgramLodgingBoardCopy copy;
  final Future<List<ProgramLodgingDestination>> Function(
    String proposalId,
    String partyId,
  )?
  onPreview;
  final Future<void> Function(
    String proposalId,
    String partyId,
    String inventoryId,
  )?
  onMove;

  @override
  State<ProgramLodgingLayout> createState() => _ProgramLodgingLayoutState();
}

class _ProgramLodgingLayoutState extends State<ProgramLodgingLayout> {
  String? _partyId;
  String? _layerId;
  String? _destinationId;
  var _destinations = <ProgramLodgingDestination>[];
  var _map = false;
  var _previewPending = false;
  var _moving = false;
  bool get _pending => _previewPending || _moving;
  var _epoch = 0;
  Object? _error;

  @override
  void didUpdateWidget(covariant ProgramLodgingLayout oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.proposalId != widget.proposalId ||
        oldWidget.onMove != widget.onMove ||
        oldWidget.onPreview != widget.onPreview) {
      _epoch++;
      _partyId = null;
      _destinationId = null;
      _destinations = [];
      _previewPending = false;
      _error = null;
    }
  }

  Future<void> _select(ProgramLodgingBoardParty party) async {
    final preview = widget.onPreview;
    if (_pending ||
        !party.canMove ||
        preview == null ||
        widget.onMove == null) {
      return;
    }
    final epoch = ++_epoch;
    final proposalId = widget.proposalId;
    setState(() {
      _partyId = party.id;
      _destinationId = null;
      _destinations = [];
      _previewPending = true;
      _error = null;
    });
    try {
      final options = await preview(proposalId, party.id);
      if (!mounted || epoch != _epoch) return;
      final ids = options.map((option) => option.inventoryId).toSet();
      if (ids.length != options.length ||
          !ids.every((id) => widget.units.any((u) => u.inventoryId == id))) {
        throw StateError('Invalid lodging destination projection');
      }
      setState(() => _destinations = options);
    } catch (error) {
      if (mounted && epoch == _epoch) setState(() => _error = error);
    } finally {
      if (mounted && epoch == _epoch) setState(() => _previewPending = false);
    }
  }

  Future<void> _move() async {
    final move = widget.onMove;
    final party = widget.parties.where((p) => p.id == _partyId).firstOrNull;
    final target = _destinations
        .where((d) => d.inventoryId == _destinationId && d.allowed)
        .firstOrNull;
    if (_pending ||
        move == null ||
        party == null ||
        !party.canMove ||
        target == null) {
      return;
    }
    final epoch = ++_epoch;
    final proposalId = widget.proposalId;
    setState(() {
      _moving = true;
      _error = null;
    });
    try {
      await move(proposalId, party.id, target.inventoryId);
      if (!mounted || epoch != _epoch) return;
      setState(() {
        _partyId = null;
        _destinationId = null;
        _destinations = [];
      });
    } catch (error) {
      if (mounted && epoch == _epoch) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _moving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final layers = {
      for (final unit in widget.units) unit.layerId: unit.layerLabel,
    };
    final selectedLayer = layers.containsKey(_layerId)
        ? _layerId
        : layers.keys.firstOrNull;
    final visible = widget.units
        .where((u) => u.layerId == selectedLayer)
        .toList();
    final selectedTarget = _destinations
        .where((d) => d.inventoryId == _destinationId)
        .firstOrNull;
    final movable = widget.parties.any((p) => p.id == _partyId && p.canMove);
    final roomTiles = {
      for (final unit in visible)
        unit.inventoryId: CatchButton(
          key: ValueKey('lodging-room-${unit.inventoryId}'),
          label: [
            unit.layoutUnit.label,
            for (final party in widget.parties)
              if (unit.partyIds.contains(party.id)) party.label,
            if (unit.provisional) widget.copy.provisional,
          ].join(' · '),
          variant: _destinationId == unit.inventoryId
              ? CatchButtonVariant.secondary
              : CatchButtonVariant.ghost,
          onPressed:
              _pending ||
                  !_destinations.any((d) => d.inventoryId == unit.inventoryId)
              ? null
              : () => setState(() => _destinationId = unit.inventoryId),
        ),
    };
    return CatchSectionList(
      emptyStateOmitted: true,
      gap: CatchSpacing.s3,
      children: [
        if (_error != null)
          CatchLocalizedErrorBanner(_error!, context: AppErrorContext.event),
        CatchSection.fieldRows(
          title: widget.copy.parties,
          children: [
            for (final party in widget.parties)
              CatchButton(
                key: ValueKey('lodging-party-${party.id}'),
                label: party.canMove
                    ? party.label
                    : '${party.label} · ${widget.copy.locked}',
                variant: _partyId == party.id
                    ? CatchButtonVariant.secondary
                    : CatchButtonVariant.ghost,
                onPressed:
                    _pending ||
                        !party.canMove ||
                        widget.onMove == null ||
                        widget.onPreview == null
                    ? null
                    : () => unawaited(_select(party)),
              ),
          ],
        ),
        if (layers.isNotEmpty)
          CatchChoiceInput<String>(
            values: layers.keys.toList(),
            itemLabelBuilder: (id) => layers[id]!,
            selected: {selectedLayer!},
            mode: CatchChipMode.single,
            onChanged: _pending
                ? null
                : (value) => setState(() {
                    _layerId = value.single;
                    _destinationId = null;
                  }),
          ),
        CatchChoiceInput<bool>(
          values: const [false, true],
          itemLabelBuilder: (map) => map ? widget.copy.map : widget.copy.list,
          selected: {_map},
          mode: CatchChipMode.single,
          onChanged: (value) => setState(() => _map = value.single),
        ),
        if (visible.isEmpty)
          CatchEmptyState(
            icon: CatchIcons.hotel,
            message: widget.copy.empty,
            variant: CatchEmptyStateVariant.inline,
          )
        else if (_map)
          ProgramLodgingFloorLayout(units: visible, tiles: roomTiles)
        else
          CatchSection.fieldRows(
            title: widget.copy.rooms,
            children: [
              for (final unit in visible) roomTiles[unit.inventoryId]!,
            ],
          ),
        if (selectedTarget != null) ...[
          CatchText(
            selectedTarget.explanation,
            variant: CatchTextVariant.supporting,
          ),
          CatchButton(
            key: const ValueKey('lodging-move'),
            label: widget.copy.move,
            status: _pending
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed:
                !_pending &&
                    movable &&
                    selectedTarget.allowed &&
                    widget.onMove != null
                ? () => unawaited(_move())
                : null,
          ),
        ],
      ],
    );
  }
}

class ProgramLodgingFloorLayout extends StatelessWidget {
  const ProgramLodgingFloorLayout({
    super.key,
    required this.units,
    required this.tiles,
  });

  final List<ProgramLodgingBoardUnit> units;
  final Map<String, Widget> tiles;

  @override
  Widget build(BuildContext context) {
    final normalized = normalizeEventSuccessLayoutUnits(
      units.map((u) => u.layoutUnit),
    );
    final columns = units.map((u) => u.layoutUnit.gridX).reduce(math.max) + 1;
    final rows = units.map((u) => u.layoutUnit.gridY).reduce(math.max) + 1;
    return CatchSurface(
      backgroundColor: CatchTokens.of(context).raised,
      borderRole: CatchBorderRole.separator,
      padding: CatchInsets.content,
      child: AspectRatio(
        aspectRatio: CatchAspectRatio.roomMap,
        child: InteractiveViewer(
          constrained: false,
          child: SizedBox(
            width: columns * CatchLodgingLayout.mapColumnExtent,
            height: rows * CatchSpacing.s16,
            child: Stack(
              children: [
                for (var index = 0; index < normalized.length; index++)
                  Positioned(
                    left:
                        normalized[index].left *
                        columns *
                        CatchLodgingLayout.mapColumnExtent,
                    top: normalized[index].top * rows * CatchSpacing.s16,
                    width:
                        normalized[index].width *
                        columns *
                        CatchLodgingLayout.mapColumnExtent,
                    height: normalized[index].height * rows * CatchSpacing.s16,
                    child:
                        tiles[units
                            .firstWhere(
                              (u) => u.layoutUnit.id == normalized[index].id,
                            )
                            .inventoryId]!,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
