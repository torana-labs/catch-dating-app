import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_name_lookup.dart';
import 'package:catch_dating_app/design_fixtures/utility_surface_fixtures.dart';
import 'package:catch_dating_app/events/presentation/calendar/calendar_screen.dart';
import 'package:catch_dating_app/events/presentation/calendar/calendar_screen_state.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/contract_preview.dart';
import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

final _calendarJoinedEvents = <Event>[
  _calendarEvent(
    id: 'calendar-joined-tomorrow',
    startTime: widgetbookUtilityCalendarNow.add(
      const Duration(days: 1, hours: 9),
    ),
    meetingPoint: 'Sea Face Social run',
    notes: 'Meet by the Bandra promenade entrance.',
    distanceKm: 5,
    bookedCount: 9,
  ),
  _calendarEvent(
    id: 'calendar-cancelled',
    startTime: widgetbookUtilityCalendarNow.add(
      const Duration(days: 3, hours: 11),
    ),
    meetingPoint: 'Rain check coffee walk',
    notes: 'Cancelled by the host after weather warnings.',
    distanceKm: 3,
    bookedCount: 8,
    status: EventLifecycleStatus.cancelled,
  ),
  _calendarEvent(
    id: 'calendar-past',
    startTime: widgetbookUtilityCalendarNow.subtract(
      const Duration(days: 3, hours: 2),
    ),
    meetingPoint: 'Past Sunday loop',
    notes: 'Completed last weekend.',
    distanceKm: 7,
    bookedCount: 11,
  ),
];

final _calendarSavedEvents = <Event>[
  _calendarEvent(
    id: 'calendar-saved-only',
    startTime: widgetbookUtilityCalendarNow.add(
      const Duration(days: 5, hours: 10),
    ),
    meetingPoint: 'Saved supper club',
    notes: 'Bookmark-only state for the agenda badge.',
    distanceKm: 0,
    bookedCount: 10,
    priceInPaise: 120000,
  ),
];

final _calendarSummary = CalendarEventSummary.from(
  signedUpEvents: _calendarJoinedEvents,
  savedEvents: _calendarSavedEvents,
  now: widgetbookUtilityCalendarNow,
);

const _calendarWeekHeaderPreviewHeight = 92.0;

const _calendarMonthHeaderPreviewHeight = 320.0;

const _calendarOrganizerNames = {'design-club': 'Sea Face Social'};

