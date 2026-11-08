import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_rooms_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_view.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Rooms as a list beside its detail. The list: the pane header, three
/// numbers, the hotels, and the guests waiting for a room. The detail: the
/// hotel with Suggest for all, the block meter, each room block as a grid
/// of rooms, and the suggestion notice.
class HostProgrammeRoomsBody extends StatelessWidget {
  const HostProgrammeRoomsBody({
    super.key,
    required this.state,
    required this.selectedGuestId,
    required this.onBack,
    required this.onHotel,
    required this.onSelectGuest,
    required this.onPlace,
    required this.onSuggestAll,
    required this.onHotelDetails,
    required this.onOpenGuest,
    required this.onRetry,
    this.busy = false,
  });

  /// Opens a placed guest's household.
  final ValueChanged<String> onOpenGuest;

  final HostProgrammeRoomsState state;

  /// The waiting guest a room tap places.
  final String? selectedGuestId;
  final VoidCallback onBack;
  final ValueChanged<String> onHotel;
  final ValueChanged<ProgramUnplacedGuest> onSelectGuest;

  /// Places the selected guest in a room block.
  final ValueChanged<ProgramRoomBlock> onPlace;
  final VoidCallback onSuggestAll;
  final VoidCallback onHotelDetails;
  final VoidCallback onRetry;

  /// A placement is on its way.
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (state.status != HostProgrammeStatus.ready) {
      return HostProgrammeStateView(status: state.status, onRetry: onRetry);
    }
    final hotelId = state.hotelId;
    final hotel = state.hotels.where((h) => h.hotelId == hotelId).firstOrNull;
    final list = CatchScrollView(
      primary: false,
      child: CatchPageBody(
        child: CatchStack(
          gap: CatchStackGap.g16,
          children: [
            CatchPaneHeader(
              title: l10n.hostProgrammeRoomsTitle,
              back: CatchTopBarBack(
                label: l10n.hostProgrammeBackToProgramme,
                onPressed: onBack,
              ),
              trailing: hotel == null
                  ? null
                  : CatchButton(
                      label: l10n.hostProgrammeRoomsHotelDetails,
                      variant: CatchButtonVariant.secondary,
                      size: CatchButtonSize.sm,
                      onPressed: onHotelDetails,
                    ),
            ),
            if (hotel == null)
              CatchEmptyState(
                icon: CatchIcons.hotel,
                title: l10n.hostProgrammeRoomsNoHotel,
              )
            else ...[
              CatchStack(
                direction: CatchStackDirection.row,
                equal: true,
                children: [
                  CatchMetricTile.stat(
                    label: l10n.hostProgrammeRoomsHeld,
                    value: '${state.held}',
                    mode: CatchMetricTileMode.plain,
                  ),
                  CatchMetricTile.stat(
                    label: l10n.hostProgrammeRoomsPlacedStat,
                    value: '${state.placed}',
                    mode: CatchMetricTileMode.plain,
                  ),
                  CatchMetricTile.stat(
                    label: l10n.hostProgrammeRoomsWaiting,
                    value: '${state.waiting.length}',
                    mode: CatchMetricTileMode.plain,
                  ),
                ],
              ),
              if (state.hotels.length > 1)
                CatchPageTabBar<String>.segmented(
                  selected: hotel.hotelId,
                  label: l10n.hostProgrammeRoomsHotels,
                  size: CatchPageTabBarSize.sm,
                  onChanged: onHotel,
                  options: [
                    for (final option in state.hotels)
                      CatchOption<String>(
                        value: option.hotelId,
                        label: option.name,
                      ),
                  ],
                ),
              CatchSection(
                title: l10n.hostProgrammeRoomsWaitingTitle,
                empty: l10n.hostProgrammeRoomsWaitingEmpty,
                children: [
                  for (final guest in state.waiting)
                    CatchIndexRow(
                      key: ValueKey<String>(
                        'host-programme-waiting-${guest.guestId}',
                      ),
                      title: guest.displayName,
                      subtitle: state.block(guest.suggestedRoomBlockId)?.label,
                      leading: CatchAvatar.system(
                        size: CatchAvatarSize.sm,
                        name: guest.displayName,
                      ),
                      selected: guest.guestId == selectedGuestId,
                      onTap: () => onSelectGuest(guest),
                    ),
                ],
              ),
              CatchNotice.inline(
                tone: CatchNoticeTone.neutral,
                icon: CatchIcons.info,
                body: l10n.hostProgrammeRoomsHowTo,
              ),
            ],
          ],
        ),
      ),
    );
    final detail = CatchScrollView(
      primary: false,
      child: CatchPageBody(
        child: hotel == null
            ? const CatchStack(children: [])
            : _HostProgrammeRoomsDetail(
                state: state,
                hotel: hotel,
                placing: selectedGuestId != null && !busy,
                busy: busy,
                onPlace: onPlace,
                onSuggestAll: onSuggestAll,
                onOpenGuest: onOpenGuest,
              ),
      ),
    );
    return CatchPaneLayout(
      pattern: CatchPaneLayoutMode.listDetail,
      detailOpen: selectedGuestId != null,
      children: [list, detail],
    );
  }
}

