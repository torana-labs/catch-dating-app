import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessHostTabBar extends StatelessWidget {
  const EventSuccessHostTabBar({
    super.key,
    required this.selectedTab,
    required this.onChanged,
  });

  final EventSuccessHostTab selectedTab;
  final ValueChanged<EventSuccessHostTab> onChanged;

  @override
  Widget build(BuildContext context) {
    return CatchPageTabBar<EventSuccessHostTab>(
      options: [
        for (final tab in EventSuccessHostTab.values)
          CatchOption(value: tab, label: tab.label(context.l10n)),
      ],
      selected: selectedTab,
      onChanged: onChanged,
    );
  }
}

extension on EventSuccessHostTab {
  String label(AppLocalizations l10n) {
    return switch (this) {
      EventSuccessHostTab.setup =>
        l10n.eventSuccessEventSuccessHostSharedLabelSetup,
      EventSuccessHostTab.live =>
        l10n.eventSuccessEventSuccessHostSharedLabelLive,
      EventSuccessHostTab.report =>
        l10n.eventSuccessEventSuccessHostSharedLabelReport,
    };
  }
}
