import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_board.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_review.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_grid.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Asks the server where a party could move in the proposal on show.
typedef HostProgrammeLodgingPreview =
    Future<List<ProgramLodgingDestination>> Function(
      String proposalId,
      String partyId,
    );

/// Moves a party to a room, which makes a new proposal.
typedef HostProgrammeLodgingMove =
    Future<void> Function(
      String proposalId,
      String partyId,
      String inventoryId,
    );

/// The stay planner's proposal as a list beside its room board.
///
/// The list: the pane header, three numbers, what the proposal could not
/// do, the decisions (approve, confirm each hotel, publish rooms to
/// guests) with membership review, setup, regenerate and refresh, then the
/// room-sharing parties. The detail: the floor on show as a list or as the
/// hotel's floor map. Picking a party asks for its destinations; picking a
/// room shows why it fits or not; Move party proposes the change.
///
/// It keeps only the board selection. Every read and write goes back
/// through the callbacks, and a selection from an older proposal is
/// dropped when a new one arrives.
class HostProgrammeLodgingBody extends StatefulWidget {
  const HostProgrammeLodgingBody({
    super.key,
    required this.state,
    required this.review,
    required this.onBack,
    required this.onPreview,
    required this.onMove,
    required this.onDecide,
    required this.onMembership,
    required this.onEditSetup,
    required this.onRegenerate,
    required this.onRefresh,
  });

  final HostProgrammeLodgingState state;
  final ProgramLodgingReview review;
  final VoidCallback onBack;
  final HostProgrammeLodgingPreview onPreview;
  final HostProgrammeLodgingMove onMove;

  /// Runs a decision; a hotel confirmation names its hotel.
  final void Function(ProgramLodgingAction action, {String? hotelId}) onDecide;
  final VoidCallback onMembership;
  final VoidCallback onEditSetup;
  final VoidCallback onRegenerate;
  final VoidCallback onRefresh;

  @override
  State<HostProgrammeLodgingBody> createState() =>
      _HostProgrammeLodgingBodyState();
}

class _HostProgrammeLodgingBodyState extends State<HostProgrammeLodgingBody> {
  String? _partyId;
  String? _layerId;
  String? _destinationId;
  var _destinations = <ProgramLodgingDestination>[];
  var _layout = HostProgrammeLodgingGridLayout.list;
  var _previewPending = false;
  var _moving = false;
  var _boardOpen = false;
  var _epoch = 0;
  Object? _error;

  bool get _pending => _previewPending || _moving;
  ProgramLodgingProposal get _proposal => widget.review.proposal;

  @override
  void didUpdateWidget(covariant HostProgrammeLodgingBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.review.proposal.id != _proposal.id ||
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
    if (_pending || !party.canMove || widget.state.locked) return;
    final epoch = ++_epoch;
    final proposalId = _proposal.id;
    setState(() {
      _partyId = party.id;
      _destinationId = null;
      _destinations = [];
      _previewPending = true;
      _error = null;
    });
    try {
      final options = await widget.onPreview(proposalId, party.id);
      if (!mounted || epoch != _epoch) return;
      final ids = options.map((option) => option.inventoryId).toSet();
      if (ids.length != options.length ||
          !ids.every(
            (id) => widget.review.units.any((u) => u.inventoryId == id),
          )) {
        throw StateError('Invalid lodging destination projection');
      }
      setState(() => _destinations = options);
    } on Object catch (error) {
      if (mounted && epoch == _epoch) setState(() => _error = error);
    } finally {
      if (mounted && epoch == _epoch) setState(() => _previewPending = false);
    }
  }

