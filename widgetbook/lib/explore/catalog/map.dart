import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_map_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';
import 'scope.dart';

const _mapCenter = LocationCoordinate(19.076, 72.8777);

@widgetbook.UseCase(
  name: 'Map launcher states',
  type: CatchButton,
  path: '[Explore]/Sections',
)
Widget exploreMapLauncherStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'CatchButton map launcher',
    catalogId: 'section.explore.map_launcher',
    children: [
      WidgetbookPageStateCard(
        label: 'empty count',
        child: _MapPillFrame(
          child: CatchButton.floating(
            label: 'Map',
            icon: CatchIcons.map,
            semanticsLabel: 'Map',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'with count',
        child: _MapPillFrame(
          child: CatchButton.floating(
            label: 'Map',
            icon: CatchIcons.map,
            count: 6,
            semanticsLabel: 'Map, 6 events',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pressed review target',
        child: _MapPillFrame(
          child: CatchButton.floating(
            label: 'Map',
            icon: CatchIcons.map,
            count: 12,
            semanticsLabel: 'Map, 12 events',
            onPressed: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookExploreMediaOverride(
          textScaler: const TextScaler.linear(2),
          child: _MapPillFrame(
            child: CatchButton.floating(
              label: 'Map',
              icon: CatchIcons.map,
              count: 12,
              semanticsLabel: 'Map, 12 events',
              onPressed: widgetbookNoop,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Map route states',
  type: ExploreMapScreen,
  path: '[Explore]/Sections',
)
Widget exploreMapRouteStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'ExploreMapScreen',
    catalogId: 'section.explore.map_route',
    children: [
      WidgetbookPageStateCard(
        label: 'pins ready',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.defaultPhonePreviewHeight,
          child: WidgetbookExploreScope(
            child: const ExploreMapScreen(enableNetworkTiles: false),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'selected event card',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.defaultPhonePreviewHeight,
          child: WidgetbookExploreScope(
            child: ExploreMapScreen(
              enableNetworkTiles: false,
              initialSelectedEventId: widgetbookExploreFeedItems.first.event.id,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'loading',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: WidgetbookExploreScope(
            feed: const AsyncLoading<ExploreFeedViewModel>(),
            child: const ExploreMapScreen(enableNetworkTiles: false),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: WidgetbookExploreScope(
            feed: const AsyncData(ExploreFeedViewModel(items: [])),
            child: const ExploreMapScreen(enableNetworkTiles: false),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'no exact pins',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: WidgetbookExploreScope(
            feed: AsyncData(
              ExploreFeedViewModel(
                items: [
                  ExploreEventItem(
                    event: widgetbookExploreFeedItems.first.event.copyWith(
                      meetingLocation: null,
                    ),
                    club: widgetbookExploreFeedItems.first.club,
                    availability: widgetbookExploreFeedItems.first.availability,
                    distanceFromUserKm:
                        widgetbookExploreFeedItems.first.distanceFromUserKm,
                  ),
                ],
              ),
            ),
            child: const ExploreMapScreen(enableNetworkTiles: false),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'error',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: WidgetbookExploreScope(
            feed: AsyncError<ExploreFeedViewModel>(
              StateError('Widgetbook map feed failed'),
              StackTrace.empty,
            ),
            child: const ExploreMapScreen(enableNetworkTiles: false),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'distance ring active',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.defaultPhonePreviewHeight,
          child: WidgetbookExploreScope(
            seedFilters: const WidgetbookExploreFilterSeed(
              distance: ExploreDistanceFilter.threeKm,
            ),
            deviceLocation: _mapCenter,
            child: const ExploreMapScreen(enableNetworkTiles: false),
          ),
        ),
      ),
    ],
  );
}

class _MapPillFrame extends StatelessWidget {
  const _MapPillFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.bg,
        border: Border.all(color: t.line),
        borderRadius: BorderRadius.circular(CatchRadius.lg),
      ),
      child: SizedBox(
        width: WidgetbookPreviewLayout.surfaceCardWidth,
        height: WidgetbookPreviewLayout.smallPreviewExtent,
        child: Align(
          alignment: Alignment.bottomLeft,
          child: Padding(
            padding: const EdgeInsets.all(CatchSpacing.s4),
            child: child,
          ),
        ),
      ),
    );
  }
}
