import 'package:catch_dating_app/hosts/events/event_workspace_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The event's views as one segmented control: Overview, Guests, Live and
/// Report.
class HostEventTabBar extends StatelessWidget {
  const HostEventTabBar({
    super.key,
    required this.selected,
    required this.onView,
  });

  final HostEventView selected;
  final ValueChanged<HostEventView> onView;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchPageTabBar<HostEventView>.segmented(
      selected: selected,
      label: l10n.hostEventsViewsLabel,
      onChanged: onView,
      options: [
        for (final view in HostEventView.values)
          CatchOption<HostEventView>(
            value: view,
            label: switch (view) {
              HostEventView.overview => l10n.hostEventsViewOverview,
              HostEventView.guests => l10n.hostEventsViewGuests,
              HostEventView.live => l10n.hostEventsViewLive,
              HostEventView.report => l10n.hostEventsViewReport,
            },
          ),
      ],
    );
  }
}
