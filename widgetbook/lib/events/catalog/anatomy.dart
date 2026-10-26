import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/core/media/uploaded_photo.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/events/presentation/event_detail_information_state.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_fact_list.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Photo strip tile states',
  type: EventDetailPhotoTile,
  path: '[Event Detail]/Design Primitives',
)
Widget eventDetailPhotoStripTileStates(BuildContext context) {
  final activity = ActivityPalette.resolve(context, ActivityKind.socialRun);
  final photo = UploadedPhoto.fromUpload(
    url:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=640&q=80',
    storagePath: 'widgetbook/events/photo-strip-tile.jpg',
    position: 0,
    now: widgetbookEventsNow,
  );

  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailPhotoTile',
    catalogId: 'event_detail.design.photo_strip_tile',
    children: [
      WidgetbookPageStateCard(
        label: 'uploaded photo',
        child: SizedBox(
          width: WidgetbookPreviewLayout.eventCompactAvatarWidth,
          child: EventDetailPhotoTile(
            index: 0,
            photo: photo,
            backgroundColor: activity.soft,
            iconColor: activity.deep,
            icon: activity.glyph,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'placeholder',
        child: SizedBox(
          width: WidgetbookPreviewLayout.eventCompactAvatarWidth,
          child: EventDetailPhotoTile(
            index: 1,
            photo: null,
            backgroundColor: activity.soft,
            iconColor: activity.deep,
            icon: activity.glyph,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Ticket stub cell states',
  type: TicketStubTile,
  path: '[Event Detail]/Design Primitives',
)
Widget eventDetailTicketStubCellStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'TicketStubTile',
    catalogId: 'event_detail.design.ticket_stub_cell',
    children: [
      WidgetbookPageStateCard(
        label: 'ticket row cells',
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Row(
            children: [
              Expanded(
                child: TicketStubTile(
                  cell: TicketStubTileData(
                    label: 'When',
                    value: 'Wed, Jun 24',
                    detail: '6:30 AM-8:15 AM',
                    icon: CatchIcons.addToCalendar,
                  ),
                  showDivider: false,
                ),
              ),
              Expanded(
                child: TicketStubTile(
                  cell: TicketStubTileData(
                    label: 'Where',
                    value: 'Carter Road Jetty',
                    detail: 'Bandra West',
                    icon: CatchIcons.location,
                  ),
                  showDivider: true,
                ),
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Hairline list states',
  type: HairlineList,
  path: '[Event Detail]/Design Primitives',
)
Widget eventDetailHairlineListStates(BuildContext context) {
  final activity = ActivityPalette.resolve(context, ActivityKind.socialRun);
  final icons = [CatchIcons.date, CatchIcons.people, CatchIcons.receipt];
  final titles = ['Arrival', 'Group rhythm', 'Cancellation'];
  final bodies = [
    'Host check-in starts ten minutes before the run.',
    'Regroup points keep the route social without stopping the flow.',
    'Free cancellation until 24 hours before start time.',
  ];

  return WidgetbookScrollCatalogFrame(
    title: 'HairlineList',
    catalogId: 'event_detail.design.hairline_list',
    children: [
      WidgetbookPageStateCard(
        label: 'field rows',
        child: HairlineList(
          itemCount: titles.length,
          itemBuilder: (context, index) => CatchField.read(
            copy: catchFieldCopy(context.l10n),
            icon: icons[index],
            iconColor: activity.deep,
            title: titles[index],
            body: bodies[index],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Fact list states',
  type: EventDetailFactList,
  path: '[Event Detail]/Design Primitives',
)
Widget eventDetailFactListStates(BuildContext context) {
  final informationState = eventDetailInformationStateFrom(
    event: widgetbookEvent,
    l10n: context.l10n,
  );

  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailFactList',
    catalogId: 'event_detail.design.fact_list',
    children: [
      WidgetbookPageStateCard(
        label: 'stacked mechanism facts',
        child: EventDetailFactList.stacked(
          rows: informationState.signUpRows,
          activityKind: informationState.activityKind,
        ),
      ),
      WidgetbookPageStateCard(
        label: 'inline supporting facts',
        child: EventDetailFactList.inline(
          rows: informationState.goodToKnowRows,
          activityKind: informationState.activityKind,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Good to know list states',
  type: EventDetailGoodToKnowList,
  path: '[Event Detail]/Design Primitives',
)
Widget eventDetailGoodToKnowListStates(BuildContext context) {
  final informationState = eventDetailInformationStateFrom(
    event: widgetbookEvent,
    l10n: context.l10n,
  );

  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailGoodToKnowList',
    catalogId: 'event_detail.design.good_to_know_list',
    children: [
      WidgetbookPageStateCard(
        label: 'validated inline facts',
        child: EventDetailGoodToKnowList(
          rows: informationState.goodToKnowRows,
          activityKind: informationState.activityKind,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Itinerary row states',
  type: ItineraryRow,
  path: '[Event Detail]/Design Primitives',
)
Widget eventDetailItineraryRowStates(BuildContext context) {
  final t = CatchTokens.of(context);
  final activity = ActivityPalette.resolve(context, ActivityKind.socialRun);
  final steps = const [
    ItineraryStep(
      time: '6:30 AM',
      title: 'Gather at Carter Road Jetty',
      detail: 'Quick hellos, host check-in, and the plan for the group.',
    ),
    ItineraryStep(
      time: '6:45 AM',
      title: 'Easy social run',
      detail: 'A conversational 5 km route with two regroup points.',
    ),
    ItineraryStep(
      time: '8:15 AM',
      title: 'Coffee finish',
      detail: 'Attendees can linger naturally; follow-up unlocks after.',
    ),
  ];

  return WidgetbookScrollCatalogFrame(
    title: 'ItineraryRow',
    catalogId: 'event_detail.design.itinerary_row',
    children: [
      WidgetbookPageStateCard(
        label: 'timeline rows',
        child: Column(
          children: [
            for (var index = 0; index < steps.length; index += 1)
              ItineraryRow(
                step: steps[index],
                isLast: index == steps.length - 1,
                accent: activity.accent,
                railColor: t.line2,
              ),
          ],
        ),
      ),
    ],
  );
}
