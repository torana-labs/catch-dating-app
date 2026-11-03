import 'package:catch_dating_app/design_fixtures/catches_surface_fixtures.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_empty_content.dart';
import 'package:catch_dating_app/swipes/presentation/widgets/swipe_empty_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Deck empty states',
  type: SwipeEmptyState,
  path: '[P1 product surfaces]/Catches/Sections',
)
Widget swipeEmptyStateStates(BuildContext context) {
  final openEvent = CatchesSurfaceFixtures.openWindowEvent();
  final closedEvent = CatchesSurfaceFixtures.closedWindowEvent();
  final upcomingEvent = CatchesSurfaceFixtures.upcomingEvent();

  return WidgetbookPageCatalogFrame(
    title: 'SwipeEmptyState',
    contractId: 'screen.catches.event.empty_states',
    children: [
      WidgetbookPageStateCard(
        label: 'default empty queue',
        child: WidgetbookCatchesDeviceFrame(child: SwipeEmptyState()),
      ),
      WidgetbookPageStateCard(
        label: 'sign in required',
        child: WidgetbookCatchesDeviceFrame(
          child: SwipeEmptyState(
            content: buildSwipeEmptyContent(
              l10n: context.l10n,
              event: openEvent,
              currentUser: null,
              currentUserParticipation: null,
              now: CatchesSurfaceFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event in progress',
        child: WidgetbookCatchesDeviceFrame(
          child: SwipeEmptyState(
            content: buildSwipeEmptyContent(
              l10n: context.l10n,
              event: upcomingEvent,
              currentUser: CatchesSurfaceFixtures.viewer,
              currentUserParticipation:
                  CatchesSurfaceFixtures.attendedParticipation(
                    event: upcomingEvent,
                  ),
              now: CatchesSurfaceFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'did not attend',
        child: WidgetbookCatchesDeviceFrame(
          child: SwipeEmptyState(
            content: buildSwipeEmptyContent(
              l10n: context.l10n,
              event: openEvent,
              currentUser: CatchesSurfaceFixtures.viewer,
              currentUserParticipation:
                  CatchesSurfaceFixtures.signedUpParticipation(
                    event: openEvent,
                  ),
              now: CatchesSurfaceFixtures.now,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'catch window closed',
        child: WidgetbookCatchesDeviceFrame(
          child: SwipeEmptyState(
            content: buildSwipeEmptyContent(
              l10n: context.l10n,
              event: closedEvent,
              currentUser: CatchesSurfaceFixtures.viewer,
              currentUserParticipation:
                  CatchesSurfaceFixtures.attendedParticipation(
                    event: closedEvent,
                  ),
              now: CatchesSurfaceFixtures.now,
            ),
          ),
        ),
      ),
    ],
  );
}
