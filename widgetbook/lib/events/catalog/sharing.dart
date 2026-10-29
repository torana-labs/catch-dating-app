import 'package:catch_dating_app/events/shared/event_share_card.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Share card states',
  type: EventShareCard,
  path: '[Event Detail]/Cards',
)
Widget eventShareCardStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventShareCard',
    catalogId: 'card.event.share',
    children: [
      WidgetbookPageStateCard(
        label: 'free event',
        child: EventShareCard(event: widgetbookEvent),
      ),
      WidgetbookPageStateCard(
        label: 'paid limited spots',
        child: EventShareCard(
          event: widgetbookEventDetailFixture(
            id: 'widgetbook-event-share-paid',
            activityKind: ActivityKind.dinner,
            priceInPaise: 160000,
            capacityLimit: 12,
            bookedCount: 11,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Share pill',
  type: EventShareChip,
  path: '[Event Detail]/Cards',
)
Widget eventSharePillState(BuildContext context) {
  return const Padding(
    padding: CatchInsets.contentDense,
    child: EventShareChip(label: '3 spots left'),
  );
}