  Future<void> _move() async {
    final party = widget.review.parties
        .where((p) => p.id == _partyId)
        .firstOrNull;
    final target = _destinations
        .where((d) => d.inventoryId == _destinationId && d.allowed)
        .firstOrNull;
    if (_pending || party == null || !party.canMove || target == null) return;
    final epoch = ++_epoch;
    final proposalId = _proposal.id;
    setState(() {
      _moving = true;
      _error = null;
    });
    try {
      await widget.onMove(proposalId, party.id, target.inventoryId);
      if (!mounted || epoch != _epoch) return;
      setState(() {
        _partyId = null;
        _destinationId = null;
        _destinations = [];
      });
    } on Object catch (error) {
      if (mounted && epoch == _epoch) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _moving = false);
    }
  }

  /// Leaves the board: the party, its destinations and the picked room go.
  /// A move on its way keeps the board open until it settles.
  void _closeBoard() {
    if (_moving) return;
    setState(() {
      _epoch++;
      _previewPending = false;
      _boardOpen = false;
      _partyId = null;
      _destinationId = null;
      _destinations = [];
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final review = widget.review;
    final layers = {
      for (final unit in review.units) unit.layerId: unit.layerLabel,
    };
    final layerId = layers.containsKey(_layerId)
        ? _layerId
        : layers.keys.firstOrNull;
    final state = widget.state;
    final proposal = _proposal;
    final approved = review.workflow['approvedProposalId'] == proposal.id;
    final published =
        review.workflow['guestPublishedProposalId'] == proposal.id;
    final retry = state.retryAction;
    final idle = !state.locked;
    String hotel(String id) => review.hotelLabels[id] ?? id;
    final listPane = CatchStack(
      gap: CatchStackGap.g16,
      children: [
        CatchPaneHeader(
          title: l10n.hostProgrammeLodgingTitle,
          back: CatchTopBarBack(onPressed: widget.onBack),
        ),
        CatchText(
          l10n.hostProgrammeLodgingSubtitle,
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostProgrammeLodgingParties,
              value: '${review.parties.length}',
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammeRoomsTitle,
              value: '${review.units.length}',
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammeRoomsWaiting,
              value: '${proposal.unplacedPartyIds.length}',
              mode: CatchMetricTileMode.plain,
            ),
          ],
        ),
        if (state.error case final error?)
          CatchNotice.inline(
            key: const ValueKey<String>('host-programme-lodging-error'),
            tone: CatchNoticeTone.danger,
            icon: CatchIcons.error,
            body: appErrorMessage(
              error,
              l10n: l10n,
              context: AppErrorContext.event,
            ),
          ),
        if (proposal.unplacedPartyIds.isNotEmpty)
          CatchNotice.inline(
            tone: CatchNoticeTone.warning,
            icon: CatchIcons.hotel,
            body: l10n.hostProgrammeLodgingUnplaced(
              count: proposal.unplacedPartyIds.length,
            ),
          ),
        if (!proposal.searchComplete)
          CatchNotice.inline(
            tone: CatchNoticeTone.warning,
            icon: CatchIcons.info,
            body: l10n.hostProgrammeLodgingBoundedSearch,
          ),
        for (final explanation in proposal.explanations)
          CatchNotice.inline(
            tone: CatchNoticeTone.neutral,
            icon: CatchIcons.info,
            body: explanation,
          ),
        CatchSection(
          title: l10n.hostProgrammeLodgingReview,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchStack(
              gap: CatchStackGap.g8,
              children: [
                CatchButton(
                  key: const ValueKey<String>('host-programme-lodging-approve'),
                  label: l10n.hostProgrammeLodgingApprove,
                  fullWidth: true,
                  onPressed:
                      state.busy ||
                          proposal.unplacedPartyIds.isNotEmpty ||
                          (retry != null &&
                              retry != ProgramLodgingAction.approve) ||
                          (retry == null && approved)
                      ? null
                      : () => widget.onDecide(ProgramLodgingAction.approve),
                ),
                for (final hotelId in review.allocatedHotelIds)
                  CatchButton(
                    key: ValueKey<String>(
                      'host-programme-lodging-confirm-$hotelId',
                    ),
                    label: review.isHotelConfirmed(hotelId)
                        ? l10n.hostProgrammeLodgingHotelConfirmed(
                            hotel: hotel(hotelId),
                          )
                        : l10n.hostProgrammeLodgingConfirmHotel(
                            hotel: hotel(hotelId),
                          ),
                    variant: CatchButtonVariant.secondary,
                    fullWidth: true,
                    onPressed:
                        state.busy ||
                            !approved ||
                            review.isHotelConfirmed(hotelId) ||
                            (retry != null &&
                                (retry != ProgramLodgingAction.confirmHotel ||
                                    state.retryHotelId != hotelId))
                        ? null
                        : () => widget.onDecide(
                            ProgramLodgingAction.confirmHotel,
                            hotelId: hotelId,
                          ),
                  ),
                CatchButton(
                  key: const ValueKey<String>('host-programme-lodging-publish'),
                  label: l10n.hostProgrammeLodgingPublish,
                  fullWidth: true,
                  onPressed:
                      state.busy ||
                          (retry != null &&
                              retry != ProgramLodgingAction.publishGuests) ||
                          (retry == null && (!approved || published))
                      ? null
                      : () =>
                            widget.onDecide(ProgramLodgingAction.publishGuests),
                ),
                CatchButton(
                  key: const ValueKey<String>(
                    'host-programme-lodging-membership',
                  ),
                  label: l10n.hostProgrammeLodgingMembershipTitle,
                  variant: CatchButtonVariant.secondary,
                  fullWidth: true,
                  onPressed: idle ? widget.onMembership : null,
                ),
                CatchButton(
                  key: const ValueKey<String>('host-programme-lodging-setup'),
                  label: l10n.hostProgrammeLodgingEditSetup,
                  variant: CatchButtonVariant.secondary,
                  fullWidth: true,
                  onPressed: idle ? widget.onEditSetup : null,
                ),
                CatchButton(
                  key: const ValueKey<String>(
                    'host-programme-lodging-regenerate',
                  ),
                  label: l10n.hostProgrammeLodgingRegenerate,
                  variant: CatchButtonVariant.secondary,
                  fullWidth: true,
                  onPressed: idle ? widget.onRegenerate : null,
                ),
                CatchButton(
                  key: const ValueKey<String>('host-programme-lodging-refresh'),
                  label: l10n.hostProgrammeLodgingRefresh,
                  variant: CatchButtonVariant.quiet,
                  fullWidth: true,
                  onPressed: idle ? widget.onRefresh : null,
                ),
              ],
            ),
          ],
        ),
        CatchSection(
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('host-programme-lodging-board'),
              icon: CatchIcons.hotel,
              title: l10n.hostProgrammeLodgingRoomBoard,
              value: '${review.units.length}',
              chevron: true,
              onTap: () => setState(() => _boardOpen = true),
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeLodgingParties,
          children: [
            for (final party in review.parties)
              CatchIndexRow(
                key: ValueKey<String>(
                  'host-programme-lodging-party-${party.id}',
                ),
                title: party.label,
                titleMaxLines: 2,
                status: party.canMove ? null : l10n.hostProgrammeLodgingLocked,
                selected: party.id == _partyId,
                leading: CatchAvatar.system(
                  size: CatchAvatarSize.sm,
                  name: party.label,
                ),
                onTap: _pending || !party.canMove || state.locked
                    ? null
                    : () => unawaited(_select(party)),
              ),
          ],
        ),
      ],
    );
    final visible = review.units.where((u) => u.layerId == layerId).toList();
    final target = _destinations
        .where((d) => d.inventoryId == _destinationId)
        .firstOrNull;
    final party = review.parties.where((p) => p.id == _partyId).firstOrNull;
    final locked = widget.state.locked;
    final boardPane = CatchStack(
      gap: CatchStackGap.g16,
      children: [
        CatchPaneHeader(
          title: l10n.hostProgrammeLodgingRoomBoard,
          kicker: party?.label,
          back: CatchTopBarBack(
            label: l10n.hostProgrammeLodgingTitle,
            onPressed: _closeBoard,
          ),
        ),
        if (_error case final error?)
          CatchNotice.inline(
            key: const ValueKey<String>('host-programme-lodging-board-error'),
            tone: CatchNoticeTone.danger,
            icon: CatchIcons.error,
            body: appErrorMessage(
              error,
              l10n: l10n,
              context: AppErrorContext.event,
            ),
          ),
        if (layers.length > 1)
          CatchField<String>.choices(
            key: const ValueKey<String>('host-programme-lodging-floor'),
            copy: catchFieldCopy(l10n),
            title: l10n.hostProgrammeLodgingFloor,
            values: layers.keys.toList(),
            itemLabelBuilder: (id) => layers[id]!,
            selected: {?layerId},
            onSelectionChanged: _pending || locked
                ? null
                : (value) => setState(() {
                    _layerId = value.firstOrNull ?? _layerId;
                    _destinationId = null;
                  }),
          )
        else if (layerId != null)
          CatchText(
            layers[layerId]!,
            variant: CatchTextVariant.labelKicker,
            tone: CatchTextTone.secondary,
          ),
        CatchPageTabBar<HostProgrammeLodgingGridLayout>.segmented(
          key: const ValueKey<String>('host-programme-lodging-layout'),
          selected: _layout,
          size: CatchPageTabBarSize.sm,
          onChanged: (value) => setState(() => _layout = value),
          options: [
            CatchOption(
              value: HostProgrammeLodgingGridLayout.list,
              label: l10n.hostProgrammeLodgingList,
            ),
            CatchOption(
              value: HostProgrammeLodgingGridLayout.floorMap,
              label: l10n.hostProgrammeLodgingMap,
            ),
          ],
        ),
        HostProgrammeLodgingGrid(
          units: visible,
          parties: review.parties,
          layout: _layout,
          destinations: _destinations,
          selectedId: _destinationId,
          onPick: _pending || locked
              ? null
              : (id) => setState(() => _destinationId = id),
          onSelectParty: _pending || locked
              ? null
              : (partyId) {
                  final party = review.parties
                      .where((p) => p.id == partyId)
                      .firstOrNull;
                  if (party != null) unawaited(_select(party));
                },
        ),
        if (target != null) ...[
          CatchNotice.inline(
            key: const ValueKey<String>('host-programme-lodging-explanation'),
            tone: target.allowed
                ? CatchNoticeTone.neutral
                : CatchNoticeTone.warning,
            icon: target.allowed ? CatchIcons.check : CatchIcons.info,
            body: target.explanation,
          ),
          CatchButton(
            key: const ValueKey<String>('host-programme-lodging-move'),
            label: l10n.hostProgrammeLodgingMove,
            fullWidth: true,
            status: _pending
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            onPressed:
                !_pending &&
                    !locked &&
                    (party?.canMove ?? false) &&
                    target.allowed
                ? () => unawaited(_move())
                : null,
          ),
        ],
      ],
    );
    final list = CatchScrollView(
      primary: false,
      child: CatchPageBody(child: listPane),
    );
    final detail = CatchScrollView(
      primary: false,
      child: CatchPageBody(child: boardPane),
    );
    return CatchPaneLayout(
      pattern: CatchPaneLayoutMode.listDetail,
      detailOpen: _partyId != null || _boardOpen,
      children: [list, detail],
    );
  }
}
