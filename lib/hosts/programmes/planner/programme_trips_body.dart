import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_reports_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_view.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The ledger filters: everything, the trips that need a look, or one
/// vendor's (by vendor name).
@immutable
class HostProgrammeTripFilter {
  const HostProgrammeTripFilter.all() : vendor = null, needsLook = false;
  const HostProgrammeTripFilter.needsLook() : vendor = null, needsLook = true;
  const HostProgrammeTripFilter.vendor(String this.vendor) : needsLook = false;

  final String? vendor;
  final bool needsLook;

  bool matches(ProgramTripSummary trip, DateTime now) {
    if (needsLook) return programmeTripNeedsLook(trip, now);
    if (vendor != null) return trip.vendorName == vendor;
    return true;
  }

  @override
  bool operator ==(Object other) =>
      other is HostProgrammeTripFilter &&
      other.vendor == vendor &&
      other.needsLook == needsLook;

  @override
  int get hashCode => Object.hash(vendor, needsLook);
}

/// A trip that was voided or cancelled, or is still on the road after its
/// expected arrival.
bool programmeTripNeedsLook(ProgramTripSummary trip, DateTime now) =>
    trip.status == TransportTripStatus.voided ||
    trip.status == TransportTripStatus.cancelled ||
    (trip.status == TransportTripStatus.enRoute &&
        (trip.estimatedArriveAt?.isBefore(now) ?? false));

/// The trip ledger in board order: four numbers, the filters with Export
/// for the vendors, and the trips as a table.
class HostProgrammeTripsBody extends StatelessWidget {
  const HostProgrammeTripsBody({
    super.key,
    required this.state,
    required this.now,
    required this.filter,
    required this.onFilter,
    required this.onExport,
    required this.onOpenTrip,
    required this.onRetry,
    this.exporting = false,
  });

  final HostProgrammeReport<ProgramTripList> state;
  final DateTime now;
  final HostProgrammeTripFilter filter;
  final ValueChanged<HostProgrammeTripFilter> onFilter;
  final VoidCallback onExport;
  final ValueChanged<ProgramTripSummary> onOpenTrip;
  final VoidCallback onRetry;
  final bool exporting;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final list = state.value;
    if (state.status != HostProgrammeStatus.ready || list == null) {
      return HostProgrammeStateView(status: state.status, onRetry: onRetry);
    }
    final trips = list.trips;
    final vendors = <String, int>{};
    for (final trip in trips) {
      final name = trip.vendorName;
      if (name != null) vendors[name] = (vendors[name] ?? 0) + 1;
    }
    final needsLook = trips.where((t) => programmeTripNeedsLook(t, now)).length;
    final people = trips
        .where((t) => t.status != TransportTripStatus.voided)
        .fold(0, (sum, t) => sum + t.passengerCount);
    final shown = trips.where((t) => filter.matches(t, now)).toList();
    final filters = [
      (
        const HostProgrammeTripFilter.all(),
        l10n.hostProgrammeGuestsAll,
        trips.length,
      ),
      (
        const HostProgrammeTripFilter.needsLook(),
        l10n.hostProgrammeTripsNeedsLook,
        needsLook,
      ),
      for (final entry in vendors.entries)
        (HostProgrammeTripFilter.vendor(entry.key), entry.key, entry.value),
    ];
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostProgrammeTripsTrips,
              value: '${trips.length}',
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammeTripsPeople,
              value: '$people',
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammeTripsNeedsLook,
              value: '$needsLook',
              note: needsLook == 0
                  ? null
                  : l10n.hostProgrammeTripsNeedsLookNote,
              noteTone: CatchMetricTileTone.warning,
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammeTripsVendors,
              value: '${vendors.length}',
            ),
          ],
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          justify: CatchStackJustify.between,
          align: CatchStackAlign.center,
          wrap: true,
          children: [
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g6,
              wrap: true,
              children: [
                for (final (value, label, count) in filters)
                  CatchChip.choice(
                    label: label,
                    count: count,
                    selected: filter == value,
                    mode: CatchChipMode.single,
                    size: CatchChipSize.sm,
                    onPressed: () => onFilter(value),
                  ),
              ],
            ),
            CatchButton(
              key: const ValueKey<String>('host-programme-trips-export'),
              label: l10n.hostProgrammeTripsExport,
              variant: CatchButtonVariant.secondary,
              size: CatchButtonSize.md,
              leading: CatchIcon(CatchIcons.download),
              status: exporting
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: exporting || trips.isEmpty ? null : onExport,
            ),
          ],
        ),
        CatchSurface(
          block: CatchSurfaceBlock.floating,
          child: CatchTable(
            label: l10n.hostProgrammeTravelTrips,
            columns: [
              CatchTableColumn(label: l10n.hostProgrammeTripsColumnTrip),
              CatchTableColumn(label: l10n.hostProgrammeTripsColumnLeft),
              CatchTableColumn(
                label: l10n.hostProgrammeTripsColumnVendor,
                variant: CatchTableColumnVariant.title,
                flex: 2,
              ),
              CatchTableColumn(
                label: l10n.hostProgrammeTripsColumnRoute,
                flex: 2,
              ),
              CatchTableColumn(
                label: l10n.hostProgrammeTripsColumnPeople,
                variant: CatchTableColumnVariant.number,
              ),
              CatchTableColumn(
                label: l10n.hostProgrammeTripsColumnState,
                variant: CatchTableColumnVariant.badge,
              ),
            ],
            children: [
              for (final trip in shown)
                CatchTableRow.cells(
                  key: ValueKey<String>('host-programme-trip-${trip.tripId}'),
                  onTap: () => onOpenTrip(trip),
                  cells: [
                    CatchTableCell.text(
                      trip.tripId.length > 8
                          ? trip.tripId.substring(0, 8)
                          : trip.tripId,
                    ),
                    CatchTableCell.text(
                      AppTimeFormatters.time(trip.departedAt),
                      tone: CatchTableCellTone.secondary,
                    ),
                    CatchTableCell.title(
                      trip.vendorName ?? l10n.hostProgrammeTripsNoVendor,
                      subtitle: trip.plateDisplay,
                    ),
                    CatchTableCell.text(trip.destinationLabel),
                    CatchTableCell.number(trip.passengerCount),
                    CatchTableCell.badge(programmeTripBadge(l10n, trip, now)),
                  ],
                ),
            ],
          ),
        ),
        if (shown.isEmpty)
          CatchText(
            l10n.hostProgrammeTripsEmpty,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
      ],
    );
  }
}

/// A trip's state as a badge: On the road, Arrived, Late, Voided or
/// Cancelled.
CatchBadge programmeTripBadge(
  AppLocalizations l10n,
  ProgramTripSummary trip,
  DateTime now,
) => switch (trip.status) {
  TransportTripStatus.arrived => CatchBadge(
    label: l10n.hostProgrammeTripsArrived,
    tone: CatchBadgeTone.success,
  ),
  TransportTripStatus.voided => CatchBadge(
    label: l10n.hostProgrammeTripsVoided,
    tone: CatchBadgeTone.warning,
  ),
  TransportTripStatus.cancelled => CatchBadge(
    label: l10n.hostProgrammeTripsCancelled,
    tone: CatchBadgeTone.warning,
  ),
  TransportTripStatus.enRoute when programmeTripNeedsLook(trip, now) =>
    CatchBadge(
      label: l10n.hostProgrammeTripsLate,
      tone: CatchBadgeTone.warning,
    ),
  TransportTripStatus.enRoute => CatchBadge(
    label: l10n.hostProgrammeTripsOnTheRoad,
    tone: CatchBadgeTone.info,
  ),
};
