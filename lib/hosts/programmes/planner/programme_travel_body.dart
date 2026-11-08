import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_travel_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_view.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_views.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Where a Travel row or link leads.
enum HostProgrammeTravelLink { trips, rooms, addPickup, addHotel, addVendor }

/// Travel in board order: three numbers, Needs you, the busiest day as a
/// chart, arrivals by day, pickup points, hotels, cars and trips, and Open
/// the live airport desk.
class HostProgrammeTravelBody extends StatelessWidget {
  const HostProgrammeTravelBody({
    super.key,
    required this.state,
    required this.onView,
    required this.onLink,
    required this.onOpenPickup,
    required this.onOpenHotel,
    required this.onOpenDesk,
    required this.onRetry,
  });

  final HostProgrammeTravelState state;
  final ValueChanged<HostProgrammeView> onView;
  final ValueChanged<HostProgrammeTravelLink> onLink;
  final ValueChanged<ProgramStation> onOpenPickup;
  final ValueChanged<ProgramHotel> onOpenHotel;

  /// Null when there is no pickup point yet.
  final VoidCallback? onOpenDesk;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (state.status != HostProgrammeStatus.ready) {
      return HostProgrammeStateView(status: state.status, onRetry: onRetry);
    }
    final detail = state.programme.detail!;
    final busiest = state.busiest;
    final needsYou = state.needsYou;
    final groups = state.plan?.groups ?? const <TransportGroupSuggestion>[];
    final trips = state.trips?.trips ?? const <ProgramTripSummary>[];
    return CatchPageBody.screen(
      children: [
        HostProgrammeViews(selected: HostProgrammeView.travel, onView: onView),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostProgrammeTravelFlying,
              value: '${state.flyingIn}',
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammeTravelWithFlight,
              value: '${state.withFlight}',
              mode: CatchMetricTileMode.plain,
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammeTravelMissing,
              value: '${state.missing}',
              mode: CatchMetricTileMode.plain,
              noteTone: CatchMetricTileTone.warning,
            ),
          ],
        ),
        if (needsYou.isNotEmpty)
          CatchSection(
            title: l10n.hostProgrammeTravelNeedsYou,
            children: [
              for (final row in needsYou)
                CatchIndexRow(
                  key: ValueKey<String>(
                    'host-programme-travel-need-${row.legId}',
                  ),
                  marker: CatchIndexRowTone.warning,
                  title: row.partyTitle,
                  subtitle: _needLine(l10n, row),
                  onTap: null,
                ),
            ],
          ),
        if (busiest != null)
          CatchSection(
            title: l10n.hostProgrammeTravelBusiest(
              day: AppTimeFormatters.weekdayDayMonth(busiest.day),
            ),
            note: l10n.hostProgrammePeople(count: busiest.people),
            dividers: CatchSectionPlacement.none,
            children: [
              CatchBarIndicator.chart(
                label: l10n.hostProgrammeTravelChart(
                  day: AppTimeFormatters.weekdayDayMonth(busiest.day),
                ),
                bars: [
                  for (final (hour, people) in state.windows(busiest.day))
                    CatchBarIndicatorBar(
                      label: AppTimeFormatters.time(
                        DateTime(
                          busiest.day.year,
                          busiest.day.month,
                          busiest.day.day,
                          hour,
                        ),
                      ),
                      value: people,
                    ),
                ],
              ),
            ],
          ),
        CatchSection(
          title: l10n.hostProgrammeTravelByDay,
          empty: l10n.hostProgrammeTravelByDayEmpty,
          children: [
            for (final day in state.days)
              CatchIndexRow(
                key: ValueKey<String>(
                  'host-programme-travel-day-${day.day.toIso8601String()}',
                ),
                date: CatchIndexRowDate(
                  day: AppTimeFormatters.shortWeekday(day.day),
                  date: '${day.day.day}',
                ),
                title: AppTimeFormatters.weekdayDayMonth(day.day),
                badge: day == busiest
                    ? CatchIndexRowBadge(
                        label: l10n.hostProgrammeTravelBusiestBadge,
                        tone: CatchBadgeTone.warning,
                      )
                    : null,
                value: l10n.hostProgrammePeople(count: day.people),
                onTap: null,
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeTravelPickups,
          action: CatchSectionAction(
            label: l10n.hostProgrammeAdd,
            onPressed: () => onLink(HostProgrammeTravelLink.addPickup),
          ),
          empty: l10n.hostProgrammeTravelPickupsEmpty,
          children: [
            for (final point in detail.pickupPoints)
              CatchIndexRow(
                key: ValueKey<String>(
                  'host-programme-pickup-${point.pickupPointId}',
                ),
                icon: CatchIcons.arrivals,
                title: point.label,
                subtitle: point.meetingZone,
                chevron: true,
                onTap: () => onOpenPickup(point),
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeTravelHotels,
          action: CatchSectionAction(
            label: l10n.hostProgrammeAdd,
            onPressed: () => onLink(HostProgrammeTravelLink.addHotel),
          ),
          empty: l10n.hostProgrammeTravelHotelsEmpty,
          children: [
            for (final hotel in detail.hotels)
              CatchIndexRow(
                key: ValueKey<String>('host-programme-hotel-${hotel.hotelId}'),
                icon: CatchIcons.hotel,
                title: hotel.name,
                subtitle: hotel.address,
                chevron: true,
                onTap: () => onOpenHotel(hotel),
              ),
            if (detail.hotels.isNotEmpty)
              CatchIndexRow(
                key: const ValueKey<String>('host-programme-rooms'),
                title: l10n.hostProgrammeTravelRooms,
                subtitle: l10n.hostProgrammeTravelRoomsBody,
                chevron: true,
                onTap: () => onLink(HostProgrammeTravelLink.rooms),
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeTravelCars,
          action: CatchSectionAction(
            label: l10n.hostProgrammeTravelAddVendor,
            onPressed: () => onLink(HostProgrammeTravelLink.addVendor),
          ),
          empty: l10n.hostProgrammeTravelCarsEmpty,
          children: [
            for (final group in groups)
              CatchIndexRow(
                key: ValueKey<String>(
                  'host-programme-car-${group.legIds.join('-')}',
                ),
                icon: CatchIcons.taxi,
                title: group.vehicleClassLabel,
                subtitle: l10n.hostProgrammeTravelCarLine(
                  hotel: group.destinationLabel,
                  time: AppTimeFormatters.time(group.earliestCurbAt),
                ),
                value: l10n.hostProgrammePeople(count: group.passengers),
                onTap: null,
              ),
          ],
        ),
        CatchSection(
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('host-programme-trips'),
              icon: CatchIcons.route,
              title: l10n.hostProgrammeTravelTrips,
              subtitle: l10n.hostProgrammeTravelTripsBody(count: trips.length),
              chevron: true,
              onTap: () => onLink(HostProgrammeTravelLink.trips),
            ),
          ],
        ),
        CatchButton(
          key: const ValueKey<String>('host-programme-travel-desk'),
          label: l10n.hostProgrammeTravelDesk,
          variant: CatchButtonVariant.secondary,
          leading: CatchIcon(CatchIcons.live),
          fullWidth: true,
          onPressed: onOpenDesk,
        ),
      ],
    );
  }
}

String _needLine(AppLocalizations l10n, ArrivalsRosterRow row) {
  final flight = row.flightNumber ?? l10n.hostProgrammeTravelNoFlight;
  return switch (row.unavailableReason) {
    TimingUnavailableReason.diverted => l10n.hostProgrammeTravelDiverted(
      flight: flight,
    ),
    TimingUnavailableReason.cancelled => l10n.hostProgrammeTravelCancelled(
      flight: flight,
    ),
    TimingUnavailableReason.missingTiming ||
    null => l10n.hostProgrammeTravelNoTime(flight: flight),
  };
}
