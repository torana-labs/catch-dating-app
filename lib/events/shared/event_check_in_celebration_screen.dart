import 'package:catch_dating_app/core/celebration/celebration_effects_controller.dart';
import 'package:catch_dating_app/core/celebration/celebration_screen.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventCheckInCelebrationScreen extends StatelessWidget {
  const EventCheckInCelebrationScreen({
    super.key,
    required this.event,
    required this.onViewEvent,
    required this.onBackHome,
  });

  final Event event;
  final VoidCallback onViewEvent;
  final VoidCallback onBackHome;

  @override
  Widget build(BuildContext context) {
    return CelebrationScreen(
      kind: CelebrationMomentKind.eventCheckedIn,
      eyebrow: context.l10n.eventsEventCheckInCelebrationScreenEyebrowCheckedIn,
      title: context.l10n.eventsEventCheckInCelebrationScreenTitleCheckedIn,
      message:
          context.l10n.eventsEventCheckInCelebrationScreenMessageYouReOnThe,
      icon: CatchIcons.location,
      details: [
        CelebrationDetail(
          icon: CatchIcons.activity,
          label: context.l10n.eventsEventCheckInCelebrationScreenLabelEvent,
          value: event.title,
        ),
        CelebrationDetail(
          icon: CatchIcons.time,
          label: context.l10n.eventsEventCheckInCelebrationScreenLabelStarts,
          value: event.timeRangeLabel,
        ),
        CelebrationDetail(
          icon: CatchIcons.location,
          label: context.l10n.eventsEventCheckInCelebrationScreenLabelMeetPoint,
          value: event.locationName,
        ),
      ],
      primaryAction: CelebrationAction(
        label: context.l10n.eventsEventCheckInCelebrationScreenLabelViewEvent,
        onPressed: onViewEvent,
        icon: Icon(CatchIcons.activity),
      ),
      secondaryAction: CelebrationAction(
        label: context.l10n.eventsEventCheckInCelebrationScreenLabelBackToHome,
        onPressed: onBackHome,
      ),
      onClose: onBackHome,
    );
  }
}
