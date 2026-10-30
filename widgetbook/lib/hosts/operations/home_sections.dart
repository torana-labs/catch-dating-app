import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_organizer_switcher_sheet.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_view_model.dart';
import 'package:catch_dating_app/hosts/today/presentation/widgets/host_today_overview.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/device/connectivity_service.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'shell_fixture.dart';

@widgetbook.UseCase(
  name: 'Covered by host event section states',
  type: HostEventsOrganizerSection,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
@widgetbook.UseCase(
  name: 'Covered by host event section states',
  type: HostEventsTimelineBody,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
@widgetbook.UseCase(
  name: 'Event section states',
  type: HostEventsOrganizerCard,
  path: '[P1 product surfaces]/Host operations/Sections',
)
Widget hostHomeEventSectionStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'HostEventsClubCard',
    contractId: 'section.host.home_events',
    children: [
      WidgetbookPageStateCard(
        label: 'owned club with upcoming rows',
        child: WidgetbookHostHomeSectionFrame(
          child: HostEventsOrganizerCard(
            organizer: widgetbookOrganizer,
            onEventEntrySelected: (_, _, _) {},
            onManageEvent: (_, _) {},
            now: HostOperationsFixtures.now,
            sessionBoundary: HostOperationsFixtures.now,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'past events grouped into divided month fields',
        child: WidgetbookHostHomeSectionFrame(
          organizerEventStreams: {
            widgetbookOrganizer.id: Stream<List<Event>>.value([
              HostOperationsFixtures.event(
                id: 'design-host-past-june',
                organizer: widgetbookOrganizer,
                start: DateTime(2026, 6, 14, 9),
                bookedCount: 8,
              ),
              HostOperationsFixtures.event(
                id: 'design-host-past-may',
                organizer: widgetbookOrganizer,
                start: DateTime(2026, 5, 27, 18, 30),
                bookedCount: 2,
              ),
            ]),
          },
          child: HostEventsOrganizerCard(
            organizer: widgetbookOrganizer,
            onEventEntrySelected: (_, _, _) {},
            onManageEvent: (_, _) {},
            now: HostOperationsFixtures.now,
            sessionBoundary: HostOperationsFixtures.now,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'events loading',
        child: WidgetbookHostHomeSectionFrame(
          organizerEventStreams: {
            widgetbookOrganizer.id:
                HostOperationsFixtures.loadingStream<List<Event>>(),
          },
          child: HostEventsOrganizerCard(
            organizer: widgetbookOrganizer,
            onEventEntrySelected: (_, _, _) {},
            onManageEvent: (_, _) {},
            now: HostOperationsFixtures.now,
            sessionBoundary: HostOperationsFixtures.now,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'events error',
        child: WidgetbookHostHomeSectionFrame(
          organizerEventStreams: {
            widgetbookOrganizer.id:
                HostOperationsFixtures.errorStream<List<Event>>(
                  'Upcoming events failed',
                ),
          },
          child: HostEventsOrganizerCard(
            organizer: widgetbookOrganizer,
            onEventEntrySelected: (_, _, _) {},
            onManageEvent: (_, _) {},
            now: HostOperationsFixtures.now,
            sessionBoundary: HostOperationsFixtures.now,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'events offline',
        child: WidgetbookHostHomeSectionFrame(
          organizerEventStreams: {
            widgetbookOrganizer.id: Stream<List<Event>>.error(
              obviousOfflineException(),
              StackTrace.empty,
            ),
          },
          child: HostEventsOrganizerCard(
            organizer: widgetbookOrganizer,
            onEventEntrySelected: (_, _, _) {},
            onManageEvent: (_, _) {},
            now: HostOperationsFixtures.now,
            sessionBoundary: HostOperationsFixtures.now,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty events',
        child: WidgetbookHostHomeSectionFrame(
          organizerEventStreams: {
            widgetbookOrganizer.id: Stream<List<Event>>.value(const []),
          },
          child: HostEventsOrganizerCard(
            organizer: widgetbookOrganizer,
            onEventEntrySelected: (_, _, _) {},
            onManageEvent: (_, _) {},
            now: HostOperationsFixtures.now,
            sessionBoundary: HostOperationsFixtures.now,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'cancelled events hidden',
        child: WidgetbookHostHomeSectionFrame(
          organizerEventStreams: {
            widgetbookOrganizer.id: Stream<List<Event>>.value([
              HostOperationsFixtures.cancelledEvent,
            ]),
          },
          child: HostEventsOrganizerCard(
            organizer: widgetbookOrganizer,
            onEventEntrySelected: (_, _, _) {},
            onManageEvent: (_, _) {},
            now: HostOperationsFixtures.now,
            sessionBoundary: HostOperationsFixtures.now,
          ),
        ),
      ),
    ],
  );
}

Widget _hostHomeExactCatalog(BuildContext context, String focus) {
  return WidgetbookPageCatalogFrame(
    title: focus,
    contractId: 'component.host.home.${widgetbookHostComponentSlug(focus)}',
    children: [
      WidgetbookPageStateCard(
        label: 'exact component',
        child: WidgetbookHostHomeSectionFrame(
          child: _hostHomePreviewFor(context, focus),
        ),
      ),
    ],
  );
}

Widget _hostHomePreviewFor(BuildContext context, String focus) {
  final organizer = HostOperationsFixtures.primaryOrganizer;
  final event = HostOperationsFixtures.upcomingEvent;
  final now = event.startTime.subtract(const Duration(hours: 2));
  final state = buildHostTodayState(
    CatchAsyncState<HostTodayFeedData>.data(
      HostTodayFeedData(
        activeEvents: [event, HostOperationsFixtures.privateEvent],
        pastEvents: const [],
        attentionItems: widgetbookTodayAttentionItems([event], now),
      ),
    ),
    now: now,
    l10n: context.l10n,
  );
  final tasks = state.attentionItems;
  return switch (focus) {
    'CatchEmptyState' => CatchEmptyState(
      title: 'No clubs yet',
      message: 'Create a club to start hosting events.',
      padding: EdgeInsets.zero,
      actions: [
        CatchButton(
          label: 'Create club',
          leading: Icon(CatchIcons.add, size: CatchIconSize.md),
          onPressed: () {},
        ),
      ],
    ),
    'HostOrganizerAvatar' => HostOrganizerAvatar(
      organizer: organizer.copyWith(
        profileImageUrl: 'assets/fixtures/club_hero_portrait.jpg',
      ),
      size: CatchLayout.appShellNavigationIdentityExtent,
      selected: true,
    ),
    'HostTodayOverview' => HostTodayOverview(
      state: state,
      now: now,
      onRetry: () {},
      onOpenEvent: (_) {},
      onOpenAttention: (_) {},
      onViewEvents: () {},
      onStartRehearsal: () {},
    ),
    'HostTodayEventSection' => HostTodayEventSection(
      event: event,
      now: HostOperationsFixtures.now,
      taskCount: tasks.length,
      onPressed: () {},
    ),
    'HostTodayEventMetricTile' => const HostTodayEventMetricTile(
      value: '10',
      label: 'Going',
    ),
    _ => Text('No exact preview registered for $focus.'),
  };
}

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: CatchEmptyState,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictCatchEmptyStateCatalogStates(BuildContext context) =>
    _hostHomeExactCatalog(context, 'CatchEmptyState');

@widgetbook.UseCase(
  name: 'Exact catalog',
  type: HostEventsTimelineBody,
  path: '[P1 product surfaces]/Host operations/Strict coverage',
)
Widget hostStrictHostEventsTimelinePageCatalogStates(BuildContext context) =>
    hostHomeEventSectionStates(context);
