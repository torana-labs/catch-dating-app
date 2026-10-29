import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/core/media/uploaded_photo.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/events/presentation/event_detail_information_state.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_dock.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_fact_list.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/catalog_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';
import '../../support/widgetbook_harness.dart';
import 'event_fixtures.dart';

List<UploadedPhoto> _eventDetailPhotos(int count) {
  return [
    for (var index = 0; index < count; index++)
      UploadedPhoto.fromUpload(
        url: 'https://example.invalid/catch-event-$index.jpg',
        storagePath: 'widgetbook/events/catch-event-$index.jpg',
        position: index,
        now: DateTime(2026, 6, 7, 8, index),
      ),
  ];
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: EventDetailHintList,
  path: '[Core catalog]/Event detail',
)
Widget eventDetailHintListCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'EventDetailHintList',
    catalogId: 'events.widgets.event_detail_hint_list',
    children: [
      WidgetbookCatalogStateCard(
        label: 'open event / approval event',
        child: WidgetbookContractWrap(
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            SizedBox(
              width: WidgetbookPreviewLayout.eventDetailPreviewWidth,
              child: EventDetailHintList(event: widgetbookCatalogEvent()),
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.eventDetailPreviewWidth,
              child: EventDetailHintList(
                event: widgetbookCatalogEvent(
                  id: 'approval-event',
                  eventPolicy: EventPolicyBundle.requestToJoinEvent(
                    capacityLimit: 10,
                    basePriceInPaise: 0,
                  ),
                  bookedCount: 8,
                ),
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: EventDetailItineraryList,
  path: '[Core catalog]/Event detail',
)
Widget eventDetailItineraryCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'EventDetailItineraryList',
    catalogId: 'events.widgets.event_detail_itinerary',
    children: [
      WidgetbookCatalogStateCard(
        label: 'run / dinner',
        child: WidgetbookContractWrap(
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            SizedBox(
              width: WidgetbookPreviewLayout.eventDetailPreviewWidth,
              child: EventDetailItineraryList(event: widgetbookCatalogEvent()),
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.eventDetailPreviewWidth,
              child: EventDetailItineraryList(
                event: widgetbookCatalogEvent(
                  id: 'dinner-itinerary',
                  activityKind: ActivityKind.dinner,
                  title: 'Dinner for six',
                  priceInPaise: 140000,
                ),
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: EventDetailPhotoGrid,
  path: '[Core catalog]/Event detail',
)
Widget eventDetailPhotoStripCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'EventDetailPhotoGrid',
    catalogId: 'events.widgets.event_detail_photo_strip',
    children: [
      WidgetbookCatalogStateCard(
        label: 'three photos / partial photos / empty hidden',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            EventDetailPhotoGrid(
              event: widgetbookCatalogEvent(eventPhotos: _eventDetailPhotos(3)),
            ),
            gapH16,
            EventDetailPhotoGrid(
              event: widgetbookCatalogEvent(
                id: 'partial-photo-strip',
                eventPhotos: _eventDetailPhotos(1),
              ),
            ),
            gapH16,
            EventDetailPhotoGrid(
              event: widgetbookCatalogEvent(id: 'empty-strip'),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: EventDetailMapCard,
  path: '[Core catalog]/Event detail',
)
Widget eventDetailMapCardCatalogStates(BuildContext context) {
  return WidgetbookCatalogFrame(
    title: 'EventDetailMapCard',
    catalogId: 'events.widgets.event_detail_map_card',
    children: [
      WidgetbookCatalogStateCard(
        label: 'pin ready / morning-of pin',
        child: WidgetbookContractWrap(
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            SizedBox(
              width: WidgetbookPreviewLayout.eventDetailPreviewWidth,
              child: EventDetailMapCard(
                event: widgetbookCatalogEvent(),
                onTap: widgetbookNoop,
              ),
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.eventDetailPreviewWidth,
              child: EventDetailMapCard(
                event: widgetbookCatalogEvent(
                  id: 'map-morning-of',
                  exactLocation: false,
                ),
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: EventDetailMechanismList,
  path: '[Core catalog]/Event detail',
)
Widget eventDetailMechanismListCatalogStates(BuildContext context) {
  Widget mechanismList(Event event) {
    final state = eventDetailInformationStateFrom(
      event: event,
      l10n: context.l10n,
    );
    return EventDetailMechanismList(
      rows: state.signUpRows,
      activityKind: state.activityKind,
    );
  }

  return WidgetbookCatalogFrame(
    title: 'EventDetailMechanismList',
    catalogId: 'events.widgets.event_detail_mechanism_list',
    children: [
      WidgetbookCatalogStateCard(
        label: 'open / approval / balanced',
        child: WidgetbookContractWrap(
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            SizedBox(
              width: WidgetbookPreviewLayout.eventDetailPreviewWidth,
              child: mechanismList(widgetbookCatalogEvent()),
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.eventDetailPreviewWidth,
              child: mechanismList(
                widgetbookCatalogEvent(
                  id: 'approval-mechanism',
                  eventPolicy: EventPolicyBundle.requestToJoinEvent(
                    capacityLimit: 10,
                    basePriceInPaise: 0,
                  ),
                ),
              ),
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.eventDetailPreviewWidth,
              child: mechanismList(
                widgetbookCatalogEvent(
                  id: 'balanced-mechanism',
                  activityKind: ActivityKind.dinner,
                  eventPolicy: EventPolicyBundle.balancedSinglesEvent(
                    capacityLimit: 12,
                    basePriceInPaise: 140000,
                  ),
                  priceInPaise: 140000,
                ),
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contact states',
  type: CatchPersonLayout,
  path: '[Core catalog]/Event detail',
)
Widget eventDetailHostCardCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookCatalogFrame(
    title: 'Person layout with independent Field actions',
    catalogId: 'catch.person_row',
    children: [
      WidgetbookCatalogStateCard(
        label: 'actions / identity / color overrides',
        child: WidgetbookContractWrap(
          crossAxisAlignment: WrapCrossAlignment.start,
          children: [
            SizedBox(
              width: WidgetbookPreviewLayout.mediaPanelWidth,
              child: CatchField.navigate(
                onActivate: widgetbookNoop,
                secondaryAction: CatchFieldSecondaryAction.command(
                  label: 'Message host',
                  icon: CatchIcons.chat,
                  onActivate: widgetbookNoop,
                ),
                content: CatchPersonLayout(
                  avatarColors: ActivityPalette.resolve(
                    context,
                    ActivityKind.socialRun,
                  ).avatarColors,
                  name: 'Sunday sea-face crew',
                  supportingText: 'HOSTING SINCE FEB 2026 - BANDRA',
                ),
              ),
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.mediaPanelWidth,
              child: CatchField.read(
                content: CatchPersonLayout(
                  avatarColors: ActivityPalette.resolve(
                    context,
                    ActivityKind.dinner,
                  ).avatarColors,
                  name: 'Catch supper club',
                  supportingText: 'HOSTING SINCE MAR 2026',
                ),
              ),
            ),
            SizedBox(
              width: WidgetbookPreviewLayout.mediaPanelWidth,
              child: CatchSurface(
                backgroundColor: t.primary,
                child: CatchField.navigate(
                  onActivate: widgetbookNoop,
                  content: CatchPersonLayout(
                    avatarColors: ActivityPalette.resolve(
                      context,
                      ActivityKind.pickleball,
                    ).avatarColors,
                    name: 'Courtside social',
                    supportingText: 'HOSTING SINCE JAN 2026 - REPLIES FAST',
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Catalog states',
  type: EventBookingDock,
  path: '[Core catalog]/Event detail',
)
Widget eventDetailBookingDockCatalogStates(BuildContext context) {
  final t = CatchTokens.of(context);
  return WidgetbookCatalogFrame(
    title: 'EventBookingDock states',
    catalogId: 'events.widgets.event_detail_booking_dock',
    children: [
      WidgetbookCatalogStateCard(
        label: 'bookable / booked / waitlist / attended',
        description:
            'Production booking dock with fixed bookable, booked, waitlist and attended inputs.',
        child: Column(
          children: [
            EventBookingDock(
              label: 'Join event - 3 spots left',
              onPressed: widgetbookNoop,
              leadingContent: const EventPriceText(
                price: 'Free',
                note: '3 spots left',
                warn: true,
              ),
              buttonAccentColor: t.primary,
              catchLine: 'Matching opens for everyone who goes',
              catchLineAccent: t.primary,
            ),
            gapH12,
            EventBookingDock(
              label: 'Cancel booking',
              onPressed: widgetbookNoop,
              leadingContent: EventDockStatusText(
                icon: CatchIcons.success,
                label: "You're in!",
              ),
            ),
            gapH12,
            EventBookingDock(label: 'Join waitlist', onPressed: widgetbookNoop),
            gapH12,
            EventBookingDock(
              label: 'You attended this event',
              onPressed: null,
              leadingContent: EventDockStatusText(
                icon: CatchIcons.activity,
                label: 'Completed',
              ),
            ),
          ],
        ),
      ),
    ],
  );
}
