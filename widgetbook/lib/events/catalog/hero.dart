import 'package:catch_dating_app/contexts/events/parts/event_activity_visuals.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_hero_top_bar.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';

@widgetbook.UseCase(
  name: 'Photo hero states',
  type: EventPhotoHeroSurface,
  path: '[Event Detail]/Hero',
)
Widget eventDetailPhotoHeroSurfaceStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventPhotoHeroSurface',
    catalogId: 'event_detail.hero.photo_surface',
    children: [
      WidgetbookPageStateCard(
        label: 'standard route hero',
        child: ClipRRect(
          borderRadius: BorderRadius.circular(CatchRadius.lg),
          child: SizedBox(
            height: WidgetbookPreviewLayout.exploreMediaPreviewHeight,
            child: EventPhotoHeroSurface(event: widgetbookEvent),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Ticket hero states',
  type: EventDetailTicketHeroSurface,
  path: '[Event Detail]/Hero',
)
Widget eventDetailTicketHeroSurfaceStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailTicketHeroSurface',
    catalogId: 'event_detail.hero.ticket_hero_surface',
    children: [
      WidgetbookPageStateCard(
        label: 'ticket transition target',
        child: ClipRRect(
          borderRadius: BorderRadius.circular(CatchRadius.lg),
          child: SizedBox(
            height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
            child: EventDetailTicketHeroSurface(
              event: widgetbookEvent,
              presentationMode: EventDetailPresentationMode.ticket,
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'spotlight transition target',
        child: ClipRRect(
          borderRadius: BorderRadius.circular(CatchRadius.lg),
          child: SizedBox(
            height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
            child: EventDetailTicketHeroSurface(
              event: widgetbookEvent,
              presentationMode: EventDetailPresentationMode.spotlightDark,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Ticket surface states',
  type: EventDetailTicketSurface,
  path: '[Event Detail]/Hero',
)
Widget eventDetailTicketSurfaceStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'EventDetailTicketSurface',
    catalogId: 'event_detail.hero.ticket_surface',
    children: [
      WidgetbookPageStateCard(
        label: 'ticket and spotlight bodies',
        child: Wrap(
          spacing: CatchSpacing.s4,
          runSpacing: CatchSpacing.s4,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(CatchRadius.lg),
              child: SizedBox(
                width: WidgetbookPreviewLayout.eventDetailPreviewWidth,
                height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
                child: EventDetailTicketSurface(
                  event: widgetbookEvent,
                  presentationMode: EventDetailPresentationMode.ticket,
                ),
              ),
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(CatchRadius.lg),
              child: SizedBox(
                width: WidgetbookPreviewLayout.eventDetailPreviewWidth,
                height: WidgetbookPreviewLayout.profileSectionPreviewHeight,
                child: EventDetailTicketSurface(
                  event: widgetbookEvent,
                  presentationMode: EventDetailPresentationMode.spotlightDark,
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
  name: 'Activity badge states',
  type: HeroActivityBadge,
  path: '[Event Detail]/Hero',
)
Widget eventDetailHeroActivityBadgeStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'HeroActivityBadge',
    catalogId: 'event_detail.hero.activity_badge',
    children: [
      WidgetbookPageStateCard(
        label: 'activity badges',
        child: ColoredBox(
          color: CatchTokens.editorialBlack,
          child: Padding(
            padding: CatchInsets.content,
            child: Wrap(
              spacing: CatchSpacing.s3,
              runSpacing: CatchSpacing.s3,
              children: [
                HeroActivityBadge(
                  visual: eventActivityVisual(
                    ActivityKind.socialRun,
                    context: context,
                  ),
                ),
                HeroActivityBadge(
                  visual: eventActivityVisual(
                    ActivityKind.dinner,
                    context: context,
                  ),
                ),
                HeroActivityBadge(
                  visual: eventActivityVisual(
                    ActivityKind.pickleball,
                    context: context,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Time chip states',
  type: HeroTimeChip,
  path: '[Event Detail]/Hero',
)
Widget eventDetailHeroTimeChipStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'HeroTimeChip',
    catalogId: 'event_detail.hero.time_chip',
    children: [
      WidgetbookPageStateCard(
        label: 'time chips',
        child: ColoredBox(
          color: CatchTokens.editorialBlack,
          child: Padding(
            padding: CatchInsets.content,
            child: Wrap(
              spacing: CatchSpacing.s3,
              runSpacing: CatchSpacing.s3,
              children: [
                HeroTimeChip(event: widgetbookEvent),
                HeroTimeChip(
                  event: widgetbookEventDetailFixture(
                    id: 'widgetbook-event-detail-evening',
                    activityKind: ActivityKind.dinner,
                    startTime: DateTime(2026, 6, 24, 19, 30),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ],
  );
}
