import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_hero_top_bar.dart';
import 'package:catch_dating_app/organizers/presentation/detail/widgets/organizer_photo_rail.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

final _logoOnlyHeroOrganizer = widgetbookOrganizerMinimalOrganizer.copyWith(
  id: 'widgetbook-logo-only-club',
  name: 'Bandra Dawn Club',
  logoPhoto: widgetbookOrganizerPhoto('club-logo-dawn', 0),
);

@widgetbook.UseCase(
  name: 'Photo strip states',
  type: OrganizerPhotoRail,
  path: '[Club Detail]/Sections',
)
Widget organizerPhotoStripStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerPhotoRail',
    catalogId: 'section.club.photos',
    children: [
      WidgetbookPageStateCard(
        label: 'three photos',
        child: OrganizerPhotoRail(organizer: widgetbookOrganizerOrganizer),
      ),
      WidgetbookPageStateCard(
        label: 'single photo',
        child: OrganizerPhotoRail(
          organizer: widgetbookOrganizerOrganizer.copyWith(
            organizerPhotos: [widgetbookOrganizerOrganizer.organizerPhotos.first],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Hero states',
  type: OrganizerHeroTopBar,
  path: '[Club Detail]/Sections',
)
Widget organizerHeroAppBarStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerHeroTopBar',
    catalogId: 'section.club.hero',
    children: [
      WidgetbookPageStateCard(
        label: 'photo polaroid',
        child: WidgetbookOrganizerSliverFrame(
          height: WidgetbookPreviewLayout.profileExpandedEditorHeight,
          slivers: [
            OrganizerHeroTopBar(
              organizer: widgetbookOrganizerOrganizer,
              isHost: false,
              onShareOrganizer: _ignoreShare,
            ),
            const SliverToBoxAdapter(
              child: SizedBox(height: WidgetbookPreviewLayout.mediaPanelHeight),
            ),
          ],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'logo masthead',
        child: WidgetbookOrganizerSliverFrame(
          height: WidgetbookPreviewLayout.organizerExpandedPreviewHeight,
          slivers: [
            OrganizerHeroTopBar(
              organizer: _logoOnlyHeroOrganizer,
              isHost: false,
              onShareOrganizer: _ignoreShare,
            ),
            const SliverToBoxAdapter(
              child: SizedBox(height: WidgetbookPreviewLayout.mediaPanelHeight),
            ),
          ],
        ),
      ),
      WidgetbookPageStateCard(
        label: 'art polaroid',
        child: WidgetbookOrganizerSliverFrame(
          height: WidgetbookPreviewLayout.profileExpandedEditorHeight,
          slivers: [
            OrganizerHeroTopBar(
              organizer: widgetbookOrganizerMinimalOrganizer,
              isHost: false,
              onShareOrganizer: _ignoreShare,
            ),
            const SliverToBoxAdapter(
              child: SizedBox(height: WidgetbookPreviewLayout.mediaPanelHeight),
            ),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Hero module states',
  type: OrganizerHeroHeader,
  path: '[Club Detail]/Sections',
)
Widget organizerHeroModuleStates(BuildContext context) {
  return WidgetbookScrollCatalogFrame(
    title: 'OrganizerHeroHeader',
    catalogId: 'section.club.hero.module',
    children: [
      WidgetbookPageStateCard(
        label: 'photo polaroid module',
        child: WidgetbookOrganizerDeviceFrame(
          height: WidgetbookPreviewLayout.tallRouteViewportHeight,
          child: OrganizerHeroHeader(
            organizer: widgetbookOrganizerOrganizer,
            variant: OrganizerHeroVariant.poster,
            mediaHeight: 280,
            captionExtent: CatchLayout.organizerDetailHeroCaptionExtent,
            kickerLabel: 'BANDRA · MUMBAI',
            locationLabel: 'Bandstand promenade',
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'logo masthead module',
        child: WidgetbookOrganizerDeviceFrame(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: OrganizerHeroHeader(
            organizer: _logoOnlyHeroOrganizer,
            variant: OrganizerHeroVariant.masthead,
            mediaHeight: 220,
            captionExtent: CatchLayout.organizerDetailHeroCaptionExtent,
            kickerLabel: 'DINNER · MUMBAI',
            locationLabel: 'Khar Social',
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'art polaroid module',
        child: WidgetbookOrganizerDeviceFrame(
          height: WidgetbookPreviewLayout.feedbackViewportHeight,
          child: OrganizerHeroHeader(
            organizer: widgetbookOrganizerMinimalOrganizer,
            variant: OrganizerHeroVariant.poster,
            mediaHeight: 220,
            captionExtent: CatchLayout.organizerDetailHeroCaptionExtent,
            kickerLabel: 'DINNER · MUMBAI',
            locationLabel: 'Khar Social',
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'full review module',
        child: WidgetbookOrganizerDeviceFrame(
          height: WidgetbookPreviewLayout.tallRouteViewportHeight,
          child: OrganizerHeroHeader(
            organizer: widgetbookOrganizerOrganizer,
            variant: OrganizerHeroVariant.full,
            mediaHeight: 280,
            captionExtent: CatchLayout.organizerDetailHeroCaptionExtent,
            kickerLabel: 'BANDRA · MUMBAI',
            locationLabel: 'Bandstand promenade',
          ),
        ),
      ),
    ],
  );
}

Future<void> _ignoreShare(BuildContext context, Organizer organizer) async {}