@widgetbook.UseCase(
  name: 'Screen states',
  type: CalendarScreen,
  path: '[P3 utility surfaces]/Calendar',
)
Widget calendarScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CalendarScreen',
    contractId: 'screen.calendar.home',
    children: [
      WidgetbookPageStateCard(
        label: 'auth loading',
        child: WidgetbookUtilityDeviceFrame(
          child: _CalendarScope(
            uidValue: const AsyncLoading<String?>(),
            child: CalendarScreen(referenceNow: widgetbookUtilityCalendarNow),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'signed out empty',
        child: WidgetbookUtilityDeviceFrame(
          child: _CalendarScope(
            uidValue: const AsyncData<String?>(null),
            child: CalendarScreen(referenceNow: widgetbookUtilityCalendarNow),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'events loading',
        child: WidgetbookUtilityDeviceFrame(
          child: _CalendarScope(
            signedUpEventsValue: const AsyncLoading<List<Event>>(),
            child: CalendarScreen(referenceNow: widgetbookUtilityCalendarNow),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'events error',
        child: WidgetbookUtilityDeviceFrame(
          child: _CalendarScope(
            signedUpEventsValue: AsyncError<List<Event>>(
              StateError('Booked events failed'),
              StackTrace.empty,
            ),
            child: CalendarScreen(referenceNow: widgetbookUtilityCalendarNow),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty planned events',
        child: WidgetbookUtilityDeviceFrame(
          child: _CalendarScope(
            signedUpEventsValue: const AsyncData<List<Event>>([]),
            savedEventsValue: const AsyncData<List<Event>>([]),
            child: CalendarScreen(referenceNow: widgetbookUtilityCalendarNow),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'club names loading',
        child: WidgetbookUtilityDeviceFrame(
          child: _CalendarScope(
            organizerNamesValue: const AsyncLoading<Map<String, String>>(),
            child: CalendarScreen(referenceNow: widgetbookUtilityCalendarNow),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'club names error',
        child: WidgetbookUtilityDeviceFrame(
          child: _CalendarScope(
            organizerNamesValue: AsyncError<Map<String, String>>(
              StateError('Club names failed'),
              StackTrace.empty,
            ),
            child: CalendarScreen(referenceNow: widgetbookUtilityCalendarNow),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'joined saved cancelled',
        child: WidgetbookUtilityDeviceFrame(
          child: _CalendarScope(
            child: CalendarScreen(referenceNow: widgetbookUtilityCalendarNow),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: const TextScaler.linear(2),
            child: _CalendarScope(
              child: CalendarScreen(referenceNow: widgetbookUtilityCalendarNow),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: WidgetbookUtilityDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: _CalendarScope(
              child: CalendarScreen(referenceNow: widgetbookUtilityCalendarNow),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: Theme(
          data: AppTheme.dark,
          child: WidgetbookUtilityDeviceFrame(
            child: _CalendarScope(
              child: CalendarScreen(referenceNow: widgetbookUtilityCalendarNow),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Loading state',
  type: CalendarLoadingScreen,
  path: '[P3 utility surfaces]/Calendar/Components',
)
Widget calendarLoadingScreenStates(BuildContext context) {
  return const WidgetbookUtilityDeviceFrame(
    child: Scaffold(body: CalendarLoadingScreen()),
  );
}

@widgetbook.UseCase(
  name: 'Agenda section states',
  type: CalendarAgendaSliverSection,
  path: '[P3 utility surfaces]/Calendar/Components',
)
Widget calendarAgendaSliverSectionStates(BuildContext context) {
  final readyState = CalendarAgendaSectionState.from(
    summary: _calendarSummary,
    organizerNames: const CalendarOrganizerNameLookupState.ready(
      _calendarOrganizerNames,
    ),
  );
  final emptyState = CalendarAgendaSectionState.from(
    summary: CalendarEventSummary.from(
      signedUpEvents: const <Event>[],
      savedEvents: const <Event>[],
      now: widgetbookUtilityCalendarNow,
    ),
    organizerNames: const CalendarOrganizerNameLookupState.ready(
      _calendarOrganizerNames,
    ),
  );

  Key dayKey(DateTime date) {
    return ValueKey<String>(
      'widgetbook-calendar-agenda-${date.toIso8601String()}',
    );
  }

  return WidgetbookPageCatalogFrame(
    title: 'CalendarAgendaSliverSection',
    contractId: 'component.calendar.agenda_section',
    children: [
      WidgetbookPageStateCard(
        label: 'ready rows',
        child: SizedBox(
          height: widgetbookUtilitySheetFrameHeight,
          child: CustomScrollView(
            slivers: [
              CalendarAgendaSliverSection(
                state: readyState,
                dayKeyBuilder: dayKey,
                onEventSelected: (_) {},
                onRetryOrganizerNames: widgetbookNoop,
              ),
            ],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'club names loading',
        child: SizedBox(
          height: widgetbookUtilityDialogFrameHeight,
          child: CustomScrollView(
            slivers: [
              CalendarAgendaSliverSection(
                state: const CalendarAgendaOrganizerNamesLoadingState(),
                dayKeyBuilder: dayKey,
                onEventSelected: (_) {},
                onRetryOrganizerNames: widgetbookNoop,
              ),
            ],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'club names error',
        child: SizedBox(
          height: widgetbookUtilityDialogFrameHeight,
          child: CustomScrollView(
            slivers: [
              CalendarAgendaSliverSection(
                state: CalendarAgendaOrganizerNamesErrorState(
                  StateError('Club names failed'),
                ),
                dayKeyBuilder: dayKey,
                onEventSelected: (_) {},
                onRetryOrganizerNames: widgetbookNoop,
              ),
            ],
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty',
        child: SizedBox(
          height: widgetbookUtilityDialogFrameHeight,
          child: CustomScrollView(
            slivers: [
              CalendarAgendaSliverSection(
                state: emptyState,
                dayKeyBuilder: dayKey,
                onEventSelected: (_) {},
                onRetryOrganizerNames: widgetbookNoop,
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Header states',
  type: CalendarDateHeader,
  path: '[P3 utility surfaces]/Calendar/Components',
)
Widget calendarDateHeaderStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CalendarDateHeader',
    contractId: 'component.calendar.date_header',
    children: [
      WidgetbookPageStateCard(
        label: 'week strip',
        child: SizedBox(
          height: _calendarWeekHeaderPreviewHeight,
          child: CalendarDateHeader(
            summary: _calendarSummary,
            selectedDate: _calendarSummary.anchorDate,
            expanded: false,
            onDateSelected: (_) {},
            onVerticalDragDelta: (_) {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'month grid',
        child: SizedBox(
          height: _calendarMonthHeaderPreviewHeight,
          child: CalendarDateHeader(
            summary: _calendarSummary,
            selectedDate: _calendarSummary.anchorDate,
            expanded: true,
            onDateSelected: (_) {},
            onVerticalDragDelta: (_) {},
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Skeleton state',
  type: CalendarDateHeaderSkeleton,
  path: '[P3 utility surfaces]/Calendar/Components',
)
Widget calendarDateHeaderSkeletonStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CalendarDateHeaderSkeleton',
    contractId: 'component.calendar.date_header_skeleton',
    children: const [
      WidgetbookPageStateCard(
        label: 'loading',
        child: CalendarDateHeaderSkeleton(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Skeleton state',
  type: CalendarWeekRowSkeleton,
  path: '[P3 utility surfaces]/Calendar/Components',
)
Widget calendarWeekStripSkeletonStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CalendarWeekRowSkeleton',
    contractId: 'component.calendar.week_strip_skeleton',
    children: const [
      WidgetbookPageStateCard(
        label: 'loading',
        child: CalendarWeekRowSkeleton(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Stats state',
  type: CalendarStatsHeader,
  path: '[P3 utility surfaces]/Calendar/Components',
)
Widget calendarStatsHeaderStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CalendarStatsHeader',
    contractId: 'component.calendar.stats_header',
    children: [
      WidgetbookPageStateCard(
        label: 'joined saved cancelled',
        child: CalendarStatsHeader(summary: _calendarSummary),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Skeleton state',
  type: CalendarStatsHeaderSkeleton,
  path: '[P3 utility surfaces]/Calendar/Components',
)
Widget calendarStatsHeaderSkeletonStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CalendarStatsHeaderSkeleton',
    contractId: 'component.calendar.stats_header_skeleton',
    children: const [
      WidgetbookPageStateCard(
        label: 'loading',
        child: CalendarStatsHeaderSkeleton(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Skeleton state',
  type: CalendarStatSkeleton,
  path: '[P3 utility surfaces]/Calendar/Components',
)
Widget calendarStatSkeletonStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CalendarStatSkeleton',
    contractId: 'component.calendar.stat_skeleton',
    children: const [
      WidgetbookPageStateCard(
        label: 'single stat',
        child: CalendarStatSkeleton(),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Week strip state',
  type: CalendarWeekRow,
  path: '[P3 utility surfaces]/Calendar/Components',
)
Widget calendarWeekStripStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CalendarWeekRow',
    contractId: 'component.calendar.week_strip',
    children: [
      WidgetbookPageStateCard(
        label: 'event markers',
        child: CalendarWeekRow(
          summary: _calendarSummary,
          selectedDate: _calendarSummary.anchorDate,
          onDateSelected: (_) {},
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Month grid state',
  type: CalendarMonthGrid,
  path: '[P3 utility surfaces]/Calendar/Components',
)
Widget calendarMonthGridStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CalendarMonthGrid',
    contractId: 'component.calendar.month_grid',
    children: [
      WidgetbookPageStateCard(
        label: 'event markers',
        child: CalendarMonthGrid(
          summary: _calendarSummary,
          selectedDate: _calendarSummary.anchorDate,
          onDateSelected: (_) {},
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Divider state',
  type: CalendarStatDivider,
  path: '[P3 utility surfaces]/Calendar/Components',
)
Widget calendarStatDividerStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'CalendarStatDivider',
    contractId: 'component.calendar.stat_divider',
    children: const [
      WidgetbookPageStateCard(
        label: 'vertical rule',
        child: Center(child: CalendarStatDivider()),
      ),
    ],
  );
}

class _CalendarScope extends StatelessWidget {
  const _CalendarScope({
    required this.child,
    this.uidValue,
    this.signedUpEventsValue,
    this.savedEventsValue,
    this.organizerNamesValue,
  });

  final Widget child;
  final AsyncValue<String?>? uidValue;
  final AsyncValue<List<Event>>? signedUpEventsValue;
  final AsyncValue<List<Event>>? savedEventsValue;
  final AsyncValue<Map<String, String>>? organizerNamesValue;

  @override
  Widget build(BuildContext context) {
    final signedUpEvents =
        signedUpEventsValue ?? AsyncData<List<Event>>(_calendarJoinedEvents);
    final savedEvents =
        savedEventsValue ?? AsyncData<List<Event>>(_calendarSavedEvents);
    final lookupEvents = [
      ...?signedUpEvents.asData?.value,
      ...?savedEvents.asData?.value,
    ];
    final organizerQuery = OrganizerNameLookupQuery(
      lookupEvents.map((event) => event.clubId),
    );

    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWithValue(
          uidValue ?? const AsyncData<String?>(widgetbookUtilityViewerUid),
        ),
        watchSignedUpEventsProvider(
          widgetbookUtilityViewerUid,
        ).overrideWithValue(signedUpEvents),
        watchSavedEventDetailsForUserProvider(
          widgetbookUtilityViewerUid,
        ).overrideWithValue(savedEvents),
        if (organizerQuery.organizerIds.isNotEmpty)
          organizerNameLookupProvider(organizerQuery).overrideWithValue(
            organizerNamesValue ??
                const AsyncData<Map<String, String>>(_calendarOrganizerNames),
          ),
      ],
      child: child,
    );
  }
}

Event _calendarEvent({
  required String id,
  required DateTime startTime,
  required String meetingPoint,
  required String notes,
  required double distanceKm,
  required int bookedCount,
  int priceInPaise = 0,
  EventLifecycleStatus status = EventLifecycleStatus.active,
}) {
  return UtilitySurfaceFixtures.eventFixture(
    id: id,
    meetingPoint: meetingPoint,
    notes: notes,
    latitude: 19.0676,
    longitude: 72.8227,
  ).copyWith(
    startTime: startTime,
    endTime: startTime.add(const Duration(hours: 1, minutes: 30)),
    distanceKm: distanceKm,
    bookedCount: bookedCount,
    priceInPaise: priceInPaise,
    status: status,
  );
}
