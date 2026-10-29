import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/events/presentation/event_detail_view_model.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_screen.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_state.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Route states',
  type: EventLocationMapRouteScreen,
  path: '[P3 utility surfaces]/Event location map',
)
Widget eventLocationMapRouteStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'EventLocationMapRouteScreen',
    contractId: 'screen.event.location_map',
    children: [
      WidgetbookPageStateCard(
        label: 'route loading',
        child: WidgetbookUtilityDeviceFrame(
          child: _MapRouteScope(
            value: const AsyncLoading<EventDetailViewModel?>(),
            child: EventLocationMapRouteScreen(
              eventId: widgetbookUtilityEvent.id,
              enableNetworkTiles: false,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'route error',
        child: WidgetbookUtilityDeviceFrame(
          child: _MapRouteScope(
            value: AsyncError<EventDetailViewModel?>(
              StateError('Widgetbook event lookup failed'),
              StackTrace.empty,
            ),
            child: EventLocationMapRouteScreen(
              eventId: widgetbookUtilityEvent.id,
              enableNetworkTiles: false,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event not found',
        child: WidgetbookUtilityDeviceFrame(
          child: _MapRouteScope(
            value: const AsyncData<EventDetailViewModel?>(null),
            child: EventLocationMapRouteScreen(
              eventId: widgetbookUtilityEvent.id,
              enableNetworkTiles: false,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pinned location',
        child: WidgetbookUtilityDeviceFrame(
          child: _MapRouteScope(
            value: AsyncData<EventDetailViewModel?>(
              _eventVm(widgetbookUtilityEvent),
            ),
            child: EventLocationMapRouteScreen(
              eventId: widgetbookUtilityEvent.id,
              enableNetworkTiles: false,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Map states',
  type: EventLocationMapScreen,
  path: '[P3 utility surfaces]/Event location map',
)
Widget eventLocationMapScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'EventLocationMapScreen',
    contractId: 'screen.event.location_map.sections',
    children: [
      WidgetbookPageStateCard(
        label: 'network tiles disabled',
        child: WidgetbookUtilityDeviceFrame(
          child: EventLocationMapScreen(
            state: EventLocationMapState.fromEvent(
              widgetbookUtilityEvent,
              enableNetworkTiles: false,
            ),
            onGetDirections: () {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'directions pending',
        child: WidgetbookUtilityDeviceFrame(
          child: EventLocationMapScreen(
            state: EventLocationMapState.fromEvent(
              widgetbookUtilityEvent,
              enableNetworkTiles: false,
            ),
            directionsPending: true,
            onGetDirections: () {},
          ),
        ),
      ),
    ],
  );
}

class _MapRouteScope extends StatelessWidget {
  const _MapRouteScope({required this.value, required this.child});

  final AsyncValue<EventDetailViewModel?> value;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return WidgetbookFixtureScope(
      overrides: [
        eventDetailViewModelProvider(
          widgetbookUtilityEvent.id,
        ).overrideWithValue(value),
        externalUrlLauncherProvider.overrideWithValue(
          widgetbookUtilityNoopLauncher,
        ),
      ],
      child: child,
    );
  }
}

EventDetailViewModel _eventVm(Event event) => EventDetailViewModel(
  event: event,
  userProfile: widgetbookUtilityViewer,
  reviews: const [],
  isAuthenticated: true,
  isHost: false,
  isSaved: false,
  participation: null,
);
