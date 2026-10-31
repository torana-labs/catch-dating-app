import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_configuration.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_copy.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/host_event_rehearsal_start_screen.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_choice_tile.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_customise_sheet.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_entry_page_body.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_entry_scaffold.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_source_sheet.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_start_sheet.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

@widgetbook.UseCase(
  name: 'Upcoming event and optional settings',
  type: EventRehearsalEntryScaffold,
  path: '[P1 product surfaces]/Dress rehearsal',
)
Widget rehearsalUpcomingEntry(BuildContext context) =>
    const _EntryPreview(sample: false);

@widgetbook.UseCase(
  name: 'Organizer defaults and optional settings',
  type: EventRehearsalEntryScaffold,
  path: '[P1 product surfaces]/Dress rehearsal',
)
Widget rehearsalSampleEntry(BuildContext context) =>
    const _EntryPreview(sample: true);

@widgetbook.UseCase(
  name: 'Starting point sheet',
  type: EventRehearsalStartSheet,
  path: '[P1 product surfaces]/Dress rehearsal',
)
Widget rehearsalStartSheet(BuildContext context) => EventRehearsalStartSheet(
  event: Event(
    id: 'preview-event',
    organizerId: 'preview-organizer',
    name: 'Wednesday Trivia Night',
    startTime: DateTime(2026, 9, 9, 19),
    endTime: DateTime(2026, 9, 9, 21),
    meetingPoint: 'The Courtyard',
    eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.pubQuiz),
    distanceKm: 0,
    pace: PaceLevel.easy,
    capacityLimit: 30,
    bookedCount: 24,
    description: '',
    priceInPaise: 0,
  ),
);

class _EntryPreview extends StatefulWidget {
  const _EntryPreview({required this.sample});
  final bool sample;
  @override
  State<_EntryPreview> createState() => _EntryPreviewState();
}

class _EntryPreviewState extends State<_EntryPreview> {
  static const defaults = OrganizerHostDefaults(
    primaryActivityKind: ActivityKind.socialRun,
    supportedActivityKinds: [ActivityKind.socialRun, ActivityKind.singlesMixer],
  );
  late final event = Event(
    id: 'preview-event',
    organizerId: 'preview-organizer',
    name: 'Saturday singles mixer',
    startTime: DateTime(2026, 9, 5, 19),
    endTime: DateTime(2026, 9, 5, 20, 30),
    meetingPoint: 'The Courtyard',
    eventFormat: EventFormatSnapshot.fromActivityKind(
      ActivityKind.singlesMixer,
    ),
    distanceKm: 0,
    pace: PaceLevel.easy,
    capacityLimit: 30,
    bookedCount: 24,
    description: '',
    priceInPaise: 0,
  );
  late EventRehearsalConfiguration configuration =
      EventRehearsalConfiguration.defaults(
        organizerDefaults: defaults,
        event: widget.sample ? null : event,
      );

  @override
  Widget build(BuildContext context) => EventRehearsalEntryScaffold(
    configuration: configuration,
    onStart: () {},
    onCustomise: () async {
      final next = await showCatchBottomSheet<EventRehearsalConfiguration>(
        context: context,
        builder: (_) =>
            EventRehearsalCustomiseSheet(configuration: configuration),
      );
      if (next != null && mounted) setState(() => configuration = next);
    },
    onChooseSource: () async {
      final next = await showCatchBottomSheet<EventRehearsalSourceChoice>(
        context: context,
        builder: (_) => EventRehearsalSourceSheet(
          events: [event],
          configuration: configuration,
        ),
      );
      if (next != null && mounted) {
        setState(
          () => configuration = EventRehearsalConfiguration.defaults(
            organizerDefaults: defaults,
            event: next.eventId == null ? null : event,
            activityKind: next.activityKind,
            scenario: configuration.scenario,
          ),
        );
      }
    },
    onChooseScenario: () async {
      final next = await showCatchSelectionSheet<EventRehearsalScenario>(
        context: context,
        title: context.l10n.hostEventRehearsalScenario,
        value: configuration.scenario,
        items: [
          for (final value in EventRehearsalScenario.values)
            CatchSelectionMenuItem(
              value: value,
              label: eventRehearsalScenarioTitle(context.l10n, value),
              sublabel: eventRehearsalScenarioBody(context.l10n, value),
            ),
        ],
      );
      if (next != null && mounted) {
        setState(() => configuration = configuration.changeScenario(next));
      }
    },
  );
}

@widgetbook.UseCase(
  name: 'Loading source defaults',
  type: EventRehearsalEntryStateScaffold,
  path: '[P1 product surfaces]/Dress rehearsal',
)
Widget rehearsalLoadingEntry(BuildContext context) =>
    const EventRehearsalEntryStateScaffold(child: CatchLoadingIndicator());

@widgetbook.UseCase(
  name: 'Configuration sheet',
  type: EventRehearsalCustomiseSheet,
  path: '[P1 product surfaces]/Dress rehearsal',
)
Widget rehearsalCustomisePreview(BuildContext context) =>
    _rehearsalEditorLauncher(context);

@widgetbook.UseCase(
  name: 'Event detail inputs in configuration',
  type: EventRehearsalConfigInput,
  path: '[P1 product surfaces]/Dress rehearsal',
)
Widget rehearsalConfigInputPreview(BuildContext context) =>
    _rehearsalEditorLauncher(context);

Widget _rehearsalEditorLauncher(BuildContext context) => Scaffold(
  body: EventRehearsalChoiceTile(
    title: context.l10n.hostRehearsalCustomise,
    description: context.l10n.hostRehearsalCustomiseSummary,
    onTap: () => showCatchBottomSheet<EventRehearsalConfiguration>(
      context: context,
      builder: (_) => EventRehearsalCustomiseSheet(
        configuration: EventRehearsalConfiguration.defaults(
          organizerDefaults: const OrganizerHostDefaults(),
        ),
      ),
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Wrapping choice explanation',
  type: EventRehearsalChoiceTile,
  path: '[P1 product surfaces]/Dress rehearsal',
)
Widget rehearsalChoicePreview(BuildContext context) =>
    _rehearsalEditorLauncher(context);

@widgetbook.UseCase(
  name: 'Content with organizer defaults',
  type: EventRehearsalEntryPageBody,
  path: '[P1 product surfaces]/Dress rehearsal',
)
Widget rehearsalContentPreview(BuildContext context) =>
    const _EntryPreview(sample: true);

@widgetbook.UseCase(
  name: 'Source and event type picker',
  type: EventRehearsalSourceSheet,
  path: '[P1 product surfaces]/Dress rehearsal',
)
Widget rehearsalSourcePreview(BuildContext context) => Scaffold(
  body: EventRehearsalChoiceTile(
    title: context.l10n.hostRehearsalSampleTitle(activity: 'Social run'),
    description: context.l10n.hostRehearsalSampleDescription,
    onTap: () => showCatchBottomSheet<EventRehearsalSourceChoice>(
      context: context,
      builder: (_) => EventRehearsalSourceSheet(
        events: const [],
        configuration: EventRehearsalConfiguration.defaults(
          organizerDefaults: _EntryPreviewState.defaults,
        ),
      ),
    ),
  ),
);
