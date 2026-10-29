import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_name_lookup.dart';
import 'package:catch_dating_app/events/presentation/saved_events_screen.dart';
import 'package:catch_dating_app/events/presentation/saved_events_state.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Saved states',
  type: SavedEventsScreen,
  path: '[Events]/Screens',
)
Widget savedEventsScreenStates(BuildContext context) {
  final savedEvents = widgetbookEventsAgendaEvents();
  final pastOnlyEvents = [
    widgetbookEventsPastEvent,
    widgetbookEventDetailFixture(
      id: 'widgetbook-saved-past-dinner',
      activityKind: ActivityKind.dinner,
      startTime: widgetbookEventsNow.subtract(
        const Duration(days: 3, hours: 2),
      ),
    ),
  ];
  return WidgetbookScrollCatalogFrame(
    title: 'SavedEventsScreen',
    catalogId: 'screen.events.saved',
    children: [
      WidgetbookPageStateCard(
        label: 'empty signed out',
        child: _SavedEventsRouteFrame(
          uid: null,
          savedEvents: const AsyncData<List<Event>>([]),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'saved list',
        child: _SavedEventsRouteFrame(
          savedEvents: AsyncData<List<Event>>(savedEvents),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading',
        child: const _SavedEventsRouteFrame(
          savedEvents: AsyncLoading<List<Event>>(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'stream error',
        child: _SavedEventsRouteFrame(
          savedEvents: AsyncError<List<Event>>(
            StateError('Saved events failed'),
            StackTrace.empty,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty saved events',
        child: const _SavedEventsRouteFrame(
          savedEvents: AsyncData<List<Event>>([]),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'club names loading',
        child: _SavedEventsRouteFrame(
          savedEvents: AsyncData<List<Event>>(savedEvents),
          clubNames: const AsyncLoading<Map<String, String>>(),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'club names error',
        child: _SavedEventsRouteFrame(
          savedEvents: AsyncData<List<Event>>(savedEvents),
          clubNames: AsyncError<Map<String, String>>(
            StateError('Club names failed'),
            StackTrace.empty,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'past only',
        child: _SavedEventsRouteFrame(
          savedEvents: AsyncData<List<Event>>(pastOnlyEvents),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2',
        child: MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(2)),
          child: _SavedEventsRouteFrame(
            savedEvents: AsyncData<List<Event>>(savedEvents),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: Theme(
          data: AppTheme.dark,
          child: _SavedEventsRouteFrame(
            savedEvents: AsyncData<List<Event>>(savedEvents),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Agenda sliver states',
  type: SavedEventsAgendaList,
  path: '[Events]/Sections',
)
Widget savedEventsAgendaSliverStates(BuildContext context) {
  final events = widgetbookEventsAgendaEvents();
  return SizedBox(
    height: WidgetbookPreviewLayout.exploreRoutePreviewHeight,
    child: CustomScrollView(
      slivers: [
        SavedEventsAgendaList(
          state: SavedEventsListState.from(events, now: widgetbookEventsNow),
          clubNames: {
            for (final event in events) event.clubId: widgetbookEventsClub.name,
          },
          onEventSelected: (_) {},
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Club names error sliver',
  type: SavedEventsClubNamesErrorState,
  path: '[Events]/Sections',
)
Widget savedEventsClubNamesErrorSliverState(BuildContext context) {
  return SizedBox(
    height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
    child: CustomScrollView(
      slivers: [
        SavedEventsClubNamesErrorState(
          error: StateError('Club names failed'),
          onRetry: widgetbookNoop,
        ),
      ],
    ),
  );
}

class _SavedEventsRouteFrame extends StatelessWidget {
  const _SavedEventsRouteFrame({
    this.uid = widgetbookEventsViewerUid,
    this.savedEvents,
    this.clubNames,
  });

  final String? uid;
  final AsyncValue<List<Event>>? savedEvents;
  final AsyncValue<Map<String, String>>? clubNames;

  @override
  Widget build(BuildContext context) {
    final effectiveSavedEvents =
        savedEvents ?? AsyncData<List<Event>>(widgetbookEventsAgendaEvents());
    final events = _asyncDataList(effectiveSavedEvents);
    final query = ClubNameLookupQuery(events.map((event) => event.clubId));

    return WidgetbookEventDeviceFrame(
      child: WidgetbookFixtureScope(
        overrides: [
          uidProvider.overrideWithValue(AsyncData<String?>(uid)),
          if (uid != null)
            watchSavedEventDetailsForUserProvider(
              uid!,
            ).overrideWithValue(effectiveSavedEvents),
          if (events.isNotEmpty)
            clubNameLookupProvider(query).overrideWithValue(
              clubNames ??
                  AsyncData<Map<String, String>>({
                    for (final event in events)
                      event.clubId: widgetbookEventsClub.name,
                  }),
            ),
        ],
        child: SavedEventsScreen(referenceNow: widgetbookEventsNow),
      ),
    );
  }
}

List<T> _asyncDataList<T>(AsyncValue<List<T>> value) {
  return switch (value) {
    AsyncData<List<T>>(:final value) => value,
    _ => <T>[],
  };
}
