import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_rooms_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_rooms_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_routes.dart';
import 'package:catch_dating_app/programs/presentation/program_stay_actions_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Rooms (RbProgRooms) over a hotel room board: who is in which block and
/// who is still waiting.
///
/// Picking a waiting guest and then a free room runs `upsertProgramStay`
/// with that block; Suggest for all places every waiting guest the board
/// suggests a block for, one stay at a time.
class HostProgrammeRoomsScreen extends ConsumerStatefulWidget {
  const HostProgrammeRoomsScreen({
    super.key,
    required this.programId,
    this.initialHotelId,
  });

  final String programId;
  final String? initialHotelId;

  @override
  ConsumerState<HostProgrammeRoomsScreen> createState() =>
      _HostProgrammeRoomsScreenState();
}

class _HostProgrammeRoomsScreenState
    extends ConsumerState<HostProgrammeRoomsScreen> {
  late String? _hotelId = widget.initialHotelId;
  String? _guestId;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(
      hostProgrammeRoomsControllerProvider(widget.programId, _hotelId),
    );
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-rooms-screen'),
        bodyScrolls: false,
        body: HostProgrammeRoomsBody(
          state: state,
          selectedGuestId: _guestId,
          busy: _busy,
          onBack: () => context.canPop()
              ? context.pop()
              : context.goNamed(
                  Routes.hostProgramWorkspaceScreen.name,
                  pathParameters: {'programId': widget.programId},
                ),
          onHotel: (hotelId) => setState(() {
            _hotelId = hotelId;
            _guestId = null;
          }),
          onSelectGuest: (guest) => setState(
            () => _guestId = _guestId == guest.guestId ? null : guest.guestId,
          ),
          onPlace: (block) {
            final guestId = _guestId;
            final hotelId = state.hotelId;
            if (guestId == null || hotelId == null) return;
            unawaited(_place(hotelId, [(guestId, block.roomBlockId)]));
          },
          onSuggestAll: () {
            final hotelId = state.hotelId;
            if (hotelId == null) return;
            unawaited(
              _place(hotelId, [
                for (final guest in state.suggested)
                  (guest.guestId, guest.suggestedRoomBlockId!),
              ]),
            );
          },
          onHotelDetails: () => openHostProgrammePage(
            context,
            widget.programId,
            HostProgrammePage.hotel,
            id: state.hotelId,
          ),
          onOpenGuest: (guestId) {
            final householdId = state.programme.guests?.guests
                .where((guest) => guest.guestId == guestId)
                .firstOrNull
                ?.householdId;
            if (householdId == null) return;
            openHostProgrammePage(
              context,
              widget.programId,
              HostProgrammePage.household,
              id: householdId,
            );
          },
          onRetry: () =>
              refreshHostProgrammeRooms(ref, widget.programId, state.hotelId),
        ),
      ),
    );
  }

  Future<void> _place(String hotelId, List<(String, String)> placements) async {
    if (placements.isEmpty) return;
    final l10n = context.l10n;
    setState(() => _busy = true);
    var placed = 0;
    try {
      for (final (guestId, roomBlockId) in placements) {
        await ref
            .read(programStayActionsProvider.notifier)
            .saveStay(
              programId: widget.programId,
              guestId: guestId,
              hotelId: hotelId,
              roomBlockId: roomBlockId,
              status: ProgramStayStatus.held,
            );
        placed++;
      }
    } on Object catch (error, stackTrace) {
      ref
          .read(errorLoggerProvider)
          .logError(error, stackTrace, reason: 'place a guest in a room');
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.event,
        );
      }
    }
    if (!mounted) return;
    setState(() {
      _busy = false;
      _guestId = null;
    });
    refreshHostProgrammeRooms(ref, widget.programId, hotelId);
    if (placed > 0) {
      showCatchNotice(context, l10n.hostProgrammeRoomsPlaced(count: placed));
    }
  }
}
