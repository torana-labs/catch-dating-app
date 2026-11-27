import 'package:catch_dating_app/contexts/programmes/data/program_lodging_providers.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_room_list_body.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_room_list_state.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The hotel desk's room list for one hotel, always night, opened from the
/// desk (`view=rooms`). It reads the approved allocation once through
/// `manageProgramLodging` (`hotelBoard`): every room placed at this hotel
/// with its guests' names and stay dates. The server answers only for a
/// hotel the caller's desk duty covers, or for a coordinator or owner, and
/// sends no contact details. Read only: it writes nothing, and the search
/// filters the loaded rows on the phone.
class StaffHotelRoomListScreen extends ConsumerStatefulWidget {
  const StaffHotelRoomListScreen({
    super.key,
    required this.programId,
    required this.hotelId,
  });

  final String programId;
  final String hotelId;

  @override
  ConsumerState<StaffHotelRoomListScreen> createState() =>
      _StaffHotelRoomListScreenState();
}

class _StaffHotelRoomListScreenState
    extends ConsumerState<StaffHotelRoomListScreen> {
  var _query = '';

  ProgramLodgingHotelBoardProvider get _board =>
      programLodgingHotelBoardProvider(widget.programId, widget.hotelId);

  @override
  void didUpdateWidget(StaffHotelRoomListScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.programId != widget.programId ||
        oldWidget.hotelId != widget.hotelId) {
      _query = '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final board = catchAsyncStateFromAsyncValue(ref.watch(_board));
    final state = switch (board) {
      CatchAsyncState(hasData: true, :final value?) =>
        StaffHotelRoomListState.fromBoard(value, query: _query),
      CatchAsyncState(hasError: true) => const StaffHotelRoomListState.error(),
      _ => const StaffHotelRoomListState.loading(),
    };
    return CatchRoot(
      theme: CatchThemeMode.night,
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('staff-hotel-rooms-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.live,
          title: state.hotelName ?? l10n.hostStaffDutyHotel,
          kicker: l10n.hostStaffHotelRoomList,
          back: CatchTopBarBack(
            onPressed: () => hostWorkspaceBack(
              context,
              fallback: Routes.hostWorkScreen.path,
            ),
          ),
          live: l10n.hostStaffHotelLive,
        ),
        body: StaffHotelRoomListBody(
          state: state,
          onSearch: (query) => setState(() => _query = query),
          onRetry: () => ref.invalidate(_board),
        ),
      ),
    );
  }
}
