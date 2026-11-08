import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// A car on its way to the hotel desk: the vehicle and plate, how far out it
/// is, and each guest in it with the room the desk holds for them. Arrived
/// records the car reaching the hotel.
class StaffHotelTripCard extends StatelessWidget {
  const StaffHotelTripCard({
    super.key,
    required this.trip,
    required this.now,
    required this.rooms,
    required this.onArrived,
    this.busy = false,
  });

  final ProgramTripSummary trip;
  final DateTime now;

  /// Room labels by guest name, from the hotel's room board.
  final Map<String, String> rooms;

  /// Null hides Arrived, for a car that is no longer on its way.
  final VoidCallback? onArrived;

  /// The arrival is on its way to the server.
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final eta = trip.estimatedArriveAt;
    final minutes = eta?.difference(now).inMinutes;
    final (status, tone) = switch (trip.status) {
      TransportTripStatus.enRoute => (
        switch (minutes) {
          null => l10n.hostStaffHotelOnTheWay,
          <= 1 => l10n.hostStaffHotelAlmostHere,
          final left => l10n.hostStaffHotelMinutesAway(count: left),
        },
        CatchIndexRowTone.success,
      ),
      TransportTripStatus.arrived => (
        l10n.hostStaffHotelArrived,
        CatchIndexRowTone.neutral,
      ),
      TransportTripStatus.cancelled || TransportTripStatus.voided => (
        l10n.hostStaffHotelCancelled,
        CatchIndexRowTone.danger,
      ),
    };
    return CatchSurface(
      key: ValueKey<String>('staff-hotel-trip-${trip.tripId}'),
      child: CatchStack(
        gap: CatchStackGap.none,
        children: [
          CatchIndexRow(
            icon: CatchIcons.route,
            title: trip.plateDisplay,
            subtitle: [?trip.vehicleClassLabel, ?trip.vendorName].join(' · '),
            meta: status,
            metaTone: tone,
            density: CatchIndexRowSize.compact,
            onTap: null,
            action: onArrived == null
                ? null
                : CatchIndexRowAction(
                    label: l10n.hostStaffHotelMarkArrived,
                    onPressed: busy ? null : onArrived,
                  ),
          ),
          for (final name in trip.guestNames)
            CatchIndexRow(
              title: name,
              value: rooms[name],
              density: CatchIndexRowSize.compact,
              onTap: null,
            ),
        ],
      ),
    );
  }
}
