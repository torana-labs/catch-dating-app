import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_desk_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_desk_state.dart';
import 'package:catch_dating_app/programs/presentation/program_stay_actions_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_trip_actions_controller.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The hotel welcome desk for one hotel, always night: the cars on their
/// way with each guest's room, guests at the desk waiting for keys, and the
/// parties still at the airport. Deliberately narrow: no contact fields and
/// no other hotels.
///
/// It reads the hotel's inbound board, paged by cursor, and its room board.
/// Arrived records a car reaching the hotel (`markProgramTripArrived`);
/// Give keys checks the guest in (`upsertProgramStay`).
class StaffHotelDeskScreen extends ConsumerStatefulWidget {
  const StaffHotelDeskScreen({
    super.key,
    required this.programId,
    required this.hotelId,
    this.now,
  });

  final String programId;
  final String hotelId;

  /// Replaces the wall clock in tests and captures.
  final DateTime Function()? now;

  @override
  ConsumerState<StaffHotelDeskScreen> createState() =>
      _StaffHotelDeskScreenState();
}

class _StaffHotelDeskScreenState extends ConsumerState<StaffHotelDeskScreen> {
  final List<String> _tripCursors = [];
  final List<String> _expectedCursors = [];
  final Set<String> _busy = {};
  Object? _error;

  ProgramHotelInboundProvider get _inbound => programHotelInboundProvider(
    widget.programId,
    widget.hotelId,
    tripCursor: _tripCursors.lastOrNull,
    expectedCursor: _expectedCursors.lastOrNull,
  );

  @override
  void didUpdateWidget(StaffHotelDeskScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.programId != widget.programId ||
        oldWidget.hotelId != widget.hotelId) {
      _tripCursors.clear();
      _expectedCursors.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final now = widget.now?.call() ?? DateTime.now();
    final inbound = catchAsyncStateFromAsyncValue(ref.watch(_inbound));
    final rooms = catchAsyncStateFromAsyncValue(
      ref.watch(programHotelRoomsProvider(widget.programId, widget.hotelId)),
    ).value;
    final state = switch (inbound) {
      CatchAsyncState(hasData: true, :final value?) =>
        StaffHotelDeskState.fromInbound(
          value,
          rooms: rooms,
          paged: _tripCursors.isNotEmpty || _expectedCursors.isNotEmpty,
        ),
      CatchAsyncState(hasError: true) => const StaffHotelDeskState.error(),
      _ => const StaffHotelDeskState.loading(),
    };
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('staff-hotel-desk-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.live,
          title: state.hotelName ?? l10n.hostStaffDutyHotel,
          kicker: switch (state.generatedAt) {
            final at? => l10n.hostStaffHotelKicker(
              time: AppTimeFormatters.time(at.toLocal()),
            ),
            null => l10n.hostStaffHotelKickerPlain,
          },
          back: CatchTopBarBack(
            label: l10n.hostStaffBackToJobs,
            onPressed: () => hostWorkspaceBack(
              context,
              fallback: Routes.hostWorkScreen.path,
            ),
          ),
          live: l10n.hostStaffHotelLive,
          actions: [
            CatchButton(
              key: const ValueKey<String>('staff-hotel-departures'),
              label: l10n.hostStaffDeparturesOpen,
              size: CatchButtonSize.sm,
              variant: CatchButtonVariant.secondary,
              onPressed: () => context.pushNamed(
                Routes.hostWorkHotelScreen.name,
                pathParameters: {
                  'programId': widget.programId,
                  'hotelId': widget.hotelId,
                },
                queryParameters: {'view': 'departures'},
              ),
            ),
          ],
        ),
        body: StaffHotelDeskBody(
          state: state,
          now: now,
          busy: _busy,
          error: switch (_error) {
            final error? => appErrorMessage(error, l10n: l10n),
            null => null,
          },
          onArrived: (trip) => unawaited(_arrived(trip)),
          onGiveKeys: (stay) => unawaited(_giveKeys(stay)),
          onRooms: () => context.pushNamed(
            Routes.hostWorkHotelRoomsScreen.name,
            pathParameters: {
              'programId': widget.programId,
              'hotelId': widget.hotelId,
            },
          ),
          onMoreCars: () {
            final cursor = inbound.value?.nextTripCursor;
            if (cursor != null) setState(() => _tripCursors.add(cursor));
          },
          onMoreExpected: () {
            final cursor = inbound.value?.nextExpectedCursor;
            if (cursor != null) setState(() => _expectedCursors.add(cursor));
          },
          onFirstPage: () => setState(() {
            _tripCursors.clear();
            _expectedCursors.clear();
          }),
          onRetry: () {
            setState(() {
              _tripCursors.clear();
              _expectedCursors.clear();
            });
            ref.invalidate(_inbound);
          },
        ),
      ),
    );
  }

  Future<void> _arrived(ProgramTripSummary trip) => _run(
    trip.tripId,
    () => ref
        .read(programTripActionsProvider.notifier)
        .markArrived(
          programId: widget.programId,
          tripId: trip.tripId,
          expectedRevision: trip.revision,
          clientOperationId:
              'arrive_${trip.tripId.hashCode.abs().toRadixString(36)}_'
              '${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}',
        ),
  );

  Future<void> _giveKeys(ProgramStay stay) => _run(
    stay.stayId,
    () => ref
        .read(programStayActionsProvider.notifier)
        .saveStay(
          programId: widget.programId,
          guestId: stay.guestId,
          hotelId: widget.hotelId,
          stayId: stay.stayId,
          expectedRevision: stay.revision,
          status: ProgramStayStatus.checkedIn,
        ),
  );

  /// Runs one desk command for [id], then reads both boards again.
  Future<void> _run(String id, Future<Object?> Function() command) async {
    if (_busy.contains(id)) return;
    setState(() {
      _busy.add(id);
      _error = null;
    });
    try {
      // provider-graph: ownership-widget-async-callback:_StaffHotelDeskScreenState._run:await:command watch CAT156 -- Each desk command is a programme operations controller call passed in by the row; the widget tracks which row is busy and the last error for display only. Lift busy/error into the operations controller in the CAT156 migration.
      await command();
      if (!mounted) return;
      ref
        ..invalidate(_inbound)
        ..invalidate(
          programHotelRoomsProvider(widget.programId, widget.hotelId),
        );
    } on Object catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _busy.remove(id));
    }
  }
}
