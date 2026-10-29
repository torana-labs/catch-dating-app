import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/place.dart';
import 'package:catch_dating_app/core/device_location.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_screen.dart';
import 'package:catch_dating_app/events/presentation/event_map_screen.dart';
import 'package:catch_dating_app/events/presentation/event_map_view_model.dart';
import 'package:catch_dating_app/events/presentation/location_picker_screen.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_pins_map.dart';
import 'package:catch_dating_app/events/presentation/widgets/map_overlay_top_bar.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tile_data.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_dating_app/locations/shared/location_map.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
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
  name: 'Picker states',
  type: LocationPickerScreen,
  path: '[Events]/Screens',
)
Widget locationPickerScreenStates(BuildContext context) {
  return WidgetbookEventDeviceFrame(
    child: LocationPickerScreen(
      initialLocation: _mapCenter,
      initialLabel: 'Carter Road Jetty',
      loadMapTiles: false,
    ),
  );
}

@widgetbook.UseCase(
  name: 'Place search states',
  type: PlaceSearchSection,
  path: '[Events]/Map',
)
Widget placeSearchSectionStates(BuildContext context) {
  const suggestions = [
    PlaceAutocompleteSuggestion(
      placeId: 'cubbon-park',
      description: 'Cubbon Park, Bengaluru',
      mainText: 'Cubbon Park',
      secondaryText: 'Bengaluru, Karnataka',
    ),
    PlaceAutocompleteSuggestion(
      placeId: 'lalbagh',
      description: 'Lalbagh Botanical Garden, Bengaluru',
      mainText: 'Lalbagh Botanical Garden',
      secondaryText: 'Bengaluru, Karnataka',
    ),
  ];
  return WidgetbookPageCatalogFrame(
    title: 'PlaceSearchSection',
    contractId: 'screen.events.location_picker.search',
    children: [
      WidgetbookPageStateCard(
        label: 'suggestions',
        child: PlaceSearchSection(
          controller: TextEditingController(text: 'Park'),
          suggestions: suggestions,
          stateText: null,
          errorText: null,
          onChanged: (_) {},
          onSuggestionSelected: (_) {},
        ),
      ),
      WidgetbookPageStateCard(
        label: 'searching',
        child: PlaceSearchSection(
          controller: TextEditingController(text: 'Cubbon'),
          suggestions: const [],
          stateText: 'Searching places',
          errorText: null,
          onChanged: (_) {},
          onSuggestionSelected: (_) {},
        ),
      ),
      WidgetbookPageStateCard(
        label: 'search error',
        child: PlaceSearchSection(
          controller: TextEditingController(text: 'Cubbon'),
          suggestions: const [],
          stateText: null,
          errorText: 'Place search is unavailable right now.',
          onChanged: (_) {},
          onSuggestionSelected: (_) {},
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Selected point states',
  type: SelectedPointSection,
  path: '[Events]/Map',
)
Widget selectedPointSectionStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'SelectedPointSection',
    contractId: 'screen.events.location_picker.selection',
    children: [
      WidgetbookPageStateCard(
        label: 'named place',
        child: SelectedPointSection(
          hasSelection: true,
          selectedLabel: 'Cubbon Park, Bengaluru',
          onConfirm: () {},
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dropped pin',
        child: SelectedPointSection(
          hasSelection: true,
          selectedLabel: null,
          onConfirm: () {},
        ),
      ),
      const WidgetbookPageStateCard(
        label: 'nothing selected',
        child: SelectedPointSection(
          hasSelection: false,
          selectedLabel: null,
          onConfirm: null,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Map view states',
  type: EventMap,
  path: '[Events]/Map',
)
Widget eventMapViewStates(BuildContext context) {
  final items = _eventMapItems();
  return WidgetbookScrollCatalogFrame(
    title: 'EventMap',
    catalogId: 'screen.events.map',
    children: [
      WidgetbookPageStateCard(
        label: 'loading',
        child: SizedBox(
          height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
          child: WidgetbookFixtureScope(
            overrides: [
              deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
            ],
            child: const EventMap(viewModel: AsyncLoading<EventMapViewModel>()),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pinned events',
        child: SizedBox(
          height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
          child: WidgetbookFixtureScope(
            overrides: [
              deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
            ],
            child: EventMap(
              enableNetworkTiles: false,
              viewModel: AsyncData(
                EventMapViewModel(
                  events: [for (final item in items) item.event],
                  pinnedEvents: [for (final item in items) item.event],
                  items: items,
                  pinnedItems: items,
                ),
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty',
        child: SizedBox(
          height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
          child: WidgetbookFixtureScope(
            overrides: [
              deviceLocationProvider.overrideWith(_NoDeviceLocation.new),
            ],
            child: const EventMap(
              viewModel: AsyncData(
                EventMapViewModel(events: <Event>[], pinnedEvents: <Event>[]),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Location loading',
  type: EventLocationMapLoadingBody,
  path: '[Events]/Map',
)
Widget eventLocationMapLoadingBodyState(BuildContext context) {
  return const SizedBox(
    height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
    child: EventLocationMapLoadingBody(),
  );
}

@widgetbook.UseCase(
  name: 'Map loading',
  type: EventMapLoadingBody,
  path: '[Events]/Map',
)
Widget eventMapLoadingBodyState(BuildContext context) {
  return const SizedBox(
    height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
    child: EventMapLoadingBody(),
  );
}

@widgetbook.UseCase(
  name: 'Chromeless map scaffold',
  type: ChromelessMapScaffold,
  path: '[Events]/Map',
)
Widget chromelessMapScaffoldState(BuildContext context) {
  return const WidgetbookEventDeviceFrame(
    child: ChromelessMapScaffold(child: EventMapLoadingBody()),
  );
}

@widgetbook.UseCase(
  name: 'Map placeholder',
  type: EventPinsMap,
  path: '[Events]/Map',
)
Widget eventPinsMapState(BuildContext context) {
  return SizedBox(
    height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
    child: EventPinsMap(
      items: _eventMapItems(),
      initialCenter: _mapCenter,
      selectedEventId: widgetbookEvent.id,
      selectedEventCenter: _mapCenter,
      enableNetworkTiles: false,
      userLocation: _mapCenter,
      distanceRingRadiusKm: 3,
      onEventSelected: (_) {},
    ),
  );
}

@widgetbook.UseCase(
  name: 'Pins placeholder',
  type: EventPinsFallbackMap,
  path: '[Events]/Map',
)
Widget eventPinsMapPlaceholderState(BuildContext context) {
  return SizedBox(
    height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
    child: EventPinsFallbackMap(
      items: _eventMapItems(),
      selectedEventId: widgetbookEvent.id,
      userLocation: _mapCenter,
      distanceRingRadiusKm: 3,
      onEventSelected: (_) {},
    ),
  );
}

@widgetbook.UseCase(
  name: 'Overlay controls',
  type: MapOverlayTopBar,
  path: '[Events]/Map',
)
Widget mapOverlayControlsState(BuildContext context) {
  return SizedBox(
    height: WidgetbookPreviewLayout.mediaPanelHeight,
    child: Stack(
      children: [
        Positioned.fill(
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: CatchTokens.of(context).primarySoft,
            ),
          ),
        ),
        MapOverlayTopBar(
          trailing: Icon(CatchIcons.location),
          below: const Text('Carter Road Jetty'),
          onBack: widgetbookNoop,
        ),
      ],
    ),
  );
}

class _NoDeviceLocation extends DeviceLocation {
  @override
  Future<LocationCoordinate?> build() async => null;
}

const _mapCenter = LocationCoordinate(19.0676, 72.8227);

List<EventMapItem> _eventMapItems() {
  final events = widgetbookEventsAgendaEvents().take(3).toList(growable: false);
  return [
    for (var index = 0; index < events.length; index += 1)
      EventMapItem(
        event: _eventAtMapCoordinate(events[index], index),
        status: switch (index) {
          0 => EventTileStatus.joined,
          1 => EventTileStatus.saved,
          _ => EventTileStatus.recommended,
        },
        clubName: widgetbookEventsClub.name,
      ),
  ];
}

Event _eventAtMapCoordinate(Event event, int index) {
  final latitude = _mapCenter.latitude + (index * 0.006);
  final longitude = _mapCenter.longitude + (index * 0.004);
  return event.copyWith(
    meetingLocation: event.meetingLocation!.copyWith(
      latitude: latitude,
      longitude: longitude,
    ),
    startingPointLat: latitude,
    startingPointLng: longitude,
  );
}

@widgetbook.UseCase(
  name: 'Interactive map',
  type: LocationMap,
  path: '[Events]/Map',
)
Widget locationMapState(BuildContext context) {
  return SizedBox(
    height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
    child: LocationMap(initialCenter: _mapCenter, initialZoom: 13),
  );
}
