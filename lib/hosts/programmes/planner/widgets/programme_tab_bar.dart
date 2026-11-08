import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The programme's views; each one is its own route.
enum HostProgrammeView { schedule, guests, travel, team }

/// Schedule, Guests, Travel and Team as one segmented control.
class HostProgrammeTabBar extends StatelessWidget {
  const HostProgrammeTabBar({
    super.key,
    required this.selected,
    required this.onView,
    this.fill = true,
  });

  final HostProgrammeView selected;
  final ValueChanged<HostProgrammeView> onView;

  /// Stretch across the page; the desktop guest table sits it at its width.
  final bool fill;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchPageTabBar<HostProgrammeView>.segmented(
      selected: selected,
      label: l10n.hostProgrammeViewsLabel,
      fill: fill,
      onChanged: onView,
      options: [
        for (final view in HostProgrammeView.values)
          CatchOption<HostProgrammeView>(
            value: view,
            label: switch (view) {
              HostProgrammeView.schedule => l10n.hostProgrammeViewSchedule,
              HostProgrammeView.guests => l10n.hostProgrammeViewGuests,
              HostProgrammeView.travel => l10n.hostProgrammeViewTravel,
              HostProgrammeView.team => l10n.hostProgrammeViewTeam,
            },
          ),
      ],
    );
  }
}
