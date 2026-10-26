import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessLiveWorkspaceTabBar extends StatelessWidget {
  const EventSuccessLiveWorkspaceTabBar({
    super.key,
    required this.selected,
    required this.onChanged,
    this.guestsSemanticLabel,
  });

  final EventSuccessLiveWorkspace selected;
  final ValueChanged<EventSuccessLiveWorkspace> onChanged;
  final String? guestsSemanticLabel;

  @override
  Widget build(BuildContext context) {
    return CatchPageTabBar<EventSuccessLiveWorkspace>(
      options: [
        CatchOption(
          value: EventSuccessLiveWorkspace.now,
          label: context.l10n.eventSuccessLiveWorkspaceNow,
          icon: CatchIcons.time,
        ),
        CatchOption(
          value: EventSuccessLiveWorkspace.guests,
          label: context.l10n.eventSuccessLiveWorkspaceGuests,
          icon: CatchIcons.people,
          semanticLabel: guestsSemanticLabel,
        ),
        CatchOption(
          value: EventSuccessLiveWorkspace.room,
          label: context.l10n.eventSuccessLiveWorkspaceRoom,
          icon: CatchIcons.grid,
        ),
      ],
      selected: selected,
      onChanged: onChanged,
      variant: CatchChoiceInputVariant.operational,
    );
  }
}
