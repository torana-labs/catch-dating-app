import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/events/shared/event_agenda_list.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_agenda_tile.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_tile_data.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Agenda sliver list',
  type: EventAgendaSliverList,
  path: '[Events]/Lists',
)
Widget eventAgendaSliverListState(BuildContext context) {
  return SizedBox(
    height: WidgetbookPreviewLayout.exploreRoutePreviewHeight,
    child: CustomScrollView(
      slivers: [
        EventAgendaSliverList(
          events: widgetbookEventsAgendaEvents(),
          today: DateUtils.dateOnly(widgetbookEventsNow),
          showClubName: true,
          clubNameBuilder: (_) => widgetbookEventsClub.name,
          badgeLabel: 'OPEN',
          onEventSelected: (_) {},
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Agenda day group',
  type: AgendaDaySection,
  path: '[Events]/Lists',
)
Widget eventAgendaDayGroupState(BuildContext context) {
  return Padding(
    padding: CatchInsets.pageBody,
    child: AgendaDaySection(
      date: DateUtils.dateOnly(widgetbookEvent.startTime),
      today: DateUtils.dateOnly(widgetbookEventsNow),
      rows: [
        EventAgendaRow(
          event: widgetbookEvent,
          badgeLabel: 'OPEN',
          clubName: widgetbookEventsClub.name,
          status: EventTileStatus.saved,
        ),
        EventAgendaRow(
          event: widgetbookEventDetailFixture(
            id: 'widgetbook-event-agenda-day-dinner',
            activityKind: ActivityKind.dinner,
            startTime: widgetbookEvent.startTime.add(const Duration(hours: 2)),
            capacityLimit: 10,
            bookedCount: 8,
            priceInPaise: 180000,
          ),
          badgeLabel: 'OPEN',
          clubName: widgetbookEventsClub.name,
          status: EventTileStatus.saved,
        ),
      ],
      onEventSelected: (_) {},
      showClubName: true,
      dayLabelBottomGap: CatchLayout.agendaDayLabelBottomGap,
    ),
  );
}

@widgetbook.UseCase(
  name: 'Agenda skeleton',
  type: EventAgendaSliverSkeleton,
  path: '[Events]/Lists',
)
Widget eventAgendaSliverSkeletonState(BuildContext context) {
  return const SizedBox(
    height: WidgetbookPreviewLayout.defaultPhonePreviewHeight,
    child: CustomScrollView(slivers: [EventAgendaSliverSkeleton()]),
  );
}

@widgetbook.UseCase(
  name: 'Agenda tile skeleton',
  type: EventAgendaTileSkeleton,
  path: '[Events]/Lists',
)
Widget eventAgendaTileSkeletonState(BuildContext context) {
  return const Padding(
    padding: CatchInsets.pageBody,
    child: EventAgendaTileSkeleton(),
  );
}

@widgetbook.UseCase(
  name: 'Agenda tile',
  type: EventAgendaTile,
  path: '[Events]/Tiles',
)
Widget eventAgendaTileState(BuildContext context) {
  return EventAgendaTile(
    data: _eventTileData(widgetbookEvent, status: EventTileStatus.joined),
    showClubName: true,
    badgeLabel: 'JOINED',
    onTap: widgetbookNoop,
  );
}

EventTileData _eventTileData(
  Event event, {
  EventTileStatus status = EventTileStatus.open,
}) {
  return EventTileData.fromEvent(
    event: event,
    status: status,
    clubName: widgetbookEventsClub.name,
  );
}
