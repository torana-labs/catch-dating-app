import 'package:catch_dating_app/contexts/bookings/domain/event_arrival_action.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_full_view_model.dart';
import 'package:catch_dating_app/dashboard/presentation/widgets/event_focus_list.dart';
import 'package:catch_dating_app/design_fixtures/dashboard_surface_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

final _eventFocusActions = EventFocusActions(
  onViewEvent: (_) => widgetbookNoop(),
  onCheckIn: (_) => widgetbookNoop(),
  onOpenSwipe: (_) => widgetbookNoop(),
  onWriteReview: (_) => widgetbookNoop(),
  onOpenDirections: (_) => widgetbookNoop(),
  onAddToCalendar: (_) => widgetbookNoop(),
  onResetCheckInError: widgetbookNoop,
);

@widgetbook.UseCase(
  name: 'List states',
  type: EventFocusList,
  path: '[P1 product surfaces]/Dashboard home',
)
Widget dashboardEventFocusListReviewStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'EventFocusList',
    contractId: 'dashboard.home.event_focus_list',
    children: [
      WidgetbookPageStateCard(
        label: 'upcoming event',
        child: WidgetbookDashboardPrimitiveFrame(
          child: EventFocusList(
            upcomingEvents: [widgetbookDashboardNextEvent],
            windowedEvents: const [],
            actions: _eventFocusActions,
            clubNameBuilder: (_) => widgetbookDashboardClub.name,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'check-in pending',
        child: WidgetbookDashboardPrimitiveFrame(
          child: EventFocusList(
            upcomingEvents: [widgetbookDashboardNextEvent],
            windowedEvents: const [],
            arrivalAction: EventArrivalAction(
              kind: EventArrivalActionKind.selfCheckIn,
              event: widgetbookDashboardNextEvent,
            ),
            checkInState: const EventFocusCheckInState(isPending: true),
            actions: _eventFocusActions,
            clubNameBuilder: (_) => widgetbookDashboardClub.name,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'one open Catch window',
        child: WidgetbookDashboardPrimitiveFrame(
          child: EventFocusList(
            upcomingEvents: const [],
            windowedEvents: [_window('one', 3)],
            now: DashboardSurfaceFixtures.now,
            actions: _eventFocusActions,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'two open Catch windows and an upcoming event',
        child: WidgetbookDashboardPrimitiveFrame(
          child: EventFocusList(
            upcomingEvents: [widgetbookDashboardNextEvent],
            windowedEvents: [_window('first', 2), _window('second', 9)],
            now: DashboardSurfaceFixtures.now,
            actions: _eventFocusActions,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Card states',
  type: EventFocusCard,
  path: '[P1 product surfaces]/Dashboard home',
)
Widget dashboardEventFocusCardReviewStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'EventFocusCard',
    contractId: 'dashboard.home.event_focus_card',
    children: [
      WidgetbookPageStateCard(
        label: 'upcoming',
        child: WidgetbookDashboardPrimitiveFrame(
          child: EventFocusCard(
            item: EventFocusItem(
              event: widgetbookDashboardNextEvent,
              kind: EventFocusKind.upcoming,
              clubName: widgetbookDashboardClub.name,
            ),
            cardIndex: 0,
            cardCount: 3,
            checkInState: EventFocusCheckInState.idle,
            onActionPressed: (_) {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'check-in pending',
        child: WidgetbookDashboardPrimitiveFrame(
          child: EventFocusCard(
            item: EventFocusItem(
              event: widgetbookDashboardNextEvent,
              kind: EventFocusKind.checkIn,
              clubName: widgetbookDashboardClub.name,
            ),
            cardIndex: 1,
            cardCount: 3,
            checkInState: const EventFocusCheckInState(isPending: true),
            onActionPressed: (_) {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'after event actions',
        child: WidgetbookDashboardPrimitiveFrame(
          child: EventFocusCard(
            item: EventFocusItem(
              event: DashboardSurfaceFixtures.attendedEvent,
              kind: EventFocusKind.afterEvent,
              clubName: widgetbookDashboardClub.name,
              canSwipe: true,
              needsReview: true,
              windowClosesAt: DashboardSurfaceFixtures.now.add(
                const Duration(hours: 2),
              ),
              attendedCount: 6,
            ),
            cardIndex: 2,
            cardCount: 3,
            checkInState: EventFocusCheckInState.idle,
            onActionPressed: (_) {},
          ),
        ),
      ),
    ],
  );
}

DashboardCatchWindow _window(String id, int hoursLeft) {
  final endTime = DashboardSurfaceFixtures.now.subtract(
    Duration(hours: 24 - hoursLeft),
  );
  final event = DashboardSurfaceFixtures.attendedEvent.copyWith(
    id: 'preview-catch-$id',
    name: 'Catch window $id',
    startTime: endTime.subtract(const Duration(hours: 1)),
    endTime: endTime,
  );
  return DashboardCatchWindow(
    event: event,
    windowClosesAt: DashboardSurfaceFixtures.now.add(
      Duration(hours: hoursLeft),
    ),
  );
}
