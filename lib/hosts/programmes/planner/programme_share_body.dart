import 'package:catch_dating_app/hosts/programmes/planner/programme_reports_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The counts-only view for the family in board order: View only, the
/// spotlight with when it was counted, guests and households, who is
/// coming to each function, heads for the caterer, the replies still to
/// come, and the hotels. No names.
class HostProgrammeShareBody extends StatelessWidget {
  const HostProgrammeShareBody({
    super.key,
    required this.state,
    required this.onRetry,
  });

  final HostProgrammeShareState state;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final counts = state.counts;
    final access = state.access;
    if (state.status != HostProgrammeStatus.ready ||
        counts == null ||
        access == null) {
      return HostProgrammeStateBody(status: state.status, onRetry: onRetry);
    }
    final functions = counts.functions;
    final waiting = functions.where((f) => f.rsvpPending > 0).toList();
    return CatchPageBody.screen(
      children: [
        CatchStack(
          direction: CatchStackDirection.row,
          justify: CatchStackJustify.between,
          align: CatchStackAlign.center,
          children: [
            CatchText(
              l10n.hostProgrammeShareKicker,
              variant: CatchTextVariant.labelKicker,
              tone: CatchTextTone.secondary,
            ),
            CatchBadge(label: l10n.hostProgrammeShareViewOnly),
          ],
        ),
        CatchSurface(
          block: CatchSurfaceBlock.spotlight,
          color: CatchSurfaceColor.nightsOut,
          child: CatchStack(
            children: [
              CatchText(access.title, variant: CatchTextVariant.displayLg),
              CatchText(
                l10n.hostProgrammeShareUpdated(
                  time: AppTimeFormatters.time(counts.serverTime),
                ),
                variant: CatchTextVariant.bodySmall,
              ),
            ],
          ),
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            CatchMetricTile.stat(
              label: l10n.hostProgrammeStatGuests,
              value: '${counts.guestCount}',
            ),
            CatchMetricTile.stat(
              label: l10n.hostProgrammeStatHouseholds,
              value: '${counts.householdCount}',
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeShareComing,
          children: [
            for (final function in functions)
              CatchIndexRow(
                key: ValueKey<String>(
                  'host-programme-share-${function.functionId}',
                ),
                title: state.functionName(function.functionId),
                subtitle: l10n.hostProgrammeShareComingLine(
                  coming: function.rsvpAttending,
                  invited: function.invitedCount,
                  maybe: function.rsvpMaybe,
                ),
                progress: function.invitedCount == 0
                    ? null
                    : CatchIndexRowProgress(
                        value: function.rsvpAttending,
                        max: function.invitedCount,
                        label: state.functionName(function.functionId),
                      ),
                onTap: null,
              ),
          ],
        ),
        CatchSurface(
          child: CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchText(
                l10n.hostProgrammeShareCaterer,
                variant: CatchTextVariant.titleBar,
              ),
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g6,
                wrap: true,
                children: [
                  for (final function in functions)
                    CatchChip.tag(
                      label: l10n.hostProgrammeShareHeads(
                        function: state.functionName(function.functionId),
                        count: function.expectedHeads,
                      ),
                      size: CatchChipSize.sm,
                    ),
                ],
              ),
            ],
          ),
        ),
        CatchSection(
          title: l10n.hostProgrammeShareWaiting,
          empty: l10n.hostProgrammeShareWaitingEmpty,
          children: [
            for (final function in waiting)
              CatchIndexRow(
                key: ValueKey<String>(
                  'host-programme-share-waiting-${function.functionId}',
                ),
                title: state.functionName(function.functionId),
                value: l10n.hostProgrammePeople(count: function.rsvpPending),
                onTap: null,
              ),
          ],
        ),
        if (counts.hotels.isNotEmpty)
          CatchSection(
            title: l10n.hostProgrammeTravelHotels,
            children: [
              for (final hotel in counts.hotels)
                CatchIndexRow(
                  key: ValueKey<String>(
                    'host-programme-share-hotel-${hotel.hotelId}',
                  ),
                  icon: CatchIcons.hotel,
                  title: state.hotelName(hotel.hotelId),
                  value: l10n.hostProgrammeShareArrived(
                    arrived: hotel.arrivedGuestCount,
                    total: hotel.routedGuestCount,
                  ),
                  onTap: null,
                ),
            ],
          ),
      ],
    );
  }
}
