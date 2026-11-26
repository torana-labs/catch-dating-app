import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_room_list_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The hotel's room list, read only: a guest-name search, then one row per
/// allocated room with its guests, their dates and the room number.
class StaffHotelRoomListBody extends StatelessWidget {
  const StaffHotelRoomListBody({
    super.key,
    required this.state,
    required this.onSearch,
    required this.onRetry,
  });

  final StaffHotelRoomListState state;
  final ValueChanged<String> onSearch;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case StaffHotelRoomListStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case StaffHotelRoomListStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostStaffHotelRoomListErrorTitle,
            message: l10n.hostStaffJobsErrorBody,
            retryLabel: l10n.hostStaffTryAgain,
            onRetry: onRetry,
          ),
        );
      case StaffHotelRoomListStatus.content:
        break;
    }
    final shown = state.shown;
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        if (state.rooms.isNotEmpty)
          CatchSearchField(
            key: const ValueKey<String>('staff-hotel-rooms-search'),
            copy: catchSearchFieldCopy(l10n),
            value: state.query,
            placeholder: l10n.hostStaffDoorSearch,
            semanticLabel: l10n.hostStaffDoorSearchLabel,
            contractExemption:
                'Client-side filter over the loaded room list; never persisted.',
            onChanged: onSearch,
          ),
        CatchSection(
          empty: state.rooms.isEmpty
              ? l10n.hostStaffHotelRoomListEmpty
              : l10n.hostStaffDoorNoMatch,
          children: [
            for (final room in shown)
              CatchIndexRow(
                key: ValueKey<String>('staff-hotel-room-${room.inventoryId}'),
                title: room.guests.map((guest) => guest.displayName).join(', '),
                subtitle: [
                  _dates(l10n, staffHotelRoomStay(room)),
                  if (room.roomLabel == null) room.roomType,
                ].join(' · '),
                value: switch (room.roomLabel) {
                  final label? => l10n.hostStaffHotelRoom(room: label),
                  null => l10n.hostProgrammeLodgingProvisional,
                },
                onTap: null,
              ),
          ],
        ),
      ],
    );
  }

  static String _dates(
    AppLocalizations l10n,
    ({DateTime arrival, DateTime departure}) stay,
  ) => l10n.programsRoomsBlockWindow(
    checkIn: AppTimeFormatters.monthDay(stay.arrival),
    checkOut: AppTimeFormatters.monthDay(stay.departure),
  );
}
