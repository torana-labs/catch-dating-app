import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/programmes/parts/staff_hotel_trip_card.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_hotel_desk_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The hotel desk in board order: how many cars are on the way, the three
/// counts, each car with its guests and rooms, guests at the desk with Give
/// keys, and parties still to leave the airport.
class StaffHotelDeskBody extends StatelessWidget {
  const StaffHotelDeskBody({
    super.key,
    required this.state,
    required this.now,
    required this.busy,
    required this.onArrived,
    required this.onGiveKeys,
    required this.onRooms,
    required this.onMoreCars,
    required this.onMoreExpected,
    required this.onFirstPage,
    required this.onRetry,
    this.error,
  });

  final StaffHotelDeskState state;
  final DateTime now;

  /// The trip or stay whose command is on its way.
  final Set<String> busy;
  final ValueChanged<ProgramTripSummary> onArrived;
  final ValueChanged<ProgramStay> onGiveKeys;
  final VoidCallback onRooms;
  final VoidCallback onMoreCars;
  final VoidCallback onMoreExpected;
  final VoidCallback onFirstPage;
  final VoidCallback onRetry;

  /// The last command's failure.
  final String? error;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    switch (state.status) {
      case StaffHotelDeskStatus.loading:
        return const CatchPageBody.screen(child: CatchLoadingIndicator());
      case StaffHotelDeskStatus.error:
        return CatchPageBody.screen(
          child: CatchErrorState(
            title: l10n.hostStaffHotelErrorTitle,
            message: l10n.hostStaffJobsErrorBody,
            retryLabel: l10n.hostStaffTryAgain,
            onRetry: onRetry,
          ),
        );
      case StaffHotelDeskStatus.content:
        break;
    }
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(
          l10n.hostStaffHotelHeadline(count: state.onTheWay.length),
          variant: CatchTextVariant.pageTitle,
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostStaffHotelStatCheckedIn,
              value: state.checkedIn == null
                  ? l10n.hostStaffNoCount
                  : '${state.checkedIn}',
            ),
            CatchMetricTile.stat(
              label: l10n.hostStaffHotelStatToCome,
              value: '${state.stillToCome}',
            ),
            CatchMetricTile.stat(
              label: l10n.hostStaffHotelStatFree,
              value: state.roomsFree == null
                  ? l10n.hostStaffNoCount
                  : '${state.roomsFree}',
            ),
          ],
        ),
        if (error case final message?)
          CatchNotice.inline(tone: CatchNoticeTone.danger, body: message),
        if (state.paged)
          CatchButton(
            label: l10n.hostStaffHotelFirstPage,
            variant: CatchButtonVariant.quiet,
            size: CatchButtonSize.md,
            onPressed: onFirstPage,
          ),
        CatchSection(
          title: l10n.hostStaffHotelOnTheWayTitle,
          dividers: CatchSectionPlacement.none,
          empty: l10n.hostStaffHotelOnTheWayEmpty,
          action: state.moreCars
              ? CatchSectionAction(
                  label: l10n.hostStaffHotelMore,
                  onPressed: onMoreCars,
                )
              : null,
          children: [
            for (final trip in state.onTheWay)
              StaffHotelTripCard(
                trip: trip,
                now: now,
                rooms: state.rooms,
                busy: busy.contains(trip.tripId),
                onArrived: () => onArrived(trip),
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostStaffHotelAtDeskTitle,
          empty: l10n.hostStaffHotelAtDeskEmpty,
          action: CatchSectionAction(
            label: l10n.hostStaffHotelRooms,
            onPressed: onRooms,
          ),
          children: [
            for (final stay in state.atDesk)
              CatchIndexRow(
                key: ValueKey<String>('staff-hotel-stay-${stay.stayId}'),
                title: stay.guestDisplayName,
                subtitle: [
                  if (stay.roomLabel case final room?)
                    l10n.hostStaffHotelRoom(room: room),
                  if (stay.roomReadyAt != null) l10n.hostStaffHotelRoomReady,
                ].join(' · '),
                action: CatchIndexRowAction(
                  label: l10n.hostStaffHotelGiveKeys,
                  variant: CatchIndexRowActionVariant.primary,
                  onPressed: busy.contains(stay.stayId)
                      ? null
                      : () => onGiveKeys(stay),
                ),
                onTap: null,
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostStaffHotelStillTitle,
          empty: l10n.hostStaffHotelStillEmpty,
          action: state.moreExpected
              ? CatchSectionAction(
                  label: l10n.hostStaffHotelMore,
                  onPressed: onMoreExpected,
                )
              : null,
          children: [
            for (final leg in state.stillToLeave)
              CatchIndexRow(
                key: ValueKey<String>('staff-hotel-leg-${leg.legId}'),
                title: l10n.hostStaffDispatchParty(
                  party: leg.partyLabel ?? leg.guestDisplayName,
                  count: leg.passengers,
                ),
                subtitle: switch (leg.curbAt) {
                  final at? => l10n.hostStaffHotelOutAt(
                    time: AppTimeFormatters.time(at.toLocal()),
                  ),
                  null =>
                    leg.readiness == TravelLegReadiness.disrupted
                        ? l10n.hostStaffArrivalsDisrupted
                        : l10n.hostStaffArrivalsNoEstimate,
                },
                value: state.rooms[leg.guestDisplayName],
                onTap: null,
              ),
          ],
        ),
      ],
    );
  }
}
