import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_dating_app/programs/presentation/program_stay_actions_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The hotel desk's room board for one property: routed guests still needing
/// a room, every stay with its block/room/status, and the reserved blocks
/// with live capacity. Mutations go through `upsertProgramStay` — the server
/// re-counts block occupancy inside the transaction, so a stale board can
/// never overbook.
class ProgramHotelRoomsScreen extends ConsumerWidget {
  const ProgramHotelRoomsScreen({
    super.key,
    required this.programId,
    required this.hotelId,
  });

  final String programId;
  final String hotelId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roomsAsync = ref.watch(programHotelRoomsProvider(programId, hotelId));
    return CatchAsyncBoundary<ProgramHotelRooms>(
      retainDataOn: const {},
      value: roomsAsync,
      onRetry: () =>
          ref.invalidate(programHotelRoomsProvider(programId, hotelId)),
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsRoomsTitle,
          subtitle: context.l10n.programsRoomsSubtitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: const CatchRouteBody.standardViewport(
          child: CatchStateViewport.loading(accountForBottomOverlay: false),
        ),
      ),
      errorBuilder: (_, error, _, onBoundaryRetry) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsRoomsTitle,
          subtitle: context.l10n.programsRoomsSubtitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            error,
            context: AppErrorContext.event,
            onRetry: onBoundaryRetry,
            retryLabel: context.l10n.programsRoomsRefresh,
          ),
        ),
      ),
      builder: (context, rooms) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: rooms.hotelName,
          subtitle: context.l10n.programsRoomsSubtitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: CatchRouteBody.standardSections(
          sections: [
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsRoomsUnplacedTitle,
                subtitle: context.l10n.programsRoomsUnplacedSubtitle,
                child: rooms.unplacedGuests.isEmpty
                    ? CatchEmptyState(
                        icon: CatchIcons.success,
                        message: context.l10n.programsRoomsUnplacedEmpty,
                        variant: CatchEmptyStateVariant.inline,
                      )
                    : Column(
                        children: [
                          for (final guest in rooms.unplacedGuests)
                            ProgramUnplacedGuestRow(
                              key: ValueKey(guest.guestId),
                              guest: guest,
                              rooms: rooms,
                              onChanged: () => ref.invalidate(
                                programHotelRoomsProvider(programId, hotelId),
                              ),
                            ),
                        ],
                      ),
              ),
            ),
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsRoomsStaysTitle,
                subtitle: context.l10n.programsRoomsStaysSubtitle,
                child: rooms.stays.isEmpty
                    ? CatchEmptyState(
                        icon: CatchIcons.hotel,
                        message: context.l10n.programsRoomsStaysEmpty,
                        variant: CatchEmptyStateVariant.inline,
                      )
                    : Column(
                        children: [
                          for (final stay in rooms.stays)
                            ProgramStayRow(
                              key: ValueKey(stay.stayId),
                              stay: stay,
                              rooms: rooms,
                              onChanged: () => ref.invalidate(
                                programHotelRoomsProvider(programId, hotelId),
                              ),
                            ),
                        ],
                      ),
              ),
            ),
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsRoomsBlocksTitle,
                subtitle: context.l10n.programsRoomsBlocksSubtitle,
                child: rooms.roomBlocks.isEmpty
                    ? CatchEmptyState(
                        icon: CatchIcons.business,
                        message: context.l10n.programsRoomsBlocksEmpty,
                        variant: CatchEmptyStateVariant.inline,
                      )
                    : Column(
                        children: [
                          for (final block in rooms.roomBlocks)
                            ProgramRoomBlockRow(
                              key: ValueKey(block.roomBlockId),
                              block: block,
                            ),
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A routed guest with no live stay — tap to assign block and room.
class ProgramUnplacedGuestRow extends StatelessWidget {
  const ProgramUnplacedGuestRow({
    super.key,
    required this.guest,
    required this.rooms,
    required this.onChanged,
  });

  final ProgramUnplacedGuest guest;
  final ProgramHotelRooms rooms;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final suggested = rooms.roomBlocks
        .where((block) => block.roomBlockId == guest.suggestedRoomBlockId)
        .firstOrNull;
    return CatchFieldRow.standard(
      leading: Icon(CatchIcons.person),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(guest.displayName, variant: CatchTextVariant.sectionTitle),
          CatchMetaRow(
            icon: CatchIcons.key,
            label: suggested != null
                ? context.l10n.programsRoomsSuggestedBlock(
                    label: suggested.label,
                  )
                : context.l10n.programsRoomsNoSuggestion,
          ),
        ],
      ),
      trailing: Icon(CatchIcons.disclosure),
      onTap: () => showCatchBottomSheet<void>(
        context: context,
        builder: (sheetContext) => ProgramStaySheet(
          programId: rooms.programId,
          hotelId: rooms.hotelId,
          blocks: rooms.roomBlocks,
          guestId: guest.guestId,
          guestDisplayName: guest.displayName,
          suggestedRoomBlockId: guest.suggestedRoomBlockId,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

/// One stay row: guest, room, block, lifecycle status; tap to manage.
class ProgramStayRow extends StatelessWidget {
  const ProgramStayRow({
    super.key,
    required this.stay,
    required this.rooms,
    required this.onChanged,
  });

  final ProgramStay stay;
  final ProgramHotelRooms rooms;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final block = rooms.roomBlocks
        .where((candidate) => candidate.roomBlockId == stay.roomBlockId)
        .firstOrNull;
    return CatchFieldRow.standard(
      leading: Icon(CatchIcons.hotel),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(
            stay.guestDisplayName,
            variant: CatchTextVariant.sectionTitle,
          ),
          CatchMetaRow(
            icon: CatchIcons.key,
            label: stay.roomLabel != null
                ? context.l10n.programsRoomsStayRoom(
                    room: stay.roomLabel!,
                    block: block?.label ?? context.l10n.programsRoomsAdHocBlock,
                  )
                : block?.label ?? context.l10n.programsRoomsAdHocBlock,
          ),
          if (stay.roomReadyAt != null || stay.hotelArrivedAt != null)
            CatchMetaRow(
              icon: CatchIcons.success,
              label: [
                if (stay.roomReadyAt != null)
                  context.l10n.programsRoomsMarkedReady(
                    time: AppTimeFormatters.time(stay.roomReadyAt!),
                  ),
                if (stay.hotelArrivedAt != null)
                  context.l10n.programsRoomsMarkedArrived(
                    time: AppTimeFormatters.time(stay.hotelArrivedAt!),
                  ),
              ].join(' · '),
            ),
        ],
      ),
      trailing: CatchBadge.functional(
        label: _statusLabel(context, stay.status),
        tone: _statusTone(stay.status),
      ),
      onTap: () => showCatchBottomSheet<void>(
        context: context,
        builder: (sheetContext) => ProgramStaySheet(
          programId: rooms.programId,
          hotelId: rooms.hotelId,
          blocks: rooms.roomBlocks,
          guestId: stay.guestId,
          guestDisplayName: stay.guestDisplayName,
          stay: stay,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

/// A reserved room block with live capacity — read-only on the desk board.
class ProgramRoomBlockRow extends StatelessWidget {
  const ProgramRoomBlockRow({super.key, required this.block});

  final ProgramRoomBlock block;

  @override
  Widget build(BuildContext context) {
    return CatchFieldRow.standard(
      leading: Icon(CatchIcons.business),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(
            block.roomType != null
                ? '${block.label} · ${block.roomType}'
                : block.label,
            variant: CatchTextVariant.sectionTitle,
          ),
          CatchMetaRow(
            icon: CatchIcons.key,
            label: context.l10n.programsRoomsBlockWindow(
              checkIn: AppTimeFormatters.dateTime(block.startsAt),
              checkOut: AppTimeFormatters.dateTime(block.endsAt),
            ),
          ),
          if (block.heldForGroupIds.isNotEmpty)
            CatchMetaRow(
              icon: CatchIcons.people,
              label: context.l10n.programsRoomsBlockHeld(
                count: block.heldForGroupIds.length,
              ),
            ),
        ],
      ),
      trailing: CatchBadge.functional(
        label: context.l10n.programsRoomsBlockCapacity(
          remaining: block.remainingRooms,
          total: block.totalRooms,
        ),
        tone: block.remainingRooms > 0
            ? CatchBadgeTone.brand
            : CatchBadgeTone.warning,
      ),
    );
  }
}

/// Assign or manage one guest's stay: block, room label, lifecycle status,
/// and the desk's room-ready / guest-arrived marks.
class ProgramStaySheet extends ConsumerStatefulWidget {
  const ProgramStaySheet({
    super.key,
    required this.programId,
    required this.hotelId,
    required this.blocks,
    required this.guestId,
    required this.guestDisplayName,
    required this.onChanged,
    this.stay,
    this.suggestedRoomBlockId,
  });

  final String programId;
  final String hotelId;
  final List<ProgramRoomBlock> blocks;
  final String guestId;
  final String guestDisplayName;

  /// Existing stay when managing; null when assigning a new guest.
  final ProgramStay? stay;

  /// Block the allocation policy suggested for a new stay.
  final String? suggestedRoomBlockId;
  final VoidCallback onChanged;

  @override
  ConsumerState<ProgramStaySheet> createState() => _ProgramStaySheetState();
}

class _ProgramStaySheetState extends ConsumerState<ProgramStaySheet> {
  late final TextEditingController _roomController;
  late String? _roomBlockId;
  late ProgramStayStatus _status;
  bool _busy = false;
  Object? _error;

  bool get _isNew => widget.stay == null;
  bool get _placementLocked =>
      widget.stay?.status == ProgramStayStatus.checkedIn;

  @override
  void initState() {
    super.initState();
    _roomController = TextEditingController(text: widget.stay?.roomLabel);
    _roomBlockId = widget.stay?.roomBlockId ?? widget.suggestedRoomBlockId;
    _status = widget.stay?.status ?? ProgramStayStatus.held;
  }

  @override
  void dispose() {
    _roomController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(programStayActionsProvider.notifier)
          .saveStay(
            programId: widget.programId,
            guestId: widget.guestId,
            hotelId: widget.hotelId,
            stayId: widget.stay?.stayId,
            expectedRevision: widget.stay?.revision,
            roomBlockId: _roomBlockId,
            roomLabel: _roomController.text.trim().isEmpty
                ? null
                : _roomController.text.trim(),
            status: _status,
          );
      if (!mounted) return;
      Navigator.of(context).pop();
      widget.onChanged();
    } on Object catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _mark({required bool roomReady}) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(programStayActionsProvider.notifier)
          .markStay(
            programId: widget.programId,
            guestId: widget.guestId,
            hotelId: widget.hotelId,
            stayId: widget.stay!.stayId,
            expectedRevision: widget.stay!.revision,
            markRoomReady: roomReady,
            markHotelArrived: !roomReady,
          );
      if (!mounted) return;
      Navigator.of(context).pop();
      widget.onChanged();
    } on Object catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final statuses = _isNew
        ? const [ProgramStayStatus.held, ProgramStayStatus.confirmed]
        : _placementLocked
        ? const [ProgramStayStatus.checkedIn, ProgramStayStatus.checkedOut]
        : ProgramStayStatus.values;
    return CatchSheet.standard(
      title: _isNew
          ? context.l10n.programsRoomsAssignTitle
          : context.l10n.programsRoomsManageTitle,
      subtitle: widget.guestDisplayName,
      glyph: CatchIcons.hotel,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        label: _isNew
            ? context.l10n.programsRoomsAssignConfirm
            : context.l10n.programsRoomsManageConfirm,
        status: _busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
        onPressed: _save,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(
            context.l10n.programsRoomsBlockLabel,
            variant: CatchTextVariant.statusLabel,
          ),
          gapH8,
          for (final option in <(String?, String)>[
            (null, context.l10n.programsRoomsAdHocBlock),
            for (final block in widget.blocks)
              if (block.remainingRooms > 0 ||
                  block.roomBlockId == widget.stay?.roomBlockId)
                (block.roomBlockId, block.label),
          ])
            CatchFieldRow.standard(
              leading: Icon(
                _roomBlockId == option.$1
                    ? CatchIcons.selected
                    : CatchIcons.unselected,
              ),
              body: CatchText(
                option.$2,
                variant: CatchTextVariant.sectionTitle,
              ),
              onTap: _placementLocked || _busy
                  ? null
                  : () => setState(() => _roomBlockId = option.$1),
            ),
          gapH12,
          CatchSection.containedFieldRows(
            children: [
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.programsRoomsRoomLabel,
                controller: _roomController,
                inputMode: _placementLocked || _busy
                    ? CatchTextInputMode.readOnly
                    : CatchTextInputMode.editable,
                contract: CatchContractConstraints
                    .upsertProgramStayCallablePayloadRoomLabel,
              ),
            ],
          ),
          gapH12,
          CatchText(
            context.l10n.programsRoomsStatusLabel,
            variant: CatchTextVariant.statusLabel,
          ),
          gapH8,
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              for (final status in statuses)
                CatchButton.command(
                  label: _statusLabel(context, status),
                  onPressed: _busy || _status == status
                      ? null
                      : () => setState(() => _status = status),
                ),
            ],
          ),
          if (!_isNew &&
              (widget.stay!.roomReadyAt == null ||
                  widget.stay!.hotelArrivedAt == null)) ...[
            gapH12,
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                if (widget.stay!.roomReadyAt == null)
                  CatchButton.command(
                    label: context.l10n.programsRoomsMarkReady,
                    onPressed: _busy ? null : () => _mark(roomReady: true),
                  ),
                if (widget.stay!.hotelArrivedAt == null)
                  CatchButton.command(
                    label: context.l10n.programsRoomsMarkArrived,
                    onPressed: _busy ? null : () => _mark(roomReady: false),
                  ),
              ],
            ),
          ],
          if (_error != null) ...[
            gapH12,
            CatchBanner.error(
              message: appErrorMessage(_error!, l10n: context.l10n),
            ),
          ],
        ],
      ),
    );
  }
}

String _statusLabel(BuildContext context, ProgramStayStatus status) {
  return switch (status) {
    ProgramStayStatus.held => context.l10n.programsRoomsStatusHeld,
    ProgramStayStatus.confirmed => context.l10n.programsRoomsStatusConfirmed,
    ProgramStayStatus.checkedIn => context.l10n.programsRoomsStatusCheckedIn,
    ProgramStayStatus.checkedOut => context.l10n.programsRoomsStatusCheckedOut,
    ProgramStayStatus.cancelled => context.l10n.programsRoomsStatusCancelled,
  };
}

CatchBadgeTone _statusTone(ProgramStayStatus status) {
  return switch (status) {
    ProgramStayStatus.held => CatchBadgeTone.neutral,
    ProgramStayStatus.confirmed => CatchBadgeTone.brand,
    ProgramStayStatus.checkedIn => CatchBadgeTone.success,
    ProgramStayStatus.checkedOut => CatchBadgeTone.neutral,
    ProgramStayStatus.cancelled => CatchBadgeTone.warning,
  };
}
