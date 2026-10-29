import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_choice_tile.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum EventRehearsalStartChoice { upcomingEvent, custom }

/// Chooses the rehearsal starting point before the configurable setup screen.
class EventRehearsalStartSheet extends StatelessWidget {
  const EventRehearsalStartSheet({super.key, required this.event});

  final Event event;

  @override
  Widget build(BuildContext context) => CatchSheet.standard(
    key: const ValueKey<String>('event-rehearsal-start-sheet'),
    title: context.l10n.hostRehearsalStartTitle,
    subtitle: context.l10n.hostRehearsalStartSubtitle,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        EventRehearsalChoiceTile(
          key: const ValueKey<String>('rehearsal-start-upcoming'),
          title: context.l10n.hostRehearsalStartUpcoming(title: event.title),
          description: context.l10n.hostRehearsalStartUpcomingDescription(
            count: event.signedUpCount,
          ),
          icon: CatchIcons.date,
          onTap: () => Navigator.of(
            context,
          ).pop(EventRehearsalStartChoice.upcomingEvent),
        ),
        const CatchDivider.section(),
        EventRehearsalChoiceTile(
          key: const ValueKey<String>('rehearsal-start-custom'),
          title: context.l10n.hostRehearsalStartCustom,
          description: context.l10n.hostRehearsalStartCustomDescription,
          icon: CatchIcons.filters,
          onTap: () =>
              Navigator.of(context).pop(EventRehearsalStartChoice.custom),
        ),
        gapH4,
      ],
    ),
  );
}
