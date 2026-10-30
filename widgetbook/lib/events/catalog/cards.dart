import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/parts/event_activity_visuals.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_action_card.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_date_rail_card.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Action card',
  type: EventActionCard,
  path: '[Events]/Tiles',
)
Widget eventActionCardState(BuildContext context) {
  return EventActionCard(
    event: widgetbookEvent,
    indexLabel: '1',
    badges: [
      EventActionCardBadge(
        label: 'Booked',
        tone: CatchBadgeTone.success,
        icon: CatchIcons.success,
      ),
    ],
    metaRows: [
      [
        CatchMetaEntry(icon: CatchIcons.time, label: '6:30 AM'),
        CatchMetaEntry(icon: CatchIcons.location, label: 'Bandra'),
      ],
    ],
    actions: [
      EventActionCardAction(
        label: 'Open event',
        icon: CatchIcons.date,
        onPressed: widgetbookNoop,
        variant: CatchButtonVariant.primary,
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Action card header',
  type: EventActionCardHeader,
  path: '[Events]/Tiles',
)
Widget eventActionCardHeaderState(BuildContext context) {
  return Padding(
    padding: CatchInsets.contentDense,
    child: EventActionCardHeader(
      indexLabel: '1 / 3',
      badges: [
        EventActionCardBadge(
          label: 'Booked',
          tone: CatchBadgeTone.success,
          icon: CatchIcons.success,
        ),
        EventActionCardBadge(label: 'Host pick', tone: CatchBadgeTone.brand),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Action card actions',
  type: EventActionList,
  path: '[Events]/Tiles',
)
Widget eventActionCardActionsState(BuildContext context) {
  return Padding(
    padding: CatchInsets.contentDense,
    child: EventActionList(
      actions: [
        EventActionCardAction(
          label: 'Open event',
          icon: CatchIcons.date,
          onPressed: widgetbookNoop,
          variant: CatchButtonVariant.primary,
        ),
        EventActionCardAction(
          label: 'Add to calendar',
          icon: CatchIcons.eventConfirmed,
          onPressed: widgetbookNoop,
        ),
      ],
    ),
  );
}

@widgetbook.UseCase(
  name: 'Date rail card',
  type: EventDateRailCard,
  path: '[Events]/Tiles',
)
Widget eventDateRailCardState(BuildContext context) {
  return EventDateRailCard(
    event: widgetbookEvent,
    kicker: widgetbookEventsOrganizer.name,
    title: widgetbookEvent.eventFormat.label,
    supportingLabel: '5 km · Conversational · Carter Road Jetty',
    capacityLabel: '18 going · 6 left',
    onTap: widgetbookNoop,
  );
}

@widgetbook.UseCase(
  name: 'Ticket stub states',
  type: EventTicketStubRow,
  path: '[Events]/Tiles',
)
Widget eventTicketStubStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      EventTicketStubRow(
        decisionLabel: '6:30 PM · 18 going · 6 left',
        priceLabel: 'Free',
        statusColor: t.accent,
      ),
      gapH16,
      EventTicketStubRow(
        decisionLabel: '7:00 PM · Waitlist open',
        statusLabel: 'Request',
        priceLabel: 'From ₹499',
        statusColor: t.warning,
      ),
    ],
  );
}

@widgetbook.UseCase(name: 'Date rail', type: DateRail, path: '[Events]/Tiles')
Widget eventDateRailState(BuildContext context) {
  return DateRail(
    startTime: widgetbookEvent.startTime,
    color: CatchTokens.of(context).accent,
    activityIcon: eventActivityVisual(
      widgetbookEvent.activityKind,
      context: context,
    ).icon,
  );
}

@widgetbook.UseCase(
  name: 'Perforation line',
  type: PerforationDivider,
  path: '[Events]/Tiles',
)
Widget eventPerforationLineState(BuildContext context) {
  return SizedBox(
    height: WidgetbookPreviewLayout.profileCompactPreviewHeight,
    child: PerforationDivider(
      color: CatchTokens.of(context).ticketPerforationLine,
    ),
  );
}
