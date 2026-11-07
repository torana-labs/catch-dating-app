import 'package:catch_dating_app/hosts/live/live_body.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// The room on a tablet: who is seated, who is still on the way, who
/// arrived late without a place, and each team or table with its places
/// taken, in two columns.
class HostLiveRoomBody extends StatelessWidget {
  const HostLiveRoomBody({
    super.key,
    required this.state,
    required this.onView,
  });

  final HostLiveState state;
  final ValueChanged<HostLiveView> onView;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final numbers = NumberFormat.decimalPattern(
      Localizations.localeOf(context).toLanguageTag(),
    );
    final seated = state.units.fold<int>(0, (sum, unit) => sum + unit.seated);
    final coming = state.booked - state.checkedIn;
    final waiting = state.needs.whereType<HostLiveArrivalNeed>().length;
    return CatchPageBody(
      child: CatchStack(
        gap: CatchStackGap.section,
        children: [
          HostLiveViews(
            selected: HostLiveView.room,
            room: true,
            onView: onView,
          ),
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              CatchMetricTile.stat(
                label: l10n.hostLiveRoomSeated,
                value: numbers.format(seated),
                mode: CatchMetricTileMode.plain,
              ),
              CatchMetricTile.stat(
                label: l10n.hostLiveRoomComing,
                value: numbers.format(coming < 0 ? 0 : coming),
                mode: CatchMetricTileMode.plain,
              ),
              CatchMetricTile.stat(
                label: l10n.hostLiveRoomWaiting,
                value: numbers.format(waiting),
                mode: CatchMetricTileMode.plain,
              ),
            ],
          ),
          CatchSection(
            title: l10n.hostLiveRoomTitle,
            columns: 2,
            empty: l10n.hostLiveRoomEmpty,
            children: [
              for (final unit in state.units)
                CatchIndexRow(
                  key: ValueKey<String>('host-live-room-${unit.label}'),
                  title: unit.label,
                  onTap: null,
                  density: CatchIndexRowSize.compact,
                  value: switch (unit.size) {
                    final size? => l10n.hostLiveRoomPlaces(
                      seated: unit.seated,
                      size: size,
                    ),
                    null => numbers.format(unit.seated),
                  },
                ),
            ],
          ),
        ],
      ),
    );
  }
}