class _HostProgrammeRoomsDetail extends StatelessWidget {
  const _HostProgrammeRoomsDetail({
    required this.state,
    required this.hotel,
    required this.placing,
    required this.busy,
    required this.onPlace,
    required this.onSuggestAll,
    required this.onOpenGuest,
  });

  final ValueChanged<String> onOpenGuest;

  final HostProgrammeRoomsState state;
  final ProgramHotel hotel;

  /// A waiting guest is selected, so a block tap places them.
  final bool placing;
  final bool busy;
  final ValueChanged<ProgramRoomBlock> onPlace;
  final VoidCallback onSuggestAll;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final suggested = state.suggested;
    final held = state.held;
    return CatchStack(
      gap: CatchStackGap.g28,
      children: [
        CatchPaneHeader(
          title: hotel.name,
          kicker: l10n.hostProgrammeSetupHotel,
          trailing: suggested.isEmpty
              ? null
              : CatchButton(
                  key: const ValueKey<String>('host-programme-rooms-suggest'),
                  label: l10n.hostProgrammeRoomsSuggestAll(
                    count: suggested.length,
                  ),
                  leading: CatchIcon(CatchIcons.magic),
                  size: CatchButtonSize.sm,
                  onPressed: busy ? null : onSuggestAll,
                ),
        ),
        if (held > 0)
          CatchMeter(
            variant: CatchMeterVariant.stack,
            value: state.placed,
            max: held,
            label: l10n.hostProgrammeRoomsMeter,
            showLabel: true,
            parts: [
              CatchMeterPart(
                label: l10n.hostProgrammeRoomsPlacedStat,
                value: state.placed,
              ),
              CatchMeterPart(
                label: l10n.hostProgrammeRoomsFree,
                value: held - state.placed < 0 ? 0 : held - state.placed,
                color: CatchMeterPartColor.muted,
              ),
            ],
          ),
        if (state.blocks.isEmpty)
          CatchEmptyState(
            icon: CatchIcons.hotel,
            title: l10n.hostProgrammeRoomsNoBlocks,
          ),
        for (final block in state.blocks)
          _HostProgrammeRoomBlock(
            key: ValueKey<String>('host-programme-block-${block.roomBlockId}'),
            state: state,
            block: block,
            onPlace: placing && block.remainingRooms > 0
                ? () => onPlace(block)
                : null,
            onOpenGuest: onOpenGuest,
          ),
        if (suggested.isNotEmpty)
          CatchNotice.inline(
            tone: CatchNoticeTone.warning,
            icon: CatchIcons.magic,
            title: l10n.hostProgrammeRoomsSuggestion,
            body: l10n.hostProgrammeRoomsSuggestionBody(
              count: suggested.length,
            ),
            action: CatchNoticeAction(
              label: l10n.hostProgrammeRoomsPlaceThem,
              onPressed: busy ? null : onSuggestAll,
            ),
          ),
      ],
    );
  }
}

/// One room block as a grid: a tile per placed guest and a tile per free
/// room. A free room places the selected guest.
class _HostProgrammeRoomBlock extends StatelessWidget {
  const _HostProgrammeRoomBlock({
    super.key,
    required this.state,
    required this.block,
    required this.onPlace,
    required this.onOpenGuest,
  });

  final HostProgrammeRoomsState state;
  final ProgramRoomBlock block;
  final VoidCallback? onPlace;
  final ValueChanged<String> onOpenGuest;

  static const _perRow = 4;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final stays = state.staysIn(block);
    final tiles = <Widget>[
      for (final stay in stays)
        CatchChoiceTile(
          key: ValueKey<String>('host-programme-stay-${stay.stayId}'),
          variant: CatchChoiceTileVariant.tile,
          contractExemption: 'A placed guest in a room block.',
          title: stay.roomLabel ?? stay.guestDisplayName,
          subtitle: stay.roomLabel == null ? null : stay.guestDisplayName,
          meta: stay.status == ProgramStayStatus.checkedIn
              ? l10n.hostProgrammeRoomsCheckedIn
              : null,
          onTap: () => onOpenGuest(stay.guestId),
        ),
      for (var free = 0; free < block.remainingRooms; free++)
        CatchChoiceTile(
          key: ValueKey<String>(
            'host-programme-free-${block.roomBlockId}-$free',
          ),
          variant: CatchChoiceTileVariant.tile,
          emphasis: onPlace == null
              ? CatchChoiceTileEmphasis.vacant
              : CatchChoiceTileEmphasis.attention,
          contractExemption: 'A free room in a room block.',
          title: l10n.hostProgrammeRoomsFree,
          onTap: onPlace,
        ),
    ];
    final rows = <Widget>[
      for (var start = 0; start < tiles.length; start += _perRow)
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          gap: CatchStackGap.g8,
          children: [
            for (var index = start; index < start + _perRow; index++)
              if (index < tiles.length)
                tiles[index]
              else
                const SizedBox.shrink(),
          ],
        ),
    ];
    return CatchSection(
      title: block.label,
      kicker: block.roomType,
      note: l10n.hostProgrammeRoomsBlockNote(
        placed: block.assignedCount,
        total: block.totalRooms,
      ),
      dividers: CatchSectionPlacement.none,
      children: rows,
    );
  }
}
